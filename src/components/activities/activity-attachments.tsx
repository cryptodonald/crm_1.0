'use client';

import { useState, useCallback, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ActivityFormData } from '@/types/activities';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  FileText, 
  X, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ActivityAttachmentsProps {
  form: UseFormReturn<ActivityFormData>;
  activityId?: string; // Optional for new activities, required for existing ones
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10; // Limite di 10 allegati per attività
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
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

export function ActivityAttachments({ form, activityId }: ActivityAttachmentsProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([]);

  const { control, setValue, watch } = form;
  
  // Watch current attachments to sync with existing data (for edit mode)
  const currentAttachments = watch('allegati') || [];

  // Sincronizza uploadedAttachments con il form quando cambia
  useEffect(() => {
    // Save attachments as array for the form data (will be converted to JSON string in API)
    setValue('allegati', uploadedAttachments);
  }, [uploadedAttachments, setValue]);

  // Load existing attachments on mount (for edit mode)
  useEffect(() => {
    if (currentAttachments && uploadedAttachments.length === 0) {
      let parsedAttachments: any[] = [];
      
      // Handle both array and JSON string formats
      if (typeof currentAttachments === 'string') {
        try {
          parsedAttachments = JSON.parse(currentAttachments);
        } catch (e) {
          console.warn('⚠️ Failed to parse attachments as JSON:', e);
          parsedAttachments = [];
        }
      } else if (Array.isArray(currentAttachments)) {
        parsedAttachments = currentAttachments;
      }
      
      if (parsedAttachments.length > 0) {
        setUploadedAttachments(parsedAttachments);
        
        // Helper function to infer file type from extension
        const inferTypeFromFilename = (filename: string): string => {
          if (!filename) return 'application/octet-stream';
          const ext = filename.toLowerCase().split('.').pop();
          
          switch (ext) {
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'gif': return 'image/gif';
            case 'webp': return 'image/webp';
            case 'pdf': return 'application/pdf';
            case 'doc': return 'application/msword';
            case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'xls': return 'application/vnd.ms-excel';
            case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'txt': return 'text/plain';
            default: return 'application/octet-stream';
          }
        };
        
        // Create file objects for display (without actual file data for existing attachments)
        const existingFiles: FileWithPreview[] = parsedAttachments.map((attachment: any, index: number) => {
          // Try different field names for contentType (API saves as 'type', some might have 'contentType')
          const rawContentType = attachment.type || attachment.contentType;
          const filename = attachment.filename || attachment.name;
          
          // If no type or type is octet-stream, try to infer from filename
          const finalContentType = (rawContentType && rawContentType !== 'application/octet-stream') 
            ? rawContentType 
            : inferTypeFromFilename(filename);
          
          console.log(`📄 [ActivityAttachments] Loading existing attachment:`, {
            filename,
            originalType: attachment.type,
            originalContentType: attachment.contentType,
            rawContentType,
            finalContentType,
            attachmentId: attachment.id
          });
          
          return {
            name: filename,
            size: attachment.size || 0,
            type: finalContentType,
            id: attachment.id || `existing-${index}`,
            lastModified: Date.now(),
            webkitRelativePath: '',
            arrayBuffer: async () => new ArrayBuffer(0),
            slice: () => new Blob(),
            stream: () => new ReadableStream(),
            text: async () => '',
          } as FileWithPreview;
        });
        
        setFiles(existingFiles);
      }
    }
  }, [currentAttachments, uploadedAttachments.length]);

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
    formData.append('category', 'activities'); // Specifica la categoria per le attività
    
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
    const totalFiles = files.length + fileList.length;
    if (totalFiles > MAX_FILES) {
      setUploadErrors([`Massimo ${MAX_FILES} allegati consentiti. Attualmente hai ${files.length} allegati.`]);
      return;
    }

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
    setUploadedAttachments(prev => [...prev, ...uploadedFiles]);
    
    setUploading(false);
  }, [files.length]);

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

  const removeFile = async (fileId: string) => {
    // Find the attachment to remove
    const attachmentToRemove = uploadedAttachments.find(attachment => 
      attachment.id === fileId ||
      (attachment.filename && attachment.filename.includes(fileId)) ||
      (attachment.name && attachment.name.includes(fileId))
    );
    
    if (!attachmentToRemove) {
      console.warn('⚠️ Attachment not found for file ID:', fileId);
      return;
    }
    
    // Remove from UI immediately for better user experience
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke object URL for removed files
      const removed = prev.find(f => f.id === fileId);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
    
    setUploadedAttachments(prev => {
      const updated = prev.filter(attachment => {
        const shouldRemove = attachment.id === fileId ||
                            (attachment.filename && attachment.filename.includes(fileId)) ||
                            (attachment.name && attachment.name.includes(fileId));
        return !shouldRemove;
      });
      return updated;
    });
    
    // If this is an existing attachment (has a URL) and we have an activity ID, call the DELETE API
    if (attachmentToRemove.url && activityId) {
      try {
        const response = await fetch(`/api/activities/${activityId}/attachments?url=${encodeURIComponent(attachmentToRemove.url)}&attachmentId=${attachmentToRemove.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || 'Failed to delete attachment');
        }
        
        const result = await response.json();
        
        // Show success toast
        toast.success('Allegato eliminato', {
          description: result.blobDeleted 
            ? 'File rimosso da database e storage' 
            : 'File rimosso dal database'
        });
        
      } catch (error) {
        console.error('❌ Failed to delete attachment from server:', error);
        
        // Show error toast
        toast.error('Errore eliminazione allegato', {
          description: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
        
        // Ripristina stato in caso di errore
        const fileToRestore = {
          ...attachmentToRemove,
          id: fileId,
          name: attachmentToRemove.filename || attachmentToRemove.name,
          size: attachmentToRemove.size || 0,
          type: attachmentToRemove.type || 'application/octet-stream',
          lastModified: Date.now(),
          webkitRelativePath: '',
          arrayBuffer: async () => new ArrayBuffer(0),
          slice: () => new Blob(),
          stream: () => new ReadableStream(),
          text: async () => '',
        } as FileWithPreview;
        
        setFiles(prev => [...prev, fileToRestore]);
        setUploadedAttachments(prev => [...prev, attachmentToRemove]);
      }
    }
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

  const canAddMore = files.length < MAX_FILES;

  return (
    <div className="space-y-4">
      <FormLabel>Allegati</FormLabel>
      
      <div className="space-y-4">
        {/* Drag & Drop Area - Solo se possiamo aggiungere più file */}
        {canAddMore && (
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
              className="h-8 text-xs"
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
        )}

        {/* File List - mostra sempre quando ci sono file */}
        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              Allegati ({files.length}/{MAX_FILES})
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


      {/* Max Files Reached Message */}
      {!canAddMore && (
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Limite massimo di {MAX_FILES} allegati raggiunto. Rimuovi un allegato per aggiungerne di nuovi.
          </div>
        </Card>
      )}
    </div>
  );
}
