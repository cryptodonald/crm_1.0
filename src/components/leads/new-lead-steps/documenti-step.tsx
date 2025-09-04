'use client';

import { useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LeadFormData, LEAD_VALIDATION_RULES } from '@/types/leads';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  FileText, 
  X, 
  Download,
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentiStepProps {
  form: UseFormReturn<LeadFormData>;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export function DocumentiStep({ form }: DocumentiStepProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([]);

  const { control, setValue } = form;

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File troppo grande (max 10MB)`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Tipo file non supportato`;
    }
    
    return null;
  };

  const uploadFileToBlob = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const result = await response.json();
    return result.attachment;
  };

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: FileWithPreview[] = [];
    const errors: string[] = [];
    
    // First validate all files
    Array.from(fileList).forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        return;
      }
      
      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id: `${Date.now()}-${index}`,
      });
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      
      newFiles.push(fileWithPreview);
    });
    
    if (errors.length > 0) {
      setUploadErrors(errors);
      return;
    }
    
    // Start upload process
    setUploading(true);
    setUploadErrors([]);
    
    const uploadedFiles: any[] = [];
    const uploadErrors: string[] = [];
    
    for (const file of newFiles) {
      try {
        console.log(`📄 Uploading ${file.name}...`);
        const attachment = await uploadFileToBlob(file);
        uploadedFiles.push(attachment);
        console.log(`✅ Uploaded ${file.name} successfully`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
        uploadErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
      }
    }
    
    if (uploadErrors.length > 0) {
      setUploadErrors(uploadErrors);
    }
    
    // Update files with only successfully uploaded ones
    const successfulFiles = newFiles.filter((file, index) => 
      index < uploadedFiles.length
    );
    
    setFiles(prev => [...prev, ...successfulFiles]);
    setUploadedAttachments(prev => {
      const updated = [...prev, ...uploadedFiles];
      setValue('Allegati', updated);
      return updated;
    });
    
    setUploading(false);
  }, [setValue]);

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
    // Reset input per permettere di selezionare di nuovo lo stesso file
    e.target.value = '';
  }, [processFiles]);

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke object URL for removed files
      const removed = prev.find(f => f.id === fileId);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
    
    // Also remove from uploaded attachments
    setUploadedAttachments(prev => {
      const updated = prev.filter(attachment => 
        attachment.id !== fileId && 
        !attachment.filename.includes(fileId)
      );
      setValue('Allegati', updated);
      return updated;
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (type === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (type.includes('word') || type.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (type.includes('excel') || type.includes('sheet')) {
      return <FileText className="h-5 w-5 text-green-500" />;
    }
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Documenti e Allegati</h3>
        <p className="text-sm text-muted-foreground">
          Aggiungi note e documenti relativi al lead (opzionale).
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4 space-y-6">
        {/* Note - Campo spostato dal step 2 */}
        <FormField
          control={form.control}
          name="Note"
          rules={{
            maxLength: {
              value: LEAD_VALIDATION_RULES.Note.maxLength,
              message: "Note troppo lunghe",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Note aggiuntive sul lead..."
                  className="min-h-[80px] resize-none"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessageSubtle />
            </FormItem>
          )}
        />
        

        {/* Drag & Drop Area - Compatto */}
        <div className="space-y-2">
          <FormLabel>Allegati</FormLabel>
          <Card 
            className={cn(
              "relative border-2 border-dashed p-4 transition-colors",
              dragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
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
            
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <div className="p-2 bg-muted rounded-full">
                {uploading ? (
                  <div className="animate-spin">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="space-y-1">
                <h4 className="text-sm font-medium">
                  {uploading ? 'Caricamento in corso...' : 'Trascina file o clicca per selezionare'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  PDF, immagini, documenti • Max 10MB
                </p>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1 h-3 w-3" />
                    Scegli File
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <Card className="p-4 border-destructive">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-destructive">
                Errori durante il caricamento:
              </h4>
              <ul className="text-sm text-destructive space-y-1">
                {uploadErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadErrors([])}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            File selezionati ({files.length})
          </h4>
          
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-start gap-3">
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {file.type.split('/')[1]?.toUpperCase() || 'File'}
                          </Badge>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
