/**
 * 🎯 Activity-Lead State Helper
 * 
 * Logica per determinare se/come aggiornare lo stato del lead
 * quando viene creata o modificata un'attività
 */

import type { ActivityStato, ActivityEsito } from '@/types/activities';
import type { LeadStato } from '@/types/leads';
import { toast } from 'sonner';

/**
 * Determina se lo stato del lead deve essere aggiornato automaticamente
 * in base allo stato dell'attività
 */
export function shouldAutoUpdateLeadState(activityState: ActivityStato | ActivityEsito): {
  shouldUpdate: boolean;
  newLeadState?: LeadStato;
  askUser: boolean; // True se deve mostrare dialog all'utente
} {
  // 🚀 STATI CHE RICHIEDONO AGGIORNAMENTO AUTOMATICO
  // Quando un'attività è Completata → lead è stato Contattato
  if (activityState === 'Completata') {
    return {
      shouldUpdate: true,
      newLeadState: 'Contattato',
      askUser: false, // Auto-update senza chiedere
    };
  }

  // Se l'esito è "Contatto riuscito" → lead è Contattato
  if (activityState === 'Contatto riuscito') {
    return {
      shouldUpdate: true,
      newLeadState: 'Contattato',
      askUser: false,
    };
  }

  // Se l'esito è "Qualificato" → lead è Qualificato
  if (activityState === 'Molto interessato' || 
      activityState === 'Interessato' || 
      activityState === 'Informazioni raccolte' ||
      activityState === 'Preventivo richiesto') {
    return {
      shouldUpdate: true,
      newLeadState: 'Qualificato',
      askUser: false,
    };
  }

  // Se l'esito è "Appuntamento fissato" → lead è Qualificato (minimo)
  if (activityState === 'Appuntamento fissato') {
    return {
      shouldUpdate: true,
      newLeadState: 'Qualificato',
      askUser: false,
    };
  }

  // Se l'esito è "Ordine confermato" → lead è Cliente
  if (activityState === 'Ordine confermato') {
    return {
      shouldUpdate: true,
      newLeadState: 'Cliente',
      askUser: false,
    };
  }

  // 🤔 STATI AMBIGUI - CHIEDI ALL'UTENTE
  // Questi stati potrebbero significare diverse cose
  const ambiguousStates = [
    'In attesa',           // In attesa di cosa? Cliente in sospeso? In Negoziazione?
    'Rimandata',          // Rimandato = Contattato o resta Nuovo?
    'Annullata',          // Annullato = fallimento o rimandato?
    'Non disponibile',    // Non disponibile = nessun contatto
    'Numero errato',      // Numero errato = fallimento
    'Nessuna risposta',   // Nessuna risposta = tentativo senza successo
    'Poco interessato',   // Poco interessato = Contattato ma non Qualificato
    'Non interessato',    // Non interessato = fallimento
  ];

  if (ambiguousStates.includes(activityState)) {
    return {
      shouldUpdate: false, // Non aggiornare automaticamente
      askUser: true,      // Chiedi all'utente
    };
  }

  // 🚫 STATI NEUTRI - NON AGGIORNARE
  const neutralStates = ['Da Pianificare', 'Pianificata', 'In corso'];
  
  if (neutralStates.includes(activityState)) {
    return {
      shouldUpdate: false,
      askUser: false,
    };
  }

  // Default: non aggiornare
  return {
    shouldUpdate: false,
    askUser: false,
  };
}

/**
 * Determina il nuovo stato lead basato su quello attuale e sull'attività
 */
export function getNewLeadState(
  currentLeadState: LeadStato,
  activityState: ActivityStato | ActivityEsito
): LeadStato | null {
  const { newLeadState } = shouldAutoUpdateLeadState(activityState);
  
  if (!newLeadState) return null;

  // Non regredire lo stato
  const stateHierarchy: Record<LeadStato, number> = {
    'Nuovo': 0,
    'Contattato': 1,
    'Qualificato': 2,
    'In Negoziazione': 3,
    'Cliente': 4,
    'Sospeso': 2, // Uguale a Qualificato
    'Perso': 0, // Fallimento = torna a Nuovo mentalmente
  };

  const currentLevel = stateHierarchy[currentLeadState] ?? 0;
  const newLevel = stateHierarchy[newLeadState] ?? 0;

  // Se il nuovo stato è "più avanzato", aggiorna
  if (newLevel > currentLevel) {
    return newLeadState;
  }

  // Altrimenti non regredire
  return null;
}

/**
 * Showdialog per chiedere all'utente se aggiornare lo stato del lead
 */
export async function promptLeadStateUpdate(
  currentLeadState: LeadStato,
  activityState: ActivityStato | ActivityEsito
): Promise<LeadStato | null> {
  // 🎯 Suggerisci stati basati sull'attività
  const suggestedStates: Record<string, LeadStato> = {
    'In attesa': 'Qualificato', // In attesa = interessato ma non decide ancora
    'Rimandata': 'Contattato', // Rimandato = abbiamo contattato
    'Annullata': 'Sospeso', // Annullato = messo in pausa
    'Non disponibile': 'Contattato', // Tentativo fallito ma abbiamo contattato
    'Numero errato': 'Nuovo', // Numero errato = non contattato
    'Nessuna risposta': 'Contattato', // Abbiamo tentato
    'Poco interessato': 'Contattato', // Contattato ma non interessato
    'Non interessato': 'Perso', // Non interessato = perduto
  };

  const suggestedState = suggestedStates[activityState] as LeadStato || 'Contattato';

  // Non regredire
  const newState = getNewLeadState(currentLeadState, activityState);
  if (!newState) {
    // Lo stato suggerito non è migliore di quello attuale
    return null;
  }

  // In una app reale, mostreresti un dialog vero
  // Per ora returniamo il nuovo stato suggerito
  console.log(`❓ [ActivityHelper] Suggested lead state update:`, {
    from: currentLeadState,
    to: newState,
    activity: activityState,
  });

  return newState;
}

/**
 * Log degli aggiornamenti per debug
 */
export function logLeadStateUpdate(
  leadId: string,
  currentState: LeadStato,
  newState: LeadStato,
  reason: string
): void {
  console.log(`🔄 [LeadStateUpdate] Lead ${leadId}:`, {
    from: currentState,
    to: newState,
    reason,
    timestamp: new Date().toISOString(),
  });
}
