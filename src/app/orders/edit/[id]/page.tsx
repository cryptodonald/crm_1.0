'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { invalidateOrderCache } from '@/app/orders/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { ArrowLeft, ArrowRight, Save, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Importa gli step (riusiamo quelli del nuovo ordine)
import { CustomerStep } from '@/components/orders/new-order-steps/customer-step';
import { ProductsStep } from '@/components/orders/new-order-steps/products-step';
import { SummaryStep } from '@/components/orders/new-order-steps/summary-step';
import { OrderFormData } from '../../../new/page';

// Schema validazione (stesso della creazione)
const orderFormSchema = z.object({
  customer_ids: z.array(z.string()).min(1, 'Seleziona almeno un cliente'),
  delivery_date: z.string().optional(),
  delivery_address: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    product_name: z.string(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    discount_percentage: z.number().min(0).max(100).optional(),
    discount_amount: z.number().min(0).optional(),
    total: z.number().min(0),
  })).min(1, 'Aggiungi almeno un prodotto'),
  abbuono: z.number().optional(),
  seller_id: z.string().optional(),
  customer_notes: z.string().optional(),
  internal_notes: z.string().optional(),
  order_date: z.string().optional(),
  order_status: z.string().optional(),
  payment_status: z.string().optional(),
  payment_method: z.string().optional(),
  attachments: z.object({
    contracts: z.array(z.any()).optional(),
    customer_documents: z.array(z.any()).optional(),
    customer_sheets: z.array(z.any()).optional(),
  }).optional(),
});

const STEPS = [
  { id: 1, name: 'Cliente', component: CustomerStep },
  { id: 2, name: 'Prodotti', component: ProductsStep },
  { id: 3, name: 'Riepilogo', component: SummaryStep },
];

// Helper per parsare allegati esistenti dai campi Airtable
const parseExistingAttachments = (orderFields: any) => {
  const attachments = {
    contracts: [] as Array<{ filename: string; url: string; isExisting: boolean }>,
    customer_documents: [] as Array<{ filename: string; url: string; isExisting: boolean }>,
    customer_sheets: [] as Array<{ filename: string; url: string; isExisting: boolean }>
  };
  
  // Parse contratti - ora sono campi Attachment nativi di Airtable
  if (orderFields.URL_Contratto) {
    if (Array.isArray(orderFields.URL_Contratto)) {
      // Attachment array nativo di Airtable
      attachments.contracts = orderFields.URL_Contratto.map(item => ({
        filename: item.filename || 'Contratto.pdf',
        url: item.url,
        isExisting: true
      }));
    } else if (typeof orderFields.URL_Contratto === 'object' && orderFields.URL_Contratto.url) {
      // Singolo attachment object
      attachments.contracts = [{
        filename: orderFields.URL_Contratto.filename || 'Contratto.pdf',
        url: orderFields.URL_Contratto.url,
        isExisting: true
      }];
    } else {
      // Legacy: stringa URL (per backward compatibility)
      try {
        const parsed = JSON.parse(orderFields.URL_Contratto);
        if (Array.isArray(parsed)) {
          attachments.contracts = parsed.map(item => ({ ...item, isExisting: true }));
        } else {
          attachments.contracts = [{ 
            filename: 'Contratto.pdf', 
            url: orderFields.URL_Contratto, 
            isExisting: true 
          }];
        }
      } catch {
        attachments.contracts = [{ 
          filename: 'Contratto.pdf', 
          url: orderFields.URL_Contratto, 
          isExisting: true 
        }];
      }
    }
  }
  
  // Parse documenti cliente - ora sono campi Attachment nativi di Airtable
  if (orderFields.URL_Documenti_Cliente) {
    if (Array.isArray(orderFields.URL_Documenti_Cliente)) {
      // Attachment array nativo di Airtable
      attachments.customer_documents = orderFields.URL_Documenti_Cliente.map(item => ({
        filename: item.filename || 'Documento.pdf',
        url: item.url,
        isExisting: true
      }));
    } else if (typeof orderFields.URL_Documenti_Cliente === 'object' && orderFields.URL_Documenti_Cliente.url) {
      // Singolo attachment object
      attachments.customer_documents = [{
        filename: orderFields.URL_Documenti_Cliente.filename || 'Documento.pdf',
        url: orderFields.URL_Documenti_Cliente.url,
        isExisting: true
      }];
    } else if (typeof orderFields.URL_Documenti_Cliente === 'string') {
      // Legacy: formato multiline (nome: URL)
      const lines = orderFields.URL_Documenti_Cliente.split('\n').filter(Boolean);
      attachments.customer_documents = lines.map(line => {
        const parts = line.split(': ');
        return {
          filename: parts[0] || 'Documento.pdf',
          url: parts[1] || line,
          isExisting: true
        };
      });
    }
  }
  
  // Parse schede cliente - ora sono campi Attachment nativi di Airtable
  if (orderFields.URL_Schede_Cliente) {
    if (Array.isArray(orderFields.URL_Schede_Cliente)) {
      // Attachment array nativo di Airtable
      attachments.customer_sheets = orderFields.URL_Schede_Cliente.map(item => ({
        filename: item.filename || 'Scheda.pdf',
        url: item.url,
        isExisting: true
      }));
    } else if (typeof orderFields.URL_Schede_Cliente === 'object' && orderFields.URL_Schede_Cliente.url) {
      // Singolo attachment object
      attachments.customer_sheets = [{
        filename: orderFields.URL_Schede_Cliente.filename || 'Scheda.pdf',
        url: orderFields.URL_Schede_Cliente.url,
        isExisting: true
      }];
    } else {
      // Legacy: stringa URL o JSON (per backward compatibility)
      try {
        const parsed = JSON.parse(orderFields.URL_Schede_Cliente);
        if (Array.isArray(parsed)) {
          attachments.customer_sheets = parsed.map(item => ({ ...item, isExisting: true }));
        } else {
          attachments.customer_sheets = [{ 
            filename: 'Scheda.pdf', 
            url: orderFields.URL_Schede_Cliente, 
            isExisting: true 
          }];
        }
      } catch {
        attachments.customer_sheets = [{ 
          filename: 'Scheda.pdf', 
          url: orderFields.URL_Schede_Cliente, 
          isExisting: true 
        }];
      }
    }
  }
  
  return attachments;
};

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<{
    contracts: Array<{ filename: string; url: string; isExisting: boolean }>;
    customer_documents: Array<{ filename: string; url: string; isExisting: boolean }>;
    customer_sheets: Array<{ filename: string; url: string; isExisting: boolean }>;
  }>({ contracts: [], customer_documents: [], customer_sheets: [] });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    mode: 'onChange',
  });

  const { handleSubmit, reset, trigger, getValues } = form;
  
  const currentStepIndex = currentStep - 1;
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  const CurrentStepComponent = STEPS[currentStepIndex].component;

  // Carica i dati dell'ordine esistente
  useEffect(() => {
    const loadOrderData = async () => {
      try {
        setIsLoading(true);
        
        // Carica i dati dell'ordine
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          throw new Error('Ordine non trovato');
        }
        
        const order = await response.json();
        console.log('📋 Loaded order data:', order);
        setOrderData(order);
        
        // I dati sono in order.fields, non direttamente in order
        const orderFields = order.fields || {};
        const orderItems = order.orderItems || [];
        
        console.log('📦 Order items received:', orderItems);
        console.log('📎 Existing attachments:', {
          contratto: orderFields.URL_Contratto,
          documenti: orderFields.URL_Documenti_Cliente,
          schede: orderFields.URL_Schede_Cliente
        });
        
        // Parse allegati esistenti
        const existingFiles = parseExistingAttachments(orderFields);
        console.log('📎 Parsed existing attachments:', existingFiles);
        setExistingAttachments(existingFiles);
        
        // Trasforma order items nel formato del form
        const formItems = orderItems.map((item: any) => {
          const itemFields = item.fields || {};
          
          return {
            product_id: (itemFields.ID_Prodotto && itemFields.ID_Prodotto[0]) || '',
            product_name: itemFields.Nome_Prodotto_Personalizzato || '',
            quantity: itemFields.Quantita || 1,
            unit_price: itemFields.Prezzo_Unitario || 0,
            discount_percentage: itemFields.Sconto_Percentuale || 0,
            discount_amount: itemFields.Sconto_Importo || 0,
            total: itemFields.Totale_Riga || 0,
          };
        });
        
        console.log('📦 Transformed form items:', formItems);
        
        // Calcola abbuono: differenza tra totale lordo e finale se presente
        const totaleFinale = orderFields.Totale_Finale || 0;
        const totaleLordo = orderFields.Totale_Lordo || 0;
        const abbuonoCalcolato = totaleFinale < totaleLordo ? (totaleLordo - totaleFinale) : 0;
        
        // Helper per pulire valori JSON stringificati doppiamente
        const sanitizeJsonString = (value: any): string => {
          if (typeof value !== 'string') return value || '';
          // Se il valore è wrappato in virgolette JSON extra: "\"Completato\"" -> "Completato"
          let cleaned = value.trim();
          if (cleaned.startsWith('\"') && cleaned.endsWith('\"')) {
            cleaned = cleaned.slice(1, -1);
          }
          return cleaned;
        };
        
        // Trasforma i dati dell'ordine nel formato del form
        const formData: OrderFormData = {
          customer_ids: orderFields.ID_Lead || [],
          delivery_date: orderFields.Data_Consegna_Richiesta || '',
          delivery_address: orderFields.Indirizzo_Consegna || '',
          items: formItems, // Usa i dati trasformati
          abbuono: abbuonoCalcolato,
          seller_id: (orderFields.ID_Venditore && orderFields.ID_Venditore[0]) || '',
          customer_notes: orderFields.Note_Cliente || '',
          internal_notes: orderFields.Note_Interne || '',
          order_date: orderFields.Data_Ordine || '',
          order_status: sanitizeJsonString(orderFields.Stato_Ordine) || 'Bozza',
          payment_status: orderFields.Stato_Pagamento || 'Non Pagato',
          payment_method: orderFields.Modalita_Pagamento || '',
          attachments: {
            contracts: [],
            customer_documents: [],
            customer_sheets: []
          }
        };
        
        console.log('📝 Form data to populate:', formData);
        
        // Carica gli order items se esistono
        // TODO: Implementare caricamento order items quando l'API sarà pronta
        // Per ora lasciamo items vuoto
        
        // Riempi il form con i dati caricati
        console.log('🔄 Resetting form with data:', formData);
        reset(formData);
        
        // Verifica che il reset sia andato a buon fine
        setTimeout(() => {
          const currentValues = getValues();
          console.log('📝 Current form values after reset:', currentValues);
        }, 100);
        
      } catch (error) {
        console.error('Errore caricamento ordine:', error);
        toast.error('Errore nel caricamento dell\'ordine', {
          description: error instanceof Error ? error.message : 'Errore sconosciuto'
        });
        router.push('/orders'); // Torna alla lista ordini
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      loadOrderData();
    }
  }, [orderId, reset, router]);

  const goToNextStep = async () => {
    let isStepValid = true;
    
    if (currentStep === 1) {
      isStepValid = await trigger(['customer_ids']);
      const customerIds = form.getValues('customer_ids');
      if (!customerIds || customerIds.length === 0) {
        isStepValid = false;
        toast.error('Seleziona almeno un cliente per l\'ordine');
      }
    } else if (currentStep === 2) {
      isStepValid = await trigger(['items']);
      const items = form.getValues('items');
      if (!items || items.length === 0) {
        isStepValid = false;
        toast.error('Aggiungi almeno un prodotto all\'ordine');
      }
    }
    
    if (isStepValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else if (!isStepValid) {
      toast.error('Campi non validi', {
        description: 'Controlla i campi evidenziati e correggi gli errori.',
      });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    try {
      console.log('🔄 Modifica ordine:', { orderId, data });
      
      // Calcola totali
      const totaleFinale = data.items.reduce((sum, item) => sum + (item.total || 0), 0);
      
      // Helper per pulire valori JSON stringificati doppiamente
      const sanitizeValue = (value: any): any => {
        if (typeof value !== 'string') return value;
        let cleaned = value.trim();
        if (cleaned.startsWith('\"') && cleaned.endsWith('\"')) {
          cleaned = cleaned.slice(1, -1);
        }
        return cleaned;
      };
      
      // Prepara i dati per l'API Airtable - aggiornamento ordine
      const updateData = {
        // Campi base - NOMI CORRETTI DA AIRTABLE SCHEMA
        'ID_Lead': data.customer_ids || [],
        'Data_Ordine': data.order_date || orderData.fields?.Data_Ordine,
        'Stato_Ordine': sanitizeValue(data.order_status) || 'Bozza',
        'ID_Venditore': data.seller_id ? [data.seller_id] : undefined,
        
        // Dati consegna
        'Data_Consegna_Richiesta': data.delivery_date || undefined,
        'Indirizzo_Consegna': data.delivery_address || undefined,
        
        // Note
        'Note_Cliente': data.customer_notes || undefined,
        'Note_Interne': data.internal_notes || undefined,
        
        // Calcoli totali
        'Totale_Finale': totaleFinale,
        'Totale_Lordo': totaleFinale,
        'Totale_Netto': totaleFinale,
        'Totale_Sconto': 0,
        'Totale_IVA': 0,
        
        // Stati
        'Stato_Pagamento': data.payment_status || 'Non Pagato',
        'Modalita_Pagamento': data.payment_method || undefined,
        
        // Timestamp
        'Ultima_Modifica': new Date().toISOString(),
      };
      
      // Gestione allegati (simile alla creazione)
      let attachmentUrls: any = {};
      console.log('📦 [Edit] Processing attachments:', data.attachments);
      
      if (data.attachments) {
        for (const [category, files] of Object.entries(data.attachments)) {
          console.log(`📦 [Edit] Category '${category}':`, files);
          
          if (files && files.length > 0) {
            console.log(`🚀 [Edit] Uploading ${files.length} files for category '${category}'`);
            
            const uploadPromises = files.map(async (file: File) => {
              console.log(`📤 [Edit] Uploading file:`, file.name, file.size, 'bytes');
              
              const formData = new FormData();
              formData.append('file', file);
              formData.append('category', 'orders');
              
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ [Edit] Upload failed for ${file.name}:`, response.status, errorText);
                throw new Error(`Upload failed for ${file.name}: ${response.status}`);
              }
              
              const result = await response.json();
              console.log(`✅ [Edit] Upload successful for ${file.name}:`, result);
              
              return {
                url: result.attachment?.url || result.url,
                filename: file.name
              };
            });
            
            attachmentUrls[category] = await Promise.all(uploadPromises);
            console.log(`✅ [Edit] All uploads completed for '${category}':`, attachmentUrls[category]);
          } else {
            console.log(`ℹ️ [Edit] No files to upload for category '${category}'`);
          }
        }
      } else {
        console.log('ℹ️ [Edit] No attachments object found');
      }
      
      console.log('📦 [Edit] Final attachmentUrls object:', attachmentUrls);
      console.log('🔍 [Edit] attachmentUrls structure:');
      Object.keys(attachmentUrls).forEach(key => {
        console.log(`  ${key}:`, attachmentUrls[key]);
        if (attachmentUrls[key] && attachmentUrls[key].length > 0) {
          attachmentUrls[key].forEach((item: any, index: number) => {
            console.log(`    [${index}]:`, item);
          });
        }
      });
      
      // Combina allegati esistenti (non eliminati) con nuovi allegati
      const combinedAttachments = {
        contracts: [...(existingAttachments.contracts || []), ...(attachmentUrls.contracts || [])],
        customer_documents: [...(existingAttachments.customer_documents || []), ...(attachmentUrls.customer_documents || [])],
        customer_sheets: [...(existingAttachments.customer_sheets || []), ...(attachmentUrls.customer_sheets || [])]
      };
      
      console.log('🔄 Combined attachments (existing + new):', combinedAttachments);
      
      // Aggiungi allegati ai dati di aggiornamento
      if (Object.values(combinedAttachments).some(arr => arr.length > 0)) {
        console.log('📎 [Edit] Combined attachment URLs to save:', combinedAttachments);
        
        if (combinedAttachments.contracts && combinedAttachments.contracts.length > 0) {
          // Salva come JSON string per preservare URL blob + filename e supportare multiple allegati
          updateData['URL_Contratto'] = JSON.stringify(combinedAttachments.contracts);
          console.log('📎 [Edit] Setting URL_Contratto as JSON:', updateData['URL_Contratto']);
        } else {
          // Per campi attachment: non inviare il campo se vuoto (undefined rimuove il campo dalla richiesta)
          console.log('📎 [Edit] Removing URL_Contratto (no attachments)');
        }
        
        if (combinedAttachments.customer_documents && combinedAttachments.customer_documents.length > 0) {
          // Salva come JSON string per preservare URL blob + filename e supportare multiple allegati
          updateData['URL_Documenti_Cliente'] = JSON.stringify(combinedAttachments.customer_documents);
          console.log('📎 [Edit] Setting URL_Documenti_Cliente as JSON:', updateData['URL_Documenti_Cliente']);
        } else {
          // Per campi attachment: non inviare il campo se vuoto (undefined rimuove il campo dalla richiesta)
          console.log('📎 [Edit] Removing URL_Documenti_Cliente (no attachments)');
        }
        
        if (combinedAttachments.customer_sheets && combinedAttachments.customer_sheets.length > 0) {
          // Salva come JSON string per preservare URL blob + filename e supportare multiple allegati
          updateData['URL_Schede_Cliente'] = JSON.stringify(combinedAttachments.customer_sheets);
          console.log('📎 [Edit] Setting URL_Schede_Cliente as JSON:', updateData['URL_Schede_Cliente']);
        } else {
          // Per campi attachment: non inviare il campo se vuoto (undefined rimuove il campo dalla richiesta)
          console.log('📎 [Edit] Removing URL_Schede_Cliente (no attachments)');
        }
      } else {
        console.log('ℹ️ [Edit] No new attachments to save');
      }
      
      console.log('📦 [Edit] Final update data with URLs:', updateData);
      
      // Chiama API per aggiornare ordine
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderData: updateData,
          orderItemsData: data.items.map((item, index) => ({
            'ID_Prodotto': item.product_id ? [item.product_id] : undefined,
            'Quantita': item.quantity,
            'Prezzo_Unitario': item.unit_price,
            'Sconto_Percentuale': item.discount_percentage || 0,
            'Sconto_Importo': item.discount_amount || 0,
            'Totale_Riga': item.total,
            'Nome_Prodotto_Personalizzato': item.product_name || undefined,
            'Configurazione_JSON': JSON.stringify({
              product_id: item.product_id,
              product_name: item.product_name,
              originalData: item
            })
          }))
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Errore nell\'aggiornamento dell\'ordine');
      }
      
      const result = await response.json();
      console.log('✅ Ordine aggiornato:', result);
      
      toast.success('Ordine aggiornato con successo!', {
        description: `Ordine #${orderData.fields?.ID_Ordine || orderId} modificato.`,
      });
      
      // Invalida il cache per forzare refresh ottimistico
      console.log('🔄 [Edit] Invalidating cache for order:', orderId);
      await invalidateOrderCache(orderId);
      
      // Reindirizza alla pagina ordini
      router.push('/orders');
      
    } catch (error) {
      console.error('Errore aggiornamento ordine:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error('Errore nell\'aggiornamento dell\'ordine', {
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb 
            pageName="Modifica Ordine"
            items={[
              { label: 'Ordini', href: '/orders' },
              { label: 'Modifica Ordine' },
            ]}
          />
          
          <div className="px-4 lg:px-6 max-w-6xl mx-auto w-full">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-6 w-48" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb 
          pageName="Modifica Ordine"
          items={[
            { label: 'Ordini', href: '/orders' },
            { label: `Modifica #${orderData?.fields?.ID_Ordine || orderId}` },
          ]}
        />
        
        <div className="px-4 lg:px-6 max-w-6xl mx-auto w-full">
          {/* Header */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                  <span className="font-semibold">
                    Modifica Ordine #{orderData?.fields?.ID_Ordine || orderId}
                    {(() => {
                      const customerIds = form.watch('customer_ids') || [];
                      if (customerIds.length === 0) return '';
                      if (customerIds.length === 1) return ' (1 cliente)';
                      return ` (${customerIds.length} clienti)`;
                    })()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>Passo {currentStep} di {STEPS.length}</span>
                  {draftSaved && (
                    <span className="text-green-600 font-medium">
                      ✓ Modifiche salvate
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {STEPS.map((step, index) => (
                    <div
                      key={step.id}
                      className={`font-medium ${
                        index + 1 === currentStep
                          ? 'text-primary'
                          : index + 1 < currentStep
                          ? 'text-green-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.name}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Step Content */}
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {currentStep === 3 ? (
                    <CurrentStepComponent 
                      form={form} 
                      existingAttachments={existingAttachments}
                      onDeleteAttachment={async (category, index, url) => {
                        console.log('🗑️ Delete attachment:', { category, index, url });
                        
                        try {
                          // Prima rimuovi dal state locale per UI immediata
                          const attachmentToDelete = existingAttachments[category as keyof typeof existingAttachments][index];
                          setExistingAttachments(prev => {
                            const updated = { ...prev };
                            updated[category as keyof typeof prev] = updated[category as keyof typeof prev].filter((_, i) => i !== index);
                            return updated;
                          });
                          
                          // Usa l'endpoint dedicato per eliminazione allegati
                          const deleteResponse = await fetch(
                            `/api/orders/${orderId}/attachments?url=${encodeURIComponent(url)}&category=${category}&index=${index}`,
                            { method: 'DELETE' }
                          );
                          
                          if (!deleteResponse.ok) {
                            const errorData = await deleteResponse.json();
                            throw new Error(errorData.details || 'Failed to delete attachment');
                          }
                          
                          const result = await deleteResponse.json();
                          console.log('✅ [Delete] Attachment deleted successfully:', result);
                          console.log('🔍 [Delete] Debug info:', result.debugInfo);
                          console.log('🔍 [Delete] Blob delete reason:', result.blobDeleteReason);
                          
                          // Toast con informazioni dettagliate per tipo di allegato
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
                          
                          const description = getDescription();
                          
                          toast.success('Allegato eliminato', {
                            description
                          });
                          
                        } catch (error) {
                          console.error('❌ Error deleting attachment:', error);
                          const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
                          
                          toast.error('Errore nell\'eliminazione', {
                            description: errorMessage
                          });
                          
                          // Ripristina lo stato in caso di errore
                          setExistingAttachments(existingAttachments);
                        }
                      }}
                    />
                  ) : (
                    <CurrentStepComponent form={form} />
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro
            </Button>

            <div className="flex space-x-2">
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={goToNextStep}
                  disabled={isSubmitting}
                >
                  Avanti
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salva Modifiche
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}