'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Paperclip, 
  Upload, 
  Trash2, 
  ExternalLink, 
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  File, 
  Eye,
  Download,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { LeadData, AirtableAttachment } from '@/types/leads';
import { cn } from '@/lib/utils';
import { useActivitiesClean } from '@/hooks/use-activities-clean';
import { ActivityData } from '@/types/activities';

interface FilesPanelProps {
  lead: LeadData;
  onUpdate?: () => void;
}

export function FilesPanel({ lead, onUpdate }: FilesPanelProps) {
  // Hook per ottenere le attività del lead e i loro allegati
  const { activities, loading: activitiesLoading, refresh: refreshActivities } = useActivitiesClean(lead.ID, {
    enableBackgroundSync: false,
    syncIntervalMs: 300000, // 5 minuti
    showToasts: false,
  });
  
  // Stato locale per aggiornamento ottimistico
  const [deletingAttachments, setDeletingAttachments] = useState<string[]>([]);
  
  // Raggruppa tutti gli allegati delle attività (esclusi quelli in eliminazione)
  const activityAttachments = activities
    .filter(activity => activity.Allegati && activity.Allegati.length > 0)
    .flatMap(activity => 
      activity.Allegati!
        .filter(attachment => !deletingAttachments.includes(attachment.url))
        .map(attachment => ({
          ...attachment,
          activityTitle: activity.Titolo,
          activityId: activity.id,
          activityDate: activity.Data,
        }))
    );
    
    
  
  const [attachments, setAttachments] = useState<AirtableAttachment[]>(() => {
    if (!lead.Allegati) {
      return [];
    }
    
    // Handle both JSON string and array formats
    if (typeof lead.Allegati === 'string') {
      try {
        return JSON.parse(lead.Allegati) as AirtableAttachment[];
      } catch (e) {
        console.warn('⚠️ Failed to parse lead attachments as JSON:', e);
        return [];
      }
    }
    
    // Handle array format (legacy)
    if (Array.isArray(lead.Allegati)) {
      return lead.Allegati as AirtableAttachment[];
    }
    
    return [];
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; attachment: AirtableAttachment | null }>(
    { open: false, attachment: null }
  );
  const fileInputId = `file-input-${lead.id}`;

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

  // Funzione per ottenere l'icona appropriata per il tipo di file
  const getFileIcon = (type?: string, size = 'h-4 w-4') => {
    if (!type) {
      return <File className={cn(size, 'text-gray-500')} />;
    }
    
    // Immagini - icona specifica per tipo
    if (type.startsWith('image/')) {
      if (type === 'image/jpeg' || type === 'image/jpg') {
        return <FileImage className={cn(size, 'text-orange-500')} />;
      }
      if (type === 'image/png') {
        return <FileImage className={cn(size, 'text-blue-500')} />;
      }
      if (type === 'image/gif') {
        return <FileImage className={cn(size, 'text-purple-500')} />;
      }
      if (type === 'image/webp') {
        return <FileImage className={cn(size, 'text-green-500')} />;
      }
      return <FileImage className={cn(size, 'text-blue-500')} />;
    }
    
    // PDF - icona documento rosso
    if (type === 'application/pdf') {
      return <FileText className={cn(size, 'text-red-600')} />;
    }
    
    // Excel/Spreadsheet - icona verde
    if (type.includes('spreadsheet') || type.includes('excel')) {
      return <FileSpreadsheet className={cn(size, 'text-green-600')} />;
    }
    
    // Word - icona blu scuro
    if (type.includes('word')) {
      return <FileText className={cn(size, 'text-blue-700')} />;
    }
    
    // Testo plain - icona grigia
    if (type === 'text/plain') {
      return <FileText className={cn(size, 'text-gray-600')} />;
    }
    
    // Default - icona generica
    return <File className={cn(size, 'text-gray-500')} />;
  };

  // Funzione per formattare la dimensione del file
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Funzione per verificare se il file è un'immagine
  const isImage = (type?: string) => type?.startsWith('image/') || false;

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const uploaded: any[] = [];
      for (const file of Array.from(files)) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error('Tipo di file non supportato', {
            description: `Il file "${file.name}" non è supportato. Tipi consentiti: Immagini, PDF, Documenti Office, Testo.`
          });
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error('File troppo grande', {
            description: `Il file "${file.name}" supera il limite di 10MB. Dimensione: ${formatFileSize(file.size)}.`
          });
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Upload failed for ${file.name}`);
        }
        const json = await res.json();
        console.log('📤 [FilesPanel] Upload response:', json.attachment);
        console.log('📁 [FilesPanel] Original file type:', file.type);
        
        // Assicuriamoci che l'attachment abbia tutte le proprietà necessarie
        const attachment = {
          ...json.attachment,
          type: json.attachment.type || file.type, // Fallback al tipo originale del file
          filename: json.attachment.filename || file.name,
          size: json.attachment.size || file.size,
        };
        console.log('✅ [FilesPanel] Processed attachment:', attachment);
        uploaded.push(attachment);
      }

      if (uploaded.length > 0) {
        // Aggiorna il lead con i nuovi allegati - ora salviamo come JSON
        console.log('📦 [FilesPanel] Uploaded attachments:', uploaded);
        const newAllegati = [...attachments, ...uploaded];
        
        // Salva come JSON string per preservare URL blob + filename
        const res2 = await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Allegati: JSON.stringify(newAllegati) }),
        });
        if (!res2.ok) {
          const err = await res2.json().catch(() => ({}));
          throw new Error(err.error || 'Aggiornamento lead fallito');
        }
        const updated = await res2.json();
        
        // Parse degli allegati dalla risposta dell'API (potrebbe essere JSON string)
        let apiAttachments: any[] = [];
        if (updated.lead?.Allegati) {
          if (typeof updated.lead.Allegati === 'string') {
            try {
              apiAttachments = JSON.parse(updated.lead.Allegati);
            } catch (e) {
              console.warn('⚠️ Failed to parse updated attachments as JSON:', e);
              apiAttachments = [];
            }
          } else if (Array.isArray(updated.lead.Allegati)) {
            apiAttachments = updated.lead.Allegati;
          }
        }
        
        // Aggiorna gli allegati preservando i tipi esistenti
        const updatedAttachments = apiAttachments.map((att: any) => {
          // Cerca di preservare il tipo esistente dallo stato locale
          const existingAttachment = attachments.find(existing => existing.id === att.id);
          
          // Fallback intelligente basato sull'estensione se il tipo manca
          const getTypeFromExtension = (filename: string): string | undefined => {
            if (!filename) return undefined;
            const ext = filename.toLowerCase().split('.').pop();
            switch (ext) {
              case 'png': return 'image/png';
              case 'jpg': case 'jpeg': return 'image/jpeg';
              case 'gif': return 'image/gif';
              case 'webp': return 'image/webp';
              case 'pdf': return 'application/pdf';
              case 'doc': case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              case 'xls': case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
              case 'txt': return 'text/plain';
              default: return undefined;
            }
          };
          
          const finalType = att.type || existingAttachment?.type || getTypeFromExtension(att.filename);
          
          console.log('🔄 [FilesPanel] Processing attachment:', {
            id: att.id,
            filename: att.filename,
            apiType: att.type,
            existingType: existingAttachment?.type,
            finalType: finalType,
            willShowBadge: !!finalType
          });
          
          if (!finalType) {
            console.warn('⚠️ [FilesPanel] No type for attachment:', att.filename);
          }
          
          return {
            ...att,
            type: finalType,
            filename: att.filename || 'File senza nome',
            size: att.size || 0,
          };
        });
        setAttachments(updatedAttachments as AirtableAttachment[]);
        toast.success(`${uploaded.length} file caricati con successo!`);
        
        // Callback per aggiornare la vista
        if (onUpdate) onUpdate();
      }
    } catch (e) {
      console.error('❌ Upload error:', e);
      setError(e instanceof Error ? e.message : 'Errore upload');
      toast.error('Errore durante l\'upload');
    } finally {
      setUploading(false);
      // Reset input
      const input = document.getElementById(fileInputId) as HTMLInputElement | null;
      if (input) input.value = '';
    }
  };

  const handleRemove = async () => {
    if (!deleteDialog.attachment) return;
    
    try {
      console.log('🗑️ [FilesPanel] Deleting attachment:', deleteDialog.attachment);
      
      // Prima rimuovi dal state locale per UI immediata
      const attachmentToDelete = deleteDialog.attachment;
      const remainingAttachments = attachments.filter(a => a.id !== attachmentToDelete.id);
      setAttachments(remainingAttachments);
      
      // Usa l'endpoint dedicato per eliminazione allegati
      const deleteResponse = await fetch(
        `/api/leads/${lead.id}/attachments?url=${encodeURIComponent(attachmentToDelete.url)}&attachmentId=${attachmentToDelete.id}`,
        { method: 'DELETE' }
      );
      
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.details || 'Failed to delete attachment');
      }
      
      const result = await deleteResponse.json();
      console.log('✅ [FilesPanel] Attachment deleted successfully:', result);
      console.log('🔍 [FilesPanel] Debug info:', result.debugInfo);
      console.log('🔍 [FilesPanel] Blob delete reason:', result.blobDeleteReason);
      
      // Toast con informazioni dettagliate
      const getDescription = () => {
        if (result.blobDeleted) {
          return 'Il file è stato rimosso completamente (database + storage Vercel).';
        }
        
        if (result.blobDeleteReason === 'airtable-managed') {
          return 'Il file è stato rimosso dal database. (File gestito da Airtable)';
        }
        
        if (result.blobDeleteReason?.startsWith('error:')) {
          return 'Il file è stato rimosso dal database. Problema storage: ' + result.blobDeleteReason;
        }
        
        return `Il file è stato rimosso dal database. Storage: ${result.blobDeleteReason || 'non eliminato'}.`;
      };
      
      toast.success('Allegato eliminato', {
        description: getDescription()
      });
      
      // Chiudi dialog
      setDeleteDialog({ open: false, attachment: null });
      
      // Callback per aggiornare la vista
      if (onUpdate) onUpdate();
      
    } catch (e) {
      console.error('❌ [FilesPanel] Remove attachment error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Errore sconosciuto';
      
      toast.error('Errore nell\'eliminazione', {
        description: errorMessage
      });
      
      // Ripristina lo stato in caso di errore
      setAttachments(attachments);
      setDeleteDialog({ open: false, attachment: null });
    }
  };

  const handleOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Download avviato!');
    } catch (e) {
      console.error('❌ Download error:', e);
      toast.error('Errore durante il download');
    }
  };
  
  // Funzioni specifiche per allegati delle attività (stessa logica robusta del Kanban)
  const handleActivityAttachmentOpen = (attachment: AirtableAttachment & { activityTitle: string }) => {
    console.log('📎 [FilesPanel] Opening activity attachment:', attachment.url);
    
    // Soluzione robusta per aprire allegati (stessa del Kanban)
    const newWindow = window.open(attachment.url, '_blank', 'noopener,noreferrer');
    
    if (!newWindow || newWindow.closed) {
      console.log('📎 [FilesPanel] Popup blocked, trying fallback...');
      
      const link = document.createElement('a');
      link.href = attachment.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      if (attachment.url.toLowerCase().includes('.pdf')) {
        const directWindow = window.open();
        if (directWindow) {
          directWindow.location.href = attachment.url;
          console.log('📎 [FilesPanel] PDF opened with direct method!');
        } else {
          link.download = attachment.filename || 'document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('📎 [FilesPanel] PDF downloaded as fallback!');
        }
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('📎 [FilesPanel] File opened with simulated click!');
      }
    } else {
      console.log('📎 [FilesPanel] SUCCESS - File opened in new tab!');
    }
    
    toast.success(`Aperto allegato da: ${attachment.activityTitle}`);
  };
  
  // Funzione per eliminare allegato dall'attività con aggiornamento UI ottimistico
  const handleActivityAttachmentDelete = async (attachment: AirtableAttachment & { activityTitle: string; activityId: string }) => {
    try {
      // 1. Aggiornamento UI ottimistico
      setDeletingAttachments(prev => [...prev, attachment.url]);
      
      // 2. Chiamata API
      const deleteResponse = await fetch(
        `/api/activities/${attachment.activityId}/attachments?url=${encodeURIComponent(attachment.url)}&attachmentId=${attachment.id}`,
        { method: 'DELETE' }
      );
      
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.details || 'Failed to delete attachment');
      }
      
      const result = await deleteResponse.json();
      
      // 3. Refresh dati dal server
      await refreshActivities();
      
      // 4. Toast di successo
      toast.success('Allegato eliminato', {
        description: `Rimosso da: ${attachment.activityTitle}`
      });
      
    } catch (error) {
      // 5. Ripristina stato in caso di errore
      setDeletingAttachments(prev => prev.filter(url => url !== attachment.url));
      
      console.error('❌ [FilesPanel] Error deleting activity attachment:', error);
      toast.error('Errore durante l\'eliminazione', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    } finally {
      // 6. Rimuovi dal loading state
      setTimeout(() => {
        setDeletingAttachments(prev => prev.filter(url => url !== attachment.url));
      }, 500); // Piccolo delay per smoothness
    }
  };

  return (
    <Card className="p-6">
      {/* Header con titolo e pulsante caricamento */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Allegati</h3>
          <div className="flex items-center gap-2">
            {attachments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Lead: {attachments.length}
              </Badge>
            )}
            {activityAttachments.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Attività: {activityAttachments.length}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            id={fileInputId}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button 
            size="sm" 
            disabled={uploading} 
            className="gap-2"
            onClick={() => document.getElementById(fileInputId)?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Caricamento...' : 'Carica file'}
          </Button>
        </div>
      </div>

      {/* Messaggio di errore */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Sezione Allegati Lead */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Allegati del Lead</h4>
          {attachments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {attachments.length}
            </Badge>
          )}
        </div>
        
        {attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed border-gray-200 rounded-xl dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Paperclip className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Nessun allegato</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Carica documenti, immagini o altri file per questo lead
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => document.getElementById(fileInputId)?.click()}
          >
            <Upload className="h-4 w-4" />
            Carica il primo file
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="group border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 bg-white dark:bg-gray-900 dark:border-gray-700 dark:hover:border-gray-600">
              <div className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icona e anteprima */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      {getFileIcon(attachment.type, 'h-6 w-6')}
                    </div>
                    
                    {/* Badge tipo file */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                      {getFileIcon(attachment.type, 'h-2.5 w-2.5')}
                    </div>
                  </div>
                  
                  {/* Informazioni file */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={attachment.filename}>
                          {attachment.filename}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {typeof attachment.size === 'number' && formatFileSize(attachment.size)}
                          </span>
                          {attachment.type && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
                              {attachment.type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Azioni */}
                      <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20"
                          onClick={() => handleOpen(attachment.url)}
                          title="Apri file"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/20"
                          onClick={() => handleDownload(attachment.url, attachment.filename)}
                          title="Scarica file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                          onClick={() => setDeleteDialog({ open: true, attachment })}
                          title="Elimina file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div> {/* Fine sezione Lead */}
      
      {/* Sezione Allegati Attività - Struttura identica agli ordini */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Allegati delle Attività</h4>
          {activityAttachments.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {activityAttachments.length}
            </Badge>
          )}
          {activitiesLoading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          )}
        </div>
        
        {/* Lista allegati con struttura identica agli ordini */}
        <div className="space-y-2">
          {activityAttachments.map((attachment, index) => {
            const isPdf = attachment.type === 'application/pdf' || attachment.filename?.toLowerCase().endsWith('.pdf');
            const isImage = attachment.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.filename || '');
            
            return (
              <div key={`activity-${attachment.activityId}-${attachment.id || index}`} className="group border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 bg-white dark:bg-gray-900 dark:border-gray-700 dark:hover:border-gray-600">
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    {/* File Icon */}
                    <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-600 flex-shrink-0">
                      {isPdf && <FileText className="h-5 w-5 text-red-500" />}
                      {isImage && <FileImage className="h-5 w-5 text-green-500" />}
                      {!isPdf && !isImage && <File className="h-5 w-5 text-gray-500" />}
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          {/* Filename - cliccabile per aprire */}
                          <button
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer text-left w-full"
                            title={attachment.filename}
                            onClick={() => handleActivityAttachmentOpen(attachment)}
                          >
                            {attachment.filename}
                          </button>
                          
                          {/* Activity name */}
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5" title={attachment.activityTitle}>
                            da: {attachment.activityTitle}
                          </p>
                          
                          {/* File metadata */}
                          <div className="flex items-center gap-2 mt-1">
                            {typeof attachment.size === 'number' && (
                              <Badge variant="outline" className="text-xs">
                                {formatFileSize(attachment.size)}
                              </Badge>
                            )}
                            {attachment.type && (
                              <Badge variant="outline" className="text-xs">
                                {attachment.type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions - identical to orders */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/20"
                            onClick={() => handleDownload(attachment.url, attachment.filename)}
                            title="Scarica allegato"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                            onClick={() => {
                              console.log('📎 [FilesPanel] Delete button clicked for:', attachment);
                              handleActivityAttachmentDelete(attachment);
                            }}
                            title="Elimina allegato"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Empty state */}
          {activityAttachments.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-8 border-2 border-dashed border-gray-200 rounded-lg dark:border-gray-700">
              <Paperclip className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1 text-sm">Nessun allegato nelle attività</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activitiesLoading ? 'Caricamento attività...' : 'Le attività di questo lead non hanno allegati'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Dialog di conferma eliminazione */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, attachment: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Conferma eliminazione
            </DialogTitle>
            <DialogDescription>
              {deleteDialog.attachment && (
                <>
                  Sei sicuro di voler eliminare il file{' '}
                  <strong className="font-medium text-gray-900 dark:text-gray-100">
                    "{deleteDialog.attachment.filename}"
                  </strong>?
                  <br />
                  <span className="text-red-600 dark:text-red-400 text-sm mt-1 block">
                    Questa azione non può essere annullata.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false, attachment: null })}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemove}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Elimina file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

