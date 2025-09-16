/**
 * Interfacce TypeScript per Sistema Orders
 * Aggiornate con campi RECORD_ID() formula
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export interface AirtableRecord<T = any> {
  id: string;
  createdTime: string;
  fields: T;
}

// ============================================================================
// PRODUCTS & VARIANTS
// ============================================================================

export interface Product {
  id: string;
  Nome_Prodotto: string; // Primary field
  Codice_Prodotto: string;
  Descrizione?: string;
  Categoria?: string;
  Prezzo_Base: number;
  Costo_Base: number;
  IVA_Percentuale: number;
  Dimensioni?: string;
  Peso?: number;
  Materiale?: string;
  Garanzia_Mesi?: number;
  Tempi_Consegna_Giorni?: number;
  Note_Interne?: string;
  Attivo: boolean;
  Data_Creazione: string;
  Ultima_Modifica: string;
  
  // Blob URL fields
  URL_Immagine_Principale?: string;
  URL_Immagini_Galleria?: string; // JSON array
  URL_Scheda_Tecnica?: string;
  URL_Certificazioni?: string; // JSON array
  URL_Video_Prodotto?: string;
}

export interface ProductVariant {
  id: string;
  Nome_Variante: string; // Primary field
  ID_Prodotto: string[];
  Tipo_Variante: 'Dimensione' | 'Taglia' | 'Topper' | 'Cover' | 'Accessorio';
  Codice_Variante: string;
  Prezzo_Aggiuntivo_Attuale: number;
  Costo_Aggiuntivo_Attuale: number;
  Posizione: 'Sinistra' | 'Destra' | 'Entrambi' | 'Nessuna';
  Obbligatorio: boolean;
  Attivo: boolean;
}

export interface ProductPriceHistory {
  id: string;
  ID_Storico: string; // Primary field - RECORD_ID() formula
  ID_Prodotto: string[];
  ID_Variante?: string[];
  Prezzo_Vendita: number;
  Prezzo_Costo: number;
  Data_Validita_Da: string;
  Data_Validita_A?: string;
  Tipo_Prezzo: 'Base' | 'Promo' | 'Scontato' | 'Speciale';
  Motivo_Cambio: 'Aggiornamento_Listino' | 'Promozione' | 'Correzione_Errore' | 'Cambio_Fornitore' | 'Inflazione';
  Creato_Da: string;
  Note?: string;
  Attivo: boolean;
}

// ============================================================================
// ORDERS & ORDER ITEMS
// ============================================================================

export interface Order {
  id: string;
  ID_Ordine: string; // Primary field - RECORD_ID() formula
  Numero_Ordine: string; // Business code (ORD-2024-001)
  ID_Lead: string[];
  ID_Venditore: string[];
  Data_Ordine: string;
  Data_Consegna_Richiesta?: string;
  Stato_Ordine: 'Bozza' | 'Confermato' | 'In_Produzione' | 'Spedito' | 'Consegnato' | 'Annullato';
  Stato_Pagamento: 'Non_Pagato' | 'Pagamento_Parziale' | 'Pagato' | 'Rimborsato';
  Modalita_Pagamento: 'Contanti' | 'Bonifico' | 'Carta_Credito' | 'Finanziamento' | 'Assegno' | 'PayPal';
  
  // Totali
  Totale_Lordo: number;
  Totale_Sconto: number;
  Totale_Netto: number;
  Totale_IVA: number;
  Totale_Finale: number;
  Percentuale_Sconto: number;
  
  // Commissioni
  Percentuale_Commissione: number;
  Importo_Commissione: number;
  
  // Dettagli
  Indirizzo_Consegna?: string;
  Note_Cliente?: string;
  Note_Interne?: string;
  Codice_Tracking?: string;
  
  // Finanziamento
  Finanziamento_Richiesto: boolean;
  Rata_Mensile?: number;
  Numero_Rate?: number;
  Tasso_Interesse?: number;
  Stato_Finanziamento: 'Non_Richiesto' | 'In_Valutazione' | 'Approvato' | 'Rifiutato';
  
  // Timestamps
  Data_Creazione: string;
  Ultima_Modifica: string;
  
  // Blob URL fields
  URL_Contratto?: string;
  URL_Documenti_Cliente?: string; // JSON array
  URL_Preventivo?: string;
  URL_Documenti_Spedizione?: string; // JSON array
  URL_Foto_Consegna?: string; // JSON array
}

export interface OrderItem {
  id: string;
  ID_Riga: string; // Primary field - RECORD_ID() formula
  ID_Ordine: string[];
  ID_Prodotto: string[];
  Configurazione_Varianti?: string[]; // Link to ProductVariant
  
  // Quantità e prezzi
  Quantita: number;
  Prezzo_Unitario: number;
  Costo_Unitario: number;
  Sconto_Percentuale: number;
  Sconto_Importo: number;
  Prezzo_Finale_Unitario: number;
  Totale_Riga: number;
  
  // Configurazione
  Configurazione_JSON?: string; // JSON config data
  Note_Configurazione?: string;
  Codice_Prodotto_Configurato?: string;
  Nome_Prodotto_Personalizzato?: string;
  Dimensioni_Finali?: string;
  Peso_Stimato?: number;
  
  // Produzione
  Stato_Produzione: 'Da_Ordinare' | 'In_Lavorazione' | 'Pronto' | 'Spedito';
  Data_Consegna_Prevista?: string;
  Giorni_Lavorazione?: number;
  Priorita: 'Bassa' | 'Media' | 'Alta' | 'Urgente';
  
  // Blob URL fields
  URL_Rendering_3D?: string;
  URL_Configurazione_Visual?: string;
  URL_Schemi_Misure?: string; // JSON array
  URL_Anteprima_Prodotto?: string;
}

// ============================================================================
// PAYMENTS & COMMISSIONS
// ============================================================================

export interface CommissionPayment {
  id: string;
  ID_Commissione: string; // Primary field - RECORD_ID() formula
  ID_Ordine: string[];
  ID_Venditore: string[];
  
  // Importi
  Importo_Vendita: number;
  Percentuale_Commissione: number;
  Importo_Commissione: number;
  
  // Date
  Data_Maturazione: string;
  Data_Pagamento?: string;
  
  // Stati e modalità
  Stato_Pagamento: 'Da_Pagare' | 'Pagato' | 'Sospeso' | 'Annullato';
  Modalita_Pagamento: 'Bonifico' | 'Contanti' | 'Assegno' | 'Trattenuta';
  
  // Dettagli pagamento
  Numero_Bonifico?: string;
  IBAN_Destinazione?: string;
  Note_Pagamento?: string;
  Riferimento_Contabile?: string;
  
  // Competenza
  Trimestre_Competenza?: string;
  Anno_Competenza?: number;
  Data_Creazione: string;
  
  // Blob URL fields
  URL_Ricevuta_Commissione?: string;
  URL_Documento_Pagamento?: string;
}

export interface PaymentTransaction {
  id: string;
  ID_Transazione: string; // Primary field - RECORD_ID() formula
  ID_Ordine: string[];
  
  // Transazione
  Importo: number;
  Data_Transazione: string;
  Tipo_Transazione: 'Acconto' | 'Saldo' | 'Pagamento_Completo' | 'Rimborso' | 'Storno';
  Modalita_Pagamento: 'Contanti' | 'Bonifico' | 'Carta_Credito' | 'Carta_Debito' | 'PayPal' | 'Assegno' | 'Finanziamento';
  Stato_Transazione: 'Pending' | 'Completata' | 'Fallita' | 'Annullata' | 'Rimborsata';
  
  // Riferimenti esterni
  Riferimento_Esterno?: string;
  ID_Transazione_Gateway?: string;
  Codice_Autorizzazione?: string;
  Numero_Ricevuta?: string;
  IBAN_Mittente?: string;
  Nome_Titolare?: string;
  
  // Commissioni e cambi
  Commissioni_Gateway?: number;
  Tasso_Cambio?: number;
  Valuta_Originale?: string;
  Importo_Originale?: number;
  
  // Note e verifica
  Note_Transazione?: string;
  Data_Accredito?: string;
  Verificata: boolean;
  Riconciliata: boolean;
  Log_Errori?: string;
  
  // Blob URL fields
  URL_Ricevuta?: string;
  URL_Screenshot_Gateway?: string;
  URL_Documento_Rimborso?: string;
  URL_Bonifico_Prova?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type OrderStatus = Order['Stato_Ordine'];
export type PaymentStatus = Order['Stato_Pagamento'];
export type TransactionStatus = PaymentTransaction['Stato_Transazione'];
export type CommissionStatus = CommissionPayment['Stato_Pagamento'];

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface OrdersListResponse {
  records: AirtableRecord<Order>[];
  offset?: string;
}

export interface OrderItemsListResponse {
  records: AirtableRecord<OrderItem>[];
  offset?: string;
}

export interface ProductsListResponse {
  records: AirtableRecord<Product>[];
  offset?: string;
}

// ============================================================================
// FORM TYPES FOR FRONTEND
// ============================================================================

export interface CreateOrderForm {
  ID_Lead: string;
  ID_Venditore: string;
  Numero_Ordine: string;
  Data_Consegna_Richiesta?: string;
  Indirizzo_Consegna?: string;
  Note_Cliente?: string;
  Finanziamento_Richiesto?: boolean;
}

export interface CreateOrderItemForm {
  ID_Ordine: string;
  ID_Prodotto: string;
  Configurazione_Varianti?: string[];
  Quantita: number;
  Note_Configurazione?: string;
}

export interface UpdateOrderStatusForm {
  Stato_Ordine: OrderStatus;
  Note_Interne?: string;
  Codice_Tracking?: string;
}

// ============================================================================
// SEARCH & FILTER TYPES
// ============================================================================

export interface OrderFilters {
  stato_ordine?: OrderStatus[];
  stato_pagamento?: PaymentStatus[];
  venditore_id?: string;
  data_da?: string;
  data_a?: string;
  importo_min?: number;
  importo_max?: number;
}

export interface ProductFilters {
  categoria?: string;
  attivo?: boolean;
  prezzo_min?: number;
  prezzo_max?: number;
}

export { };