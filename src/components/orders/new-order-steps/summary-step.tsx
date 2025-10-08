'use client';

import Link from 'next/link';
import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useLeadsData } from '@/hooks/use-leads-data';
import { useUsers } from '@/hooks/use-users';
import { AvatarLead } from '@/components/ui/avatar-lead';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Package, Calendar, MapPin, FileText, Upload, X, File, FileCheck, Shield, ExternalLink, Trash2 } from 'lucide-react';
import { OrderFormData } from '../new-order-modal';

interface SummaryStepProps {
  form: UseFormReturn<OrderFormData>;
  existingAttachments?: {
    contracts: Array<{ filename: string; url: string; isExisting: boolean }>;
    customer_documents: Array<{ filename: string; url: string; isExisting: boolean }>;
    customer_sheets: Array<{ filename: string; url: string; isExisting: boolean }>;
  };
  onDeleteAttachment?: (category: string, index: number, url: string) => void;
}

// Stati ordine disponibili
const ORDER_STATUSES = [
  { value: 'Bozza', label: 'Bozza', color: 'bg-gray-100 text-gray-800' },
  { value: 'Confermato', label: 'Confermato', color: 'bg-blue-100 text-blue-800' },
  { value: 'In_Produzione', label: 'In Produzione', color: 'bg-orange-100 text-orange-800' },
  { value: 'Spedito', label: 'Spedito', color: 'bg-purple-100 text-purple-800' },
  { value: 'Completato', label: 'Completato', color: 'bg-green-100 text-green-800' },
  { value: 'Annullato', label: 'Annullato', color: 'bg-red-100 text-red-800' },
];

export function SummaryStep({ form, existingAttachments, onDeleteAttachment }: SummaryStepProps) {
  const [attachmentFiles, setAttachmentFiles] = useState({
    contracts: [] as File[],
    customer_documents: [] as File[],
    customer_sheets: [] as File[],
  });
  
  const formData = form.watch();
  const items = formData.items || [];
  
  // Recupera dati clienti e utenti
  const { leads } = useLeadsData({ filters: {}, loadAll: true });
  const { users } = useUsers();
  
  const selectedCustomers = (formData.customer_ids || [])
    .map(id => leads.find(lead => lead.id === id))
    .filter(Boolean);
  
  const selectedSeller = formData.seller_id && users 
    ? Object.values(users).find(user => user.id === formData.seller_id)
    : null;
  
  const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const finalTotal = totalAmount; // Senza abbuono
  const itemsCount = items.length;
  
  // Gestione upload files
  const handleFileUpload = (type: keyof typeof attachmentFiles, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setAttachmentFiles(prev => ({
      ...prev,
      [type]: [...prev[type], ...newFiles]
    }));
    form.setValue(`attachments.${type}`, [...attachmentFiles[type], ...newFiles]);
  };
  
  const removeFile = (type: keyof typeof attachmentFiles, index: number) => {
    setAttachmentFiles(prev => {
      const updated = { ...prev };
      updated[type] = updated[type].filter((_, i) => i !== index);
      return updated;
    });
    form.setValue(`attachments.${type}`, attachmentFiles[type].filter((_, i) => i !== index));
  };
  
  // Funzione per ottenere l'icona appropriata per il tipo di file
  const getFileIcon = (filename: string, size = 'h-4 w-4') => {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'pdf':
        return <FileText className={`${size} text-red-600`} />;
      case 'doc':
      case 'docx':
        return <FileText className={`${size} text-blue-700`} />;
      case 'xls':
      case 'xlsx':
        return <FileText className={`${size} text-green-600`} />;
      case 'jpg':
      case 'jpeg':
        return <FileCheck className={`${size} text-orange-500`} />;
      case 'png':
        return <FileCheck className={`${size} text-blue-500`} />;
      case 'gif':
        return <FileCheck className={`${size} text-purple-500`} />;
      case 'webp':
        return <FileCheck className={`${size} text-green-500`} />;
      default:
        return <File className={`${size} text-gray-500`} />;
    }
  };
  
  // Funzione per formattare la dimensione del file
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Renderizza allegati per categoria (esistenti + nuovi) con stile migliorato
  const renderAttachmentsForCategory = (
    category: keyof typeof attachmentFiles,
    existingFiles: Array<{ filename: string; url: string; isExisting: boolean }> = []
  ) => {
    const totalFiles = existingFiles.length + attachmentFiles[category].length;
    
    if (totalFiles === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
            <Upload className="w-4 h-4" />
          </div>
          <p className="text-xs">Nessun allegato</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        {/* Allegati esistenti */}
        {existingFiles.map((attachment, index) => (
          <div key={`existing-${index}`} className="group border border-blue-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="p-3">
              <div className="flex items-center gap-3">
                {/* Icona e badge */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center border border-blue-200 dark:border-blue-600">
                    {getFileIcon(attachment.filename, 'h-5 w-5')}
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 border border-white dark:border-gray-800 flex items-center justify-center">
                    <FileCheck className="h-2 w-2 text-white" />
                  </div>
                </div>
                
                {/* Informazioni file */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={attachment.filename}>
                        {attachment.filename}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                          Esistente
                        </span>
                      </div>
                    </div>
                    
                    {/* Azioni */}
                    <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-blue-100 rounded-md transition-colors"
                        title="Apri allegato"
                      >
                        <ExternalLink className="h-3 w-3 text-blue-600" />
                      </a>
                      {onDeleteAttachment && (
                        <button
                          onClick={() => onDeleteAttachment(category, index, attachment.url)}
                          className="p-1.5 hover:bg-red-100 rounded-md transition-colors"
                          title="Elimina allegato"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Nuovi allegati */}
        {attachmentFiles[category].map((file, index) => (
          <div key={`new-${index}`} className="group border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 bg-white dark:bg-gray-900 dark:border-gray-700">
            <div className="p-3">
              <div className="flex items-center gap-3">
                {/* Icona e badge */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                    {getFileIcon(file.name, 'h-5 w-5')}
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-600 border border-white dark:border-gray-800 flex items-center justify-center">
                    <Upload className="h-2 w-2 text-white" />
                  </div>
                </div>
                
                {/* Informazioni file */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" title={file.name}>
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                          Nuovo
                        </span>
                      </div>
                    </div>
                    
                    {/* Azioni */}
                    <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeFile(category, index)}
                        className="p-1.5 hover:bg-red-100 rounded-md transition-colors"
                        title="Rimuovi file"
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Finalizzazione Ordine</h3>
        <p className="text-sm text-muted-foreground">
          Completa i dati dell'ordine e allega eventuali documenti prima di confermare.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4">
        {/* Dati Ordine */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <FormField
            control={form.control}
            name="order_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Ordine
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="order_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Stato Ordine
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
                            {status.label}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
          
          {/* Info Venditore */}
          {selectedSeller && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Venditore Assegnato
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <AvatarLead
                  nome={selectedSeller.nome}
                  customAvatar={selectedSeller.avatar}
                  isAdmin={selectedSeller.ruolo === 'Admin'}
                  size="sm"
                  showTooltip={false}
                />
                <div>
                  <div className="font-medium text-sm">{selectedSeller.nome}</div>
                  <div className="text-xs text-muted-foreground">{selectedSeller.ruolo}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Dati Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Clienti ({selectedCustomers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomers.length > 0 ? (
                <div className="space-y-3">
                  {selectedCustomers.map((customer) => (
                    <Link 
                      key={customer.id} 
                      href={`/leads/${customer.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer hover:border-border/80"
                    >
                      <AvatarLead
                        nome={customer.Nome}
                        customAvatar={customer.Avatar}
                        size="md"
                        showTooltip={false}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{customer.Nome}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {customer.Telefono || customer.Email || 'Nessun contatto'}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>Nessun cliente selezionato</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dettagli Consegna */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Consegna
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {formData.delivery_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formData.delivery_date}</span>
                </div>
              )}
              {formData.delivery_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{formData.delivery_address}</span>
                </div>
              )}
              {!formData.delivery_date && !formData.delivery_address && (
                <p className="text-sm text-muted-foreground">Nessun dettaglio specificato</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Prodotti */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Prodotti ({itemsCount})
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  €{finalTotal.toFixed(2)}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name || `Prodotto ${index + 1}`}</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Quantità: {item.quantity} × €{item.unit_price.toFixed(2)}</div>
                        {item.discount_percentage > 0 && (
                          <div className="text-green-600 text-xs">
                            Sconto: {item.discount_percentage}%
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{item.total.toFixed(2)}</p>
                      {item.discount_percentage > 0 && (
                        <p className="text-xs text-muted-foreground line-through">
                          €{(item.quantity * item.unit_price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between pt-2 border-t font-bold text-lg">
                    <span>Totale Finale:</span>
                    <span className="text-primary">€{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nessun prodotto nell'ordine</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allegati */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span>Documenti e Allegati</span>
                {(() => {
                  const totalAttachments = 
                    (existingAttachments?.contracts?.length || 0) + attachmentFiles.contracts.length +
                    (existingAttachments?.customer_documents?.length || 0) + attachmentFiles.customer_documents.length +
                    (existingAttachments?.customer_sheets?.length || 0) + attachmentFiles.customer_sheets.length;
                  
                  return totalAttachments > 0 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                      {totalAttachments}
                    </span>
                  ) : null;
                })()}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Contratti */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-sm">Contratti</span>
                    {(existingAttachments?.contracts?.length || 0) + attachmentFiles.contracts.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200">
                        {(existingAttachments?.contracts?.length || 0) + attachmentFiles.contracts.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload('contracts', e.target.files)}
                    className="hidden"
                    id="contracts-upload"
                  />
                  <label htmlFor="contracts-upload">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <div className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Carica Contratti
                      </div>
                    </Button>
                  </label>
                  {renderAttachmentsForCategory('contracts', existingAttachments?.contracts)}
                </div>
              </div>
              
              {/* Documenti Cliente */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Documenti Cliente</span>
                    {(existingAttachments?.customer_documents?.length || 0) + attachmentFiles.customer_documents.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                        {(existingAttachments?.customer_documents?.length || 0) + attachmentFiles.customer_documents.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    onChange={(e) => handleFileUpload('customer_documents', e.target.files)}
                    className="hidden"
                    id="customer-docs-upload"
                  />
                  <label htmlFor="customer-docs-upload">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <div className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Carica Documenti
                      </div>
                    </Button>
                  </label>
                  {renderAttachmentsForCategory('customer_documents', existingAttachments?.customer_documents)}
                </div>
              </div>
              
              {/* Schede Cliente */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Schede Cliente</span>
                    {(existingAttachments?.customer_sheets?.length || 0) + attachmentFiles.customer_sheets.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                        {(existingAttachments?.customer_sheets?.length || 0) + attachmentFiles.customer_sheets.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload('customer_sheets', e.target.files)}
                    className="hidden"
                    id="customer-sheets-upload"
                  />
                  <label htmlFor="customer-sheets-upload">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <div className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Carica Schede Cliente
                      </div>
                    </Button>
                  </label>
                  {renderAttachmentsForCategory('customer_sheets', existingAttachments?.customer_sheets)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <FormField
            control={form.control}
            name="customer_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Note Cliente
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Note visibili al cliente..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="internal_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Note Interne
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Note interne (non visibili al cliente)..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}