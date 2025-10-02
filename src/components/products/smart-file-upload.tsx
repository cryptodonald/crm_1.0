'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FileImage, 
  FileCheck, 
  FileText, 
  Shield, 
  X,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileInfo } from '@/types/products';
import { Label } from '@/components/ui/label';

interface SmartFileUploadProps {
  uploadedFiles: {
    foto?: FileInfo[];
    schede?: FileInfo[];
    manuali?: FileInfo[];
    certificazioni?: FileInfo[];
  };
  onFilesChange: (files: {
    foto?: FileInfo[];
    schede?: FileInfo[];
    manuali?: FileInfo[];
    certificazioni?: FileInfo[];
  }) => void;
  uploading?: boolean;
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
  maxFileSize?: number;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function SmartFileUpload({
  uploadedFiles,
  onFilesChange,
  uploading = false,
  onUploadStart,
  onUploadComplete,
  maxFileSize = MAX_FILE_SIZE
}: SmartFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'foto' | 'schede' | 'manuali' | 'certificazioni'>('foto');
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `${file.name}: File troppo grande (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Tipo file non supportato`;
    }
    
    return null;
  };

  const uploadFileToBlob = async (file: File): Promise<FileInfo> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'products');
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const result = await response.json();
    return {
      url: result.attachment.url,
      filename: file.name,
      size: file.size,
      type: file.type
    };
  };

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const errors: string[] = [];
    const files = Array.from(fileList);
    
    // Validate all files first
    files.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      }
    });
    
    if (errors.length > 0) {
      setUploadErrors(errors);
      return;
    }
    
    onUploadStart?.();
    setUploadErrors([]);
    setUploadProgress(0);
    
    const newFiles = { ...uploadedFiles };
    const uploadPromises = files.map(async (file, index) => {
      try {
        const fileInfo = await uploadFileToBlob(file);
        
        // Usa la categoria selezionata invece dell'auto-categorizzazione
        if (!newFiles[selectedCategory]) {
          newFiles[selectedCategory] = [];
        }
        newFiles[selectedCategory]!.push(fileInfo);
        
        setUploadProgress(((index + 1) / files.length) * 100);
        return { success: true, category: selectedCategory, fileInfo };
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
        return { success: false, file: file.name };
      }
    });
    
    await Promise.all(uploadPromises);
    
    if (errors.length > 0) {
      setUploadErrors(errors);
    }
    
    onFilesChange(newFiles);
    onUploadComplete?.();
    setUploadProgress(0);
  }, [uploadedFiles, onFilesChange, onUploadStart, onUploadComplete, maxFileSize, selectedCategory]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
    e.target.value = '';
  }, [processFiles]);

  const removeFile = async (category: keyof typeof uploadedFiles, index: number) => {
    const newFiles = { ...uploadedFiles };
    if (newFiles[category] && newFiles[category]![index]) {
      const fileToRemove = newFiles[category]![index];
      const fileKey = `${category}-${index}-${fileToRemove.url}`;
      
      // Aggiungi il file al set dei file in cancellazione
      setDeletingFiles(prev => new Set(prev.add(fileKey)));
      
      try {
        // Cancella il file dal blob storage
        const deleteResponse = await fetch(`/api/upload?url=${encodeURIComponent(fileToRemove.url)}`, {
          method: 'DELETE',
        });
        
        if (!deleteResponse.ok) {
          console.warn('Failed to delete file from blob storage:', fileToRemove.filename);
          // Continua comunque con la rimozione dall'interfaccia
        } else {
          console.log('Successfully deleted file from blob storage:', fileToRemove.filename);
        }
      } catch (error) {
        console.warn('Error deleting file from blob storage:', error);
        // Continua comunque con la rimozione dall'interfaccia
      } finally {
        // Rimuovi il file dal set dei file in cancellazione
        setDeletingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileKey);
          return newSet;
        });
      }
      
      // Rimuovi il file dall'array locale
      newFiles[category]!.splice(index, 1);
      if (newFiles[category]!.length === 0) {
        delete newFiles[category];
      }
      
      onFilesChange(newFiles);
    }
  };

  const totalFiles = Object.values(uploadedFiles).flat().length;
  
  // Cleanup automatico dei file quando il componente viene smontato
  // Solo se non sono stati salvati (cioè se siamo ancora nella fase di editing)
  useEffect(() => {
    return () => {
      // Al dismount del componente, se ci sono file non salvati,
      // potremmo implementare una pulizia automatica
      // Per ora logghiamo solo per debug
      if (totalFiles > 0) {
        console.log('🧹 SmartFileUpload unmounting with', totalFiles, 'files still pending');
      }
    };
  }, [totalFiles]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'foto': return FileImage;
      case 'schede': return FileCheck;
      case 'manuali': return FileText;
      case 'certificazioni': return Shield;
      default: return FileText;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'foto': return 'Foto';
      case 'schede': return 'Schede Tecniche';
      case 'manuali': return 'Manuali';
      case 'certificazioni': return 'Certificazioni';
      default: return category;
    }
  };

  return (
    <div className="space-y-4">
        {/* Category Selector */}
        <div className="space-y-3">
          <Label htmlFor="file-category" className="text-sm font-medium">Categoria allegato</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="foto">
                <div className="flex items-center">
                  <FileImage className="mr-2 h-4 w-4" />
                  Foto Prodotto
                </div>
              </SelectItem>
              <SelectItem value="schede">
                <div className="flex items-center">
                  <FileCheck className="mr-2 h-4 w-4" />
                  Schede Tecniche
                </div>
              </SelectItem>
              <SelectItem value="manuali">
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Manuali
                </div>
              </SelectItem>
              <SelectItem value="certificazioni">
                <div className="flex items-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Certificazioni
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload Drop Zone */}
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg transition-all cursor-pointer",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50",
            uploading && "pointer-events-none opacity-60",
            "p-6"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            accept={ALLOWED_TYPES.join(',')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          <div className="text-center space-y-2">
            <Upload className={cn("h-8 w-8 mx-auto text-muted-foreground", uploading && "animate-pulse")} />
            <div>
              <p className="text-sm font-medium">
                {uploading ? 'Caricamento in corso...' : 'Trascina file qui o clicca'}
              </p>
              <p className="text-xs text-muted-foreground">
                Salva in: {getCategoryLabel(selectedCategory)} • Max {Math.round(maxFileSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
          
          {uploading && uploadProgress > 0 && (
            <Progress value={uploadProgress} className="mt-3 h-1" />
          )}
        </div>

        {/* Files caricati per categoria */}
        {Object.entries(uploadedFiles).map(([category, files]) => {
          if (!files || files.length === 0) return null;
          
          const Icon = getCategoryIcon(category);
          
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{getCategoryLabel(category)}</span>
                <Badge variant="secondary" className="text-xs">
                  {files.length}
                </Badge>
              </div>
              <div className="grid gap-2">
                {files.map((fileInfo, index) => {
                  const formatFileSize = (bytes: number) => {
                    if (bytes < 1024) return `${bytes} B`;
                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                  };
                  
                  const getFileTypeLabel = (type: string) => {
                    if (type.startsWith('image/')) return 'Immagine';
                    if (type === 'application/pdf') return 'PDF';
                    if (type.includes('word')) return 'Word';
                    if (type.includes('excel') || type.includes('sheet')) return 'Excel';
                    return 'Documento';
                  };

                  const fileKey = `${category}-${index}-${fileInfo.url}`;
                  const isDeleting = deletingFiles.has(fileKey);
                  
                  return (
                    <div key={index} className={cn(
                      "flex items-center justify-between p-3 bg-muted/30 rounded border",
                      isDeleting && "opacity-50 pointer-events-none"
                    )}>
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium truncate" title={fileInfo.filename}>
                              {fileInfo.filename}
                            </span>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {getFileTypeLabel(fileInfo.type)}
                            </Badge>
                            {isDeleting && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">
                                Cancellazione...
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(fileInfo.size)}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(category as keyof typeof uploadedFiles, index)}
                        className={cn(
                          "h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0 ml-2",
                          isDeleting && "animate-spin"
                        )}
                        disabled={isDeleting}
                        title={isDeleting ? "Cancellazione in corso..." : "Rimuovi file"}
                      >
                        {isDeleting ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Upload Errors */}
        {uploadErrors.length > 0 && (
          <Alert variant="destructive" className="text-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {uploadErrors.map((error, index) => (
                  <div key={index} className="text-xs">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* File Counter */}
        {totalFiles > 0 && (
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-muted-foreground">File caricati</span>
            <Badge variant="outline" className="text-xs">
              {totalFiles} file
            </Badge>
          </div>
        )}
    </div>
  );
}