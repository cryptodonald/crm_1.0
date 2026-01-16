import { NextRequest, NextResponse } from 'next/server';
import { apiKeyService } from '@/lib/api-keys-service';

export interface ParsedLeadData {
  Nome?: string;
  Cognome?: string;
  Email?: string;
  Telefono?: string;
  Città?: string;
  Esigenza?: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const { testo } = await request.json();

    if (!testo || typeof testo !== 'string' || testo.trim().length === 0) {
      return NextResponse.json(
        { error: 'Testo non valido' },
        { status: 400 }
      );
    }

    // Recupera la chiave OpenAI dal sistema API keys
    const openaiApiKey = await apiKeyService.getApiKey('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY non trovata nel sistema API keys');
      return NextResponse.json(
        { error: 'Servizio AI non configurato. Aggiungi la chiave OpenAI in /developers/api-keys' },
        { status: 500 }
      );
    }

    console.log('🤖 [AI Parse Lead] Parsing della richiesta in corso...');
    console.log('📝 [AI Parse Lead] Lunghezza testo:', testo.length);

    const systemMessage = `Sei un assistente esperto specializzato nell'estrazione di dati da email e form di richiesta di preventivi per un'azienda che vende materassi.

Il tuo compito è estrarre intelligentemente i seguenti dati dalla richiesta ricevuta:
- Nome (first name)
- Cognome (last name)
- Email
- Telefono (numero di telefono)
- Città
- Esigenza (descrizione del problema/necessità - ad es: mal di schiena, sostituzione materasso, ecc)

ISTRUZIONI:
1. Estrai SOLO le informazioni presenti nel testo
2. Non inventare dati non presenti
3. Pulisci e formatta i dati (trim spazi, standardizza formato telefono/email)
4. Se mancano informazioni, omettile dalla risposta
5. Per l'Esigenza, sintetizza in 1-2 frasi il motivo della richiesta/problema descritto

Ritorna SEMPRE un JSON valido con la seguente struttura (SOLO i campi trovati):
{
  "Nome": "string or null",
  "Cognome": "string or null",
  "Email": "string or null",
  "Telefono": "string or null",
  "Città": "string or null",
  "Esigenza": "string or null",
  "confidence": 0.0-1.0
}

dove confidence è un numero tra 0 e 1 che indica quanto sei sicuro dei dati estratti (1 = molto sicuro, 0 = poco sicuro)`;

    const userMessage = `Estrai i dati di contatto e l'esigenza da questa richiesta di preventivo:

${testo}

Ritorna SOLO il JSON, niente altro.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [AI Parse Lead] API Error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 [AI Parse Lead] Response:', JSON.stringify(data, null, 2).substring(0, 500));

    // Estrai il contenuto della risposta
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Nessun contenuto nella risposta API');
    }

    console.log('📝 [AI Parse Lead] Content:', content);

    // Parse il JSON dalla risposta
    let parsedData: ParsedLeadData;
    try {
      // Cerca il JSON nel content (potrebbe contenere testo aggiuntivo)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON non trovato nella risposta');
      }
      parsedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ [AI Parse Lead] JSON Parse Error:', parseError);
      throw new Error('Errore nel parsing dei dati estratti');
    }

    // Funzioni di formatting
    const formatFullName = (nome?: string, cognome?: string): string | undefined => {
      const parts = [];
      if (nome && typeof nome === 'string') {
        parts.push(nome.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));
      }
      if (cognome && typeof cognome === 'string') {
        parts.push(cognome.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));
      }
      return parts.length > 0 ? parts.join(' ') : undefined;
    };

    const formatPhoneNumber = (phone?: string): string | undefined => {
      if (!phone || typeof phone !== 'string') return undefined;
      
      // Rimuovi tutti i caratteri non-digit
      const cleaned = phone.replace(/[^\d]/g, '');
      if (cleaned.length === 0) return undefined;
      
      let phoneNumber = cleaned;
      
      // Se inizia con 0, rimuovi lo 0
      if (cleaned.startsWith('0')) {
        phoneNumber = cleaned.substring(1);
      }
      // Se inizia con 39, tienilo cosi
      else if (cleaned.startsWith('39')) {
        phoneNumber = cleaned;
      }
      // Altrimenti, assume sia senza prefisso
      else {
        phoneNumber = cleaned;
      }
      
      // Formato finale: +39 XXXXXXXXXX (con spazio dopo +39)
      if (phoneNumber.startsWith('39')) {
        // Già ha il prefisso: +39 3391234567
        return `+39 ${phoneNumber.substring(2)}`;
      } else if (phoneNumber.length >= 10) {
        // Numero italiano senza prefisso: +39 3391234567
        return `+39 ${phoneNumber}`;
      }
      
      // Fallback: ritorna il numero con prefisso
      return `+39 ${phoneNumber}`;
    };

    const standardizeCity = (city?: string): string | undefined => {
      if (!city || typeof city !== 'string') return undefined;
      
      const normalized = city.trim().toLowerCase().replace(/\s+/g, '');
      
      // Mapping di città comuni con errori di digitazione
      const cityMap: Record<string, string> = {
        'sanmarino': 'San Marino',
        'rimini': 'Rimini',
        'bologna': 'Bologna',
        'ravenna': 'Ravenna',
        'faenza': 'Faenza',
        'lugo': 'Lugo',
        'forli': 'Forlì',
        'cesena': 'Cesena',
        'florence': 'Firenze',
        'roma': 'Roma',
        'milano': 'Milano',
        'torino': 'Torino',
        'venezia': 'Venezia',
        'padova': 'Padova',
        'verona': 'Verona',
        'modena': 'Modena',
        'parma': 'Parma',
        'piacenza': 'Piacenza',
        'ancona': 'Ancona',
        'perugia': 'Perugia',
        'teramo': 'Teramo',
      };
      
      return cityMap[normalized] || city.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    // Valida e normalizza i dati
    const resultado: ParsedLeadData = {
      confidence: parsedData.confidence || 0.7,
    };

    // Unisci Nome e Cognome
    const fullName = formatFullName(parsedData.Nome, parsedData.Cognome);
    if (fullName) {
      resultado.Nome = fullName;
    }

    if (parsedData.Email && typeof parsedData.Email === 'string') {
      resultado.Email = parsedData.Email.trim().toLowerCase();
    }

    const formattedPhone = formatPhoneNumber(parsedData.Telefono);
    if (formattedPhone) {
      resultado.Telefono = formattedPhone;
    }

    const standardizedCity = standardizeCity(parsedData.Città);
    if (standardizedCity) {
      resultado.Città = standardizedCity;
    }

    if (parsedData.Esigenza && typeof parsedData.Esigenza === 'string') {
      resultado.Esigenza = parsedData.Esigenza.trim();
    }

    console.log('✅ [AI Parse Lead] Parsing completato');
    console.log('📊 [AI Parse Lead] Dati estratti:', resultado);

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    console.error('❌ [AI Parse Lead] Errore:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Errore nel parsing dei dati',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Errore durante il parsing della richiesta' },
      { status: 500 }
    );
  }
}
