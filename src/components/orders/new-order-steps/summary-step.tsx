'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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
import { User, Package, Calendar, MapPin, FileText, Upload, X, File, FileCheck, Shield, ExternalLink, Trash2, CreditCard, Sparkles } from 'lucide-react';
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

// Mapping colori per gli stati - match colori Airtable
const STATUS_COLORS: Record<string, string> = {
  'Bozza': 'bg-gray-100 text-gray-800',           // Grigio - bozza
  'Confermato': 'bg-blue-100 text-blue-800',       // Blu - confermato
  'In Produzione': 'bg-yellow-100 text-yellow-800', // Giallo - in produzione
  'Spedito': 'bg-purple-100 text-purple-800',       // Viola - spedito
  'Consegnato': 'bg-green-100 text-green-800',      // Verde - consegnato/completato
  'Annullato': 'bg-red-100 text-red-800',           // Rosso - annullato
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  'Non Pagato': 'bg-orange-100 text-orange-800',    // Arancione - non pagato
  'Parziale': 'bg-yellow-100 text-yellow-800',      // Giallo - pagamento parziale
  'Pagato': 'bg-green-100 text-green-800',          // Verde - pagato
  'Rifiutato': 'bg-red-100 text-red-800',           // Rosso - rifiutato
  'Annullato': 'bg-gray-100 text-gray-800',         // Grigio - annullato
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  'Contanti': 'bg-emerald-100 text-emerald-800',    // Verde - contanti
  'Bonifico': 'bg-blue-100 text-blue-800',          // Blu - bonifico
  'Carta Credito': 'bg-purple-100 text-purple-800', // Viola - carta credito
  'Finanziamento': 'bg-amber-100 text-amber-800',   // Ambra - finanziamento
  'Assegno': 'bg-pink-100 text-pink-800',           // Rosa - assegno
  'PayPal': 'bg-cyan-100 text-cyan-800',            // Azzurro - PayPal
};

export function SummaryStep({ form, existingAttachments, onDeleteAttachment }: SummaryStepProps) {
  const [attachmentFiles, setAttachmentFiles] = useState({
    contracts: [] as File[],
    customer_documents: [] as File[],
    customer_sheets: [] as File[],
  });
  const [orderStatuses, setOrderStatuses] = useState<string[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(true);
  const [paymentStatuses, setPaymentStatuses] = useState<string[]>([]);
  const [paymentStatusesLoading, setPaymentStatusesLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  
  // Carica le opzioni di Stato_Ordine, Stato_Pagamento e Modalita_Pagamento da API
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        console.log('📋 [SummaryStep] Loading order statuses...');
        const response = await fetch('/api/orders/statuses');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ [SummaryStep] Statuses loaded:', data.statuses);
          setOrderStatuses(data.statuses);
        } else {
          console.error('❌ [SummaryStep] Failed to load statuses');
          setOrderStatuses([]);
        }
      } catch (error) {
        console.error('❌ [SummaryStep] Error loading statuses:', error);
        setOrderStatuses([]);
      } finally {
        setStatusesLoading(false);
      }
    };
    
    const loadPaymentStatuses = async () => {
      try {
        console.log('💳 [SummaryStep] Loading payment statuses...');
        const response = await fetch('/api/orders/payment-statuses');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ [SummaryStep] Payment statuses loaded:', data.paymentStatuses);
          setPaymentStatuses(data.paymentStatuses);
        } else {
          console.error('❌ [SummaryStep] Failed to load payment statuses');
          setPaymentStatuses([]);
        }
      } catch (error) {
        console.error('❌ [SummaryStep] Error loading payment statuses:', error);
        setPaymentStatuses([]);
      } finally {
        setPaymentStatusesLoading(false);
      }
    };
    
    const loadPaymentMethods = async () => {
      try {
        console.log('💳 [SummaryStep] Loading payment methods...');
        const response = await fetch('/api/orders/payment-methods');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ [SummaryStep] Payment methods loaded:', data.paymentMethods);
          setPaymentMethods(data.paymentMethods);
        } else {
          console.error('❌ [SummaryStep] Failed to load payment methods');
          setPaymentMethods([]);
        }
      } catch (error) {
        console.error('❌ [SummaryStep] Error loading payment methods:', error);
        setPaymentMethods([]);
      } finally {
        setPaymentMethodsLoading(false);
      }
    };
    
    loadStatuses();
    loadPaymentStatuses();
    loadPaymentMethods();
  }, []);
  
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
        {/* Header Info Section - Same width as cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <FormField
            control={form.control}
            name="order_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Ordine</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    pattern="\d{4}-\d{2}-\d{2}"
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
                <FormLabel>Stato Ordine</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusesLoading ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">Caricamento...</div>
                    ) : orderStatuses.length > 0 ? (
                      orderStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
                              {status.replace('_', ' ')}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">Nessuno</div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
          
          {/* Venditore */}
          {selectedSeller && (
            <FormItem>
              <FormLabel>Venditore</FormLabel>
              <div className="flex items-center gap-2 p-2 border rounded-md mt-2 h-10">
                <AvatarLead
                  nome={selectedSeller.nome}
                  customAvatar={selectedSeller.avatar}
                  isAdmin={selectedSeller.ruolo === 'Admin'}
                  size="sm"
                  showTooltip={false}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{selectedSeller.nome}</div>
                </div>
              </div>
            </FormItem>
          )}
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {/* Clienti */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                Clienti
                <span className="text-sm font-normal text-muted-foreground">{selectedCustomers.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomers.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomers.map((customer) => (
                    <Link 
                      key={customer.id} 
                      href={`/leads/${customer.id}`}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <AvatarLead
                        nome={customer.Nome}
                        customAvatar={customer.Avatar}
                        size="sm"
                        showTooltip={false}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="font-medium truncate">{customer.Nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {customer.Telefono || customer.Email || 'N/A'}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nessun cliente</p>
              )}
            </CardContent>
          </Card>

          {/* Consegna */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Consegna</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {formData.delivery_date && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Data</div>
                  <div className="font-medium">{formData.delivery_date}</div>
                </div>
              )}
              {formData.delivery_address && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Indirizzo</div>
                  <div className="font-medium">{formData.delivery_address}</div>
                </div>
              )}
              {!formData.delivery_date && !formData.delivery_address && (
                <p className="text-muted-foreground">Nessun dettaglio</p>
              )}
            </CardContent>
          </Card>
          
          {/* Pagamento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select Stato Pagamento */}
              <FormField
                control={form.control}
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Stato</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentStatusesLoading ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">Caricamento...</div>
                        ) : paymentStatuses.length > 0 ? (
                          paymentStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
                                  {status}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground text-center">Nessuno</div>
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Select Modalità Pagamento */}
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Modalità</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethodsLoading ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">Caricamento...</div>
                        ) : paymentMethods.length > 0 ? (
                          paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              <div className="flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_METHOD_COLORS[method] || 'bg-gray-100 text-gray-800'}`}>
                                  {method}
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground text-center">Nessuno</div>
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
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
                <div className="flex items-center justify-between gap-2">
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Note Cliente
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      // TODO: Implement AI rewrite functionality
                      console.log('🤖 Rewrite customer notes with AI');
                    }}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Riscrivi con AI
                  </Button>
                </div>
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
                <div className="flex items-center justify-between gap-2">
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Note Interne
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      // TODO: Implement AI rewrite functionality
                      console.log('🤖 Rewrite internal notes with AI');
                    }}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Riscrivi con AI
                  </Button>
                </div>
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