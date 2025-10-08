'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { ArrowLeft, ArrowRight, Save, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Importa gli step
import { CustomerStep } from '@/components/orders/new-order-steps/customer-step';
import { ProductsStep } from '@/components/orders/new-order-steps/products-step';
import { SummaryStep } from '@/components/orders/new-order-steps/summary-step';

// Schema validazione
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
  // Allegati
  attachments: z.object({
    contracts: z.array(z.any()).optional(),
    customer_documents: z.array(z.any()).optional(),
    customer_sheets: z.array(z.any()).optional(),
  }).optional(),
});

export interface OrderFormData {
  customer_ids: string[];
  delivery_date?: string;
  delivery_address?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    discount_amount?: number;
    total: number;
  }>;
  abbuono?: number;
  seller_id?: string;
  customer_notes?: string;
  internal_notes?: string;
  order_date?: string;
  order_status?: string;
  attachments?: {
    contracts?: File[];
    customer_documents?: File[];
    customer_sheets?: File[];
  };
}

const DEFAULT_ORDER_DATA: OrderFormData = {
  customer_ids: [],
  delivery_date: '',
  delivery_address: '',
  items: [],
  abbuono: 0,
  seller_id: '',
  customer_notes: '',
  internal_notes: '',
  order_date: '',
  order_status: 'Bozza',
  attachments: {
    contracts: [],
    customer_documents: [],
    customer_sheets: []
  }
};

const STEPS = [
  { id: 1, name: 'Cliente', component: CustomerStep },
  { id: 2, name: 'Prodotti', component: ProductsStep },
  { id: 3, name: 'Riepilogo', component: SummaryStep },
];

export default function NewOrderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: DEFAULT_ORDER_DATA,
    mode: 'onChange',
  });

  const { handleSubmit, formState: { isValid }, trigger } = form;
  
  const currentStepIndex = currentStep - 1;
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  const CurrentStepComponent = STEPS[currentStepIndex].component;

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
      console.log('🚀 Creazione ordine:', data);
      
      // Calcola totali
      const totaleFinale = data.items.reduce((sum, item) => sum + (item.total || 0), 0);
      
      // Prepara i dati per l'API Airtable - tabella Orders
      const orderData = {
        // Campi base - NOMI CORRETTI DA AIRTABLE SCHEMA
        'ID_Lead': data.customer_ids || [], // Campo corretto: ID_Lead (non ID_Cliente)
        'Data_Ordine': data.order_date || new Date().toISOString().split('T')[0],
        'Stato_Ordine': data.order_status || 'Bozza',
        'ID_Venditore': data.seller_id ? [data.seller_id] : undefined,
        
        // Dati consegna
        'Data_Consegna_Richiesta': data.delivery_date || undefined, // Campo corretto
        'Indirizzo_Consegna': data.delivery_address || undefined,
        
        // Note
        'Note_Cliente': data.customer_notes || undefined,
        'Note_Interne': data.internal_notes || undefined,
        
        // Calcoli totali
        'Totale_Finale': totaleFinale,
        'Totale_Lordo': totaleFinale, // Assumiamo per ora che lordo = finale
        'Totale_Netto': totaleFinale, // Senza IVA per ora
        'Totale_Sconto': 0, // Da calcolare dai singoli item
        'Totale_IVA': 0, // Da calcolare se necessario
        
        // Stati predefiniti
        'Stato_Pagamento': 'Non Pagato',
        'Modalita_Pagamento': undefined, // Da definire dall'utente
        
        // Timestamp
        'Data_Creazione': new Date().toISOString(),
        'Ultima_Modifica': new Date().toISOString(),
      };
      
      // Prima carica gli allegati (se presenti)
      let attachmentUrls: any = {};
      console.log('📦 [New] Processing attachments:', data.attachments);
      
      if (data.attachments) {
        for (const [category, files] of Object.entries(data.attachments)) {
          console.log(`📦 [New] Category '${category}':`, files);
          
          if (files && files.length > 0) {
            console.log(`🚀 [New] Uploading ${files.length} files for category '${category}'`);
            
            const uploadPromises = files.map(async (file: File) => {
              console.log(`📤 [New] Uploading file:`, file.name, file.size, 'bytes');
              
              const formData = new FormData();
              formData.append('file', file);
              formData.append('category', 'orders');
              
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ [New] Upload failed for ${file.name}:`, response.status, errorText);
                throw new Error(`Upload failed for ${file.name}: ${response.status}`);
              }
              
              const result = await response.json();
              console.log(`✅ [New] Upload successful for ${file.name}:`, result);
              
              return {
                url: result.attachment?.url || result.url,
                filename: file.name
              };
            });
            
            attachmentUrls[category] = await Promise.all(uploadPromises);
            console.log(`✅ [New] All uploads completed for '${category}':`, attachmentUrls[category]);
          } else {
            console.log(`ℹ️ [New] No files to upload for category '${category}'`);
          }
        }
      } else {
        console.log('ℹ️ [New] No attachments object found');
      }
      
      console.log('📦 [New] Final attachmentUrls object:', attachmentUrls);
      
      // Aggiungi allegati ai dati ordine usando i campi URL corretti
      if (Object.keys(attachmentUrls).length > 0) {
        console.log('📎 Attachment URLs to save:', attachmentUrls);
        
        // Salva come JSON per preservare URL blob + filename e supportare allegati multipli
        if (attachmentUrls.contracts && attachmentUrls.contracts.length > 0) {
          orderData['URL_Contratto'] = JSON.stringify(attachmentUrls.contracts);
          console.log('📎 Setting URL_Contratto as JSON:', orderData['URL_Contratto']);
        }
        if (attachmentUrls.customer_documents && attachmentUrls.customer_documents.length > 0) {
          orderData['URL_Documenti_Cliente'] = JSON.stringify(attachmentUrls.customer_documents);
          console.log('📎 Setting URL_Documenti_Cliente as JSON:', orderData['URL_Documenti_Cliente']);
        }
        if (attachmentUrls.customer_sheets && attachmentUrls.customer_sheets.length > 0) {
          orderData['URL_Schede_Cliente'] = JSON.stringify(attachmentUrls.customer_sheets);
          console.log('📎 Setting URL_Schede_Cliente as JSON:', orderData['URL_Schede_Cliente']);
        }
      } else {
        console.log('ℹ️ No attachments to save');
      }
      
      console.log('📦 Final order data with URLs:', orderData);
      
      // Prepara anche i dati per gli order items
      const orderItemsData = data.items.map((item, index) => ({
        // Non includiamo ID_Ordine qui, verrà aggiunto dopo la creazione dell'ordine
        'ID_Prodotto': item.product_id ? [item.product_id] : undefined,
        'Quantita': item.quantity,
        'Prezzo_Unitario': item.unit_price,
        'Sconto_Percentuale': item.discount_percentage || 0,
        'Sconto_Importo': item.discount_amount || 0,
        'Totale_Riga': item.total,
        'Nome_Prodotto_Personalizzato': item.product_name || undefined,
        // Configurazione JSON per salvare tutti i dettagli
        'Configurazione_JSON': JSON.stringify({
          product_id: item.product_id,
          product_name: item.product_name,
          originalData: item
        })
      }));
      
      // Chiama API per creare ordine (con gestione order items)
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderData,
          orderItemsData // Invia anche gli items
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Errore nella creazione dell\'ordine');
      }
      
      const result = await response.json();
      console.log('✅ Ordine e items creati:', result);
      
      toast.success('Ordine creato con successo!', {
        description: `Ordine con ${data.customer_ids.length} cliente${data.customer_ids.length > 1 ? 'i' : ''} creato.`,
      });
      
      // Reindirizza alla pagina ordini
      router.push('/orders');
      
    } catch (error) {
      console.error('Errore creazione ordine:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error('Errore nella creazione dell\'ordine', {
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb 
          pageName="Creazione Ordine"
          items={[
            { label: 'Ordini', href: '/orders' },
            { label: 'Nuovo Ordine' },
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
                    {(() => {
                      const customerIds = form.watch('customer_ids') || [];
                      if (customerIds.length === 0) return 'Nuovo Ordine';
                      if (customerIds.length === 1) return 'Ordine (1 cliente)';
                      return `Ordine (${customerIds.length} clienti)`;
                    })()} 
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>Passo {currentStep} di {STEPS.length}</span>
                  {draftSaved && (
                    <span className="text-green-600 font-medium">
                      ✓ Bozza salvata
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
                  <CurrentStepComponent form={form} />
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
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Creazione...' : 'Crea Ordine'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}