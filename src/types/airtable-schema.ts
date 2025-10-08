/**
 * Auto-generated Airtable types
 * Generated on: 2025-10-06T10:01:50.480Z
 */

export interface AirtableBaseSchema {

  // Table: Lead
  Lead: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID'?: any;
    'Data'?: string;
    'Referenza'?: string[];
    'Nome referenza'?: any;
    'Provenienza'?: 'Meta' | 'Instagram' | 'Google' | 'Sito' | 'Referral' | 'Organico';
    'Nome'?: string;
    'Telefono'?: string;
    'Email'?: string;
    'Indirizzo'?: string;
    'CAP'?: number;
    'Città'?: string;
    'Esigenza'?: string;
    'Stato'?: 'Nuovo' | 'Attivo' | 'Qualificato' | 'Cliente' | 'Chiuso' | 'Sospeso';
    'Note'?: string;
    'Allegati'?: Array<{ id: string; url: string; filename: string; size: number; type: string }>;
    'Assegnatario'?: string[];
    'Ordini'?: string;
    'Attività'?: string[];
    'From field: Referenza'?: string[];
    'Conversations'?: string;
    'Order'?: string;
    'Orders'?: string[];
  };

  // Table: Activity
  Activity: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID'?: any;
    'ID Lead'?: string[];
    'Nome Lead'?: any;
    'Assegnatario'?: string[];
    'Nome Assegnatario'?: any;
    'Titolo'?: any;
    'Tipo'?: 'Chiamata' | 'WhatsApp' | 'Email' | 'SMS' | 'Consulenza' | 'Follow-up' | 'Altro';
    'Stato'?: 'Da Pianificare' | 'Pianificata' | 'In corso' | 'In attesa' | 'Completata' | 'Annullata' | 'Rimandata';
    'Data'?: string;
    'Durata stimata'?: any;
    'Obiettivo'?: 'Primo contatto' | 'Qualificazione lead' | 'Presentazione prodotto' | 'Invio preventivo' | 'Follow-up preventivo' | 'Negoziazione' | 'Chiusura ordine' | 'Fissare appuntamento' | 'Confermare appuntamento' | 'Promemoria appuntamento' | 'Consegna prodotto' | 'Assistenza tecnica' | 'Controllo soddisfazione' | 'Upsell Cross-sell' | 'Richiesta recensione';
    'Priorità'?: 'Bassa' | 'Media' | 'Alta' | 'Urgente';
    'Note'?: string;
    'Esito'?: 'Contatto riuscito' | 'Nessuna risposta' | 'Numero errato' | 'Non disponibile' | 'Non presentato' | 'Molto interessato' | 'Interessato' | 'Poco interessato' | 'Non interessato' | 'Informazioni raccolte' | 'Preventivo richiesto' | 'Preventivo inviato' | 'Appuntamento fissato' | 'Ordine confermato' | 'Opportunità persa' | 'Servizio completato' | 'Problema risolto' | 'Cliente soddisfatto' | 'Recensione ottenuta';
    'Prossima azione'?: 'Chiamata' | 'WhatsApp' | 'Email' | 'SMS' | 'Consulenza' | 'Follow-up' | 'Nessuna';
    'Data prossima azione'?: string;
    'Allegati'?: Array<{ id: string; url: string; filename: string; size: number; type: string }>;
    'Creato il '?: any;
    'Ultima modifica'?: any;
    'Order'?: string;
  };

  // Table: User
  User: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID'?: any;
    'Nome'?: string;
    'Email'?: string;
    'Attivo'?: boolean;
    'Ruolo'?: 'Admin' | 'Sales';
    'Telefono'?: string;
    'Activity'?: string[];
    'Lead'?: string[];
    'Automations'?: string[];
    'Password'?: string;
    'Avatar_URL'?: string;
    'Orders'?: string[];
    'Commission_Payments'?: string[];
  };

  // Table: Automations
  Automations: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID'?: any;
    'Name'?: string;
    'Description'?: string;
    'Category'?: 'Gestione Lead' | 'Gestione Activity' | 'Gestione Order' | 'Gestione Products' | 'Gestione User' | 'Sistema' | 'Report' | 'Pulizia Dati';
    'Type'?: 'Trigger' | 'Programmata' | 'Condizionale' | 'Manuale';
    'Priority'?: 'Bassa' | 'Media' | 'Alta' | 'Critica';
    'IsActive'?: boolean;
    'CreatedAt'?: string;
    'UpdatedAt'?: string;
    'LastExecuted'?: string;
    'ExecutionCount'?: number;
    'TriggerTable'?: 'Lead' | 'Activity' | 'Order' | 'Products' | 'User' | 'System';
    'TriggerEvent'?: 'Record Created' | 'Record Updated' | 'Field Changed' | 'Record Deleted' | 'Time Schedule' | 'Manual Trigger';
    'TriggerConditions'?: string;
    'Actions'?: string;
    'ScheduleConfig'?: string;
    'CreatedBy'?: string[];
  };

  // Table: Products
  Products: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'Codice_Matrice'?: string;
    'Nome_Prodotto'?: string;
    'Metadata'?: string;
    'Descrizione'?: string;
    'Categoria'?: 'Materassi' | 'Reti' | 'Cuscini' | 'Letti' | 'Accessori' | 'Altro';
    'Prezzo_Listino_Attuale'?: number;
    'Costo_Attuale'?: number;
    'Margine_Standard'?: number;
    'Foto_Prodotto'?: Array<{ id: string; url: string; filename: string; size: number; type: string }>;
    'Schede_Tecniche'?: Array<{ id: string; url: string; filename: string; size: number; type: string }>;
    'Manuali'?: Array<{ id: string; url: string; filename: string; size: number; type: string }>;
    'Certificazioni'?: Array<{ id: string; url: string; filename: string; size: number; type: string }>;
    'Attivo'?: boolean;
    'In_Evidenza'?: boolean;
    'Product_Variants'?: string[];
    'Product_Price_History'?: string[];
    'Order_Items'?: string[];
  };

  // Table: Product_Variants
  Product_Variants: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID_Variante'?: any;
    'ID_Prodotto'?: string[];
    'Tipo_Variante'?: string;
    'Codice_Variante'?: string;
    'Nome_Variante'?: string;
    'Descrizione_Variante'?: string;
    'Prezzo_Aggiuntivo_Attuale'?: number;
    'Costo_Aggiuntivo_Attuale'?: number;
    'Posizione'?: number;
    'Attivo'?: boolean;
    'Product_Price_History'?: string[];
    'Order_Items'?: string[];
    'Product_Structures'?: string[];
  };

  // Table: Product_Structures
  Product_Structures: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID_Struttura'?: any;
    'Nome'?: string;
    'Descrizione'?: string;
    'Campi_JSON'?: string;
    'Attiva'?: boolean;
    'Data_Creazione'?: any;
    'Data_Modifica'?: any;
    'Product_Variants'?: string[];
  };

  // Table: Orders
  Orders: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID_Ordine'?: any;
    'ID_Lead'?: string[];
    'ID_Venditore'?: string[];
    'Data_Ordine'?: string;
    'Data_Consegna_Richiesta'?: string;
    'Stato_Ordine'?: 'Bozza' | 'Confermato' | 'In_Produzione' | 'Spedito' | 'Consegnato' | 'Annullato';
    'Stato_Pagamento'?: 'Non Pagato' | 'Pagamento Parziale' | 'Pagato' | 'Rimborsato';
    'Modalita_Pagamento'?: 'Contanti' | 'Bonifico' | 'Carta Credito' | 'Finanziamento' | 'Assegno' | 'PayPal';
    'Totale_Lordo'?: number;
    'Totale_Sconto'?: number;
    'Totale_Netto'?: number;
    'Totale_IVA'?: number;
    'Totale_Finale'?: number;
    'Percentuale_Sconto'?: number;
    'Percentuale_Commissione'?: number;
    'Importo_Commissione'?: number;
    'Indirizzo_Consegna'?: string;
    'Note_Cliente'?: string;
    'Note_Interne'?: string;
    'Codice_Tracking'?: string;
    'Finanziamento_Richiesto'?: boolean;
    'Rata_Mensile'?: number;
    'Numero_Rate'?: number;
    'Tasso_Interesse'?: number;
    'Stato_Finanziamento'?: 'Non_Richiesto' | 'In_Valutazione' | 'Approvato' | 'Rifiutato';
    'Data_Creazione'?: string;
    'Ultima_Modifica'?: string;
    'Order_Items'?: string[];
    'Commission_Payments'?: string[];
    'Payment_Transactions'?: string[];
    'URL_Contratto'?: string;
    'URL_Documenti_Cliente'?: string;
    'URL_Schede_Cliente'?: string;
  };

  // Table: Order_Items
  Order_Items: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID_Riga'?: any;
    'ID_Ordine'?: string[];
    'ID_Prodotto'?: string[];
    'Configurazione_Varianti'?: string[];
    'Quantita'?: number;
    'Prezzo_Unitario'?: number;
    'Costo_Unitario'?: number;
    'Sconto_Percentuale'?: number;
    'Sconto_Importo'?: number;
    'Prezzo_Finale_Unitario'?: number;
    'Totale_Riga'?: number;
    'Configurazione_JSON'?: string;
    'Note_Configurazione'?: string;
    'Codice_Prodotto_Configurato'?: string;
    'Nome_Prodotto_Personalizzato'?: string;
    'Dimensioni_Finali'?: string;
    'Peso_Stimato'?: number;
  };

  // Table: Product_Price_History
  Product_Price_History: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID_Storico'?: any;
    'ID_Prodotto'?: string[];
    'ID_Variante'?: string[];
    'Prezzo_Vendita'?: number;
    'Prezzo_Costo'?: number;
    'Data_Validita_Da'?: string;
    'Data_Validita_A'?: string;
    'Tipo_Prezzo'?: 'Base' | 'Promo' | 'Scontato' | 'Speciale';
    'Motivo_Cambio'?: 'Aggiornamento_Listino' | 'Promozione' | 'Correzione_Errore' | 'Cambio_Fornitore' | 'Inflazione';
    'Creato_Da'?: string;
    'Note'?: string;
    'Attivo'?: boolean;
  };

  // Table: Commission_Payments
  Commission_Payments: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID_Commissione'?: any;
    'ID_Ordine'?: string[];
    'ID_Venditore'?: string[];
    'Importo_Vendita'?: number;
    'Percentuale_Commissione'?: number;
    'Importo_Commissione'?: number;
    'Data_Maturazione'?: string;
    'Data_Pagamento'?: string;
    'Stato_Pagamento'?: 'Da_Pagare' | 'Pagato' | 'Sospeso' | 'Annullato';
    'Modalita_Pagamento'?: 'Bonifico' | 'Contanti' | 'Assegno' | 'Trattenuta';
    'Numero_Bonifico'?: string;
    'IBAN_Destinazione'?: string;
    'Note_Pagamento'?: string;
    'Riferimento_Contabile'?: string;
    'Trimestre_Competenza'?: string;
    'Anno_Competenza'?: number;
    'Data_Creazione'?: string;
    'URL_Ricevuta_Commissione'?: string;
    'URL_Documento_Pagamento'?: string;
  };

  // Table: Payment_Transactions
  Payment_Transactions: {
    id: string; // Airtable record ID
    createdTime: string; // ISO timestamp
    'ID_Transazione'?: any;
    'ID_Ordine'?: string[];
    'Importo'?: number;
    'Data_Transazione'?: string;
    'Tipo_Transazione'?: 'Acconto' | 'Saldo' | 'Pagamento_Completo' | 'Rimborso' | 'Storno';
    'Modalita_Pagamento'?: 'Contanti' | 'Bonifico' | 'Carta_Credito' | 'Carta_Debito' | 'PayPal' | 'Assegno' | 'Finanziamento';
    'Stato_Transazione'?: 'Pending' | 'Completata' | 'Fallita' | 'Annullata' | 'Rimborsata';
    'Riferimento_Esterno'?: string;
    'ID_Transazione_Gateway'?: string;
    'Codice_Autorizzazione'?: string;
    'Numero_Ricevuta'?: string;
    'IBAN_Mittente'?: string;
    'Nome_Titolare'?: string;
    'Commissioni_Gateway'?: number;
    'Tasso_Cambio'?: number;
    'Valuta_Originale'?: string;
    'Importo_Originale'?: number;
    'Note_Transazione'?: string;
    'Data_Accredito'?: string;
    'Verificata'?: boolean;
    'Riconciliata'?: boolean;
    'Log_Errori'?: string;
    'URL_Ricevuta'?: string;
    'URL_Screenshot_Gateway'?: string;
    'URL_Documento_Rimborso'?: string;
    'URL_Bonifico_Prova'?: string;
  };
}
