'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  File, 
  Image as ImageIcon, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  id: string;
  label: string;
  description?: string;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  currentUrl?: string;
  onUrlChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}

interface UploadedFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

export function FileUpload({
  id,
  label,
  description,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx'],
  maxSize = 10, // 10MB default
  currentUrl = '',
  onUrlChange,
  placeholder = "https://... o carica un file",
  className,
}: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [manualUrl, setManualUrl] = useState(currentUrl);

  // Get file type for icon
  const getFileIcon = (file: File | string) => {
    const fileName = typeof file === 'string' ? file : file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (typeof file !== 'string' && file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check size
    if (file.size > maxSize * 1024 * 1024) {
      return `Il file è troppo grande. Massimo ${maxSize}MB consentiti.`;
    }

    // Check type
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type);
      }
      if (type.includes('*')) {
        const [category] = type.split('/');
        return file.type.startsWith(category);
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `Tipo file non supportato. Formati consentiti: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  // Upload to Vercel Blob
  const uploadToBlob = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante l\'upload');
    }

    const result = await response.json();
    // L'API restituisce un oggetto attachment con l'url
    return result.attachment?.url || result.url || result.attachment;
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploadedFile({
      file,
      progress: 0,
      status: 'uploading',
    });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadedFile(prev => prev ? {
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 30, 90)
        } : null);
      }, 500);

      const url = await uploadToBlob(file);
      
      clearInterval(progressInterval);
      
      setUploadedFile({
        file,
        progress: 100,
        status: 'success',
        url,
      });

      onUrlChange(url);
      setManualUrl('');
      
      toast.success('File caricato con successo!');
    } catch (error) {
      setUploadedFile({
        file,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Errore sconosciuto',
      });
      
      toast.error('Errore durante l\'upload: ' + (error instanceof Error ? error.message : 'Errore sconosciuto'));
    }
  }, [maxSize, acceptedTypes, onUrlChange]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Handle manual URL input
  const handleUrlSubmit = () => {
    if (manualUrl.trim()) {
      onUrlChange(manualUrl.trim());
      setUploadedFile(null);
      toast.success('URL salvato!');
    }
  };

  // Remove file
  const handleRemove = () => {
    setUploadedFile(null);
    setManualUrl('');
    onUrlChange('');
  };

  // Get display URL (current or uploaded)
  const displayUrl = uploadedFile?.url || currentUrl || manualUrl;

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Manual URL Input */}
      <div className="space-y-2">
        <div className="flex space-x-2">
          <Input
            id={id}
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!manualUrl.trim()}
          >
            Salva URL
          </Button>
        </div>
        
        <div className="text-center text-xs text-muted-foreground">oppure</div>
      </div>

      {/* File Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer hover:bg-muted/50",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          uploadedFile?.status === 'success' ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "",
          uploadedFile?.status === 'error' ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = acceptedTypes.join(',');
          input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
          input.click();
        }}
      >
        <div className="flex flex-col items-center space-y-2">
          {uploadedFile ? (
            <>
              <div className="flex items-center space-x-2">
                {getFileIcon(uploadedFile.file)}
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {uploadedFile.file.name}
                </span>
                <Badge variant={
                  uploadedFile.status === 'success' ? 'default' :
                  uploadedFile.status === 'error' ? 'destructive' : 'secondary'
                }>
                  {uploadedFile.status === 'uploading' && 'Caricamento...'}
                  {uploadedFile.status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                  {uploadedFile.status === 'error' && <AlertCircle className="h-3 w-3" />}
                </Badge>
              </div>
              
              {uploadedFile.status === 'uploading' && (
                <div className="w-full max-w-xs">
                  <Progress value={uploadedFile.progress} className="h-2" />
                  <p className="text-xs text-center mt-1">{Math.round(uploadedFile.progress)}%</p>
                </div>
              )}
              
              {uploadedFile.status === 'error' && uploadedFile.error && (
                <Alert className="max-w-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {uploadedFile.error}
                  </AlertDescription>
                </Alert>
              )}
              
              {uploadedFile.status === 'success' && (
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (uploadedFile.url) {
                        window.open(uploadedFile.url, '_blank');
                      }
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Visualizza
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Trascina il file qui o clicca per selezionare
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formati: {acceptedTypes.join(', ')} • Max {maxSize}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Current URL Display */}
      {displayUrl && displayUrl !== manualUrl && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {getFileIcon(displayUrl)}
            <span className="text-xs font-mono truncate">{displayUrl}</span>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => window.open(displayUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}