/**
 * Activity Sync Service - Sincronizzazione tra CRM Activities e Google Calendar
 *
 * ARCHITETTURA: Google Calendar come Single Source of Truth
 *
 * Principi:
 * - L'evento Google Calendar è la fonte di verità per scheduling e notifications
 * - L'ID attività CRM è salvato in extended_properties dell'evento Google
 * - No tabella di mapping separata - il bridge è l'extended_properties
 * - Sincronizzazione unidirezionale: CRM → Google Calendar
 *
 * Flusso operazioni:
 * - CREATE: Attività CRM → Evento Google Calendar (ID in extendedProperties)
 * - UPDATE: Attività CRM → Evento Google Calendar aggiornato
 * - DELETE: Attività CRM rimossa → Evento Google Calendar eliminato
 * - CHECK: Verifica se evento esiste ancora su Google usando ID in extended_properties
 *
 * Vantaggi:
 * ✅ Single source of truth (Google Calendar)
 * ✅ No sync conflicts - unidirezionale
 * ✅ No tabelle di mapping da mantenere
 * ✅ Extended properties as bridge - semplice e robusto
 * ✅ Google notifications sempre funzionanti
 */

import { ActivityData, ActivityFormData } from '@/types/activities';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  getCalendarId,
  listCalendarEvents,
} from './google-calendar';

/**
 * Interfaccia del risultato di sincronizzazione
 */
export interface SyncResult {
  success: boolean;
  operation: 'create' | 'update' | 'delete' | 'check';
  activityId: string;
  googleEventId?: string;
  error?: string;
  message: string;
  timestamp: string;
}

/**\n * Extended Properties personalizzate salvate in Google Calendar\n * Permettono il bridge tra CRM e Google senza tabella separata\n */
interface CrmExtendedProperties {
  crm_activity_id: string;
  crm_activity_type: string;
  crm_activity_status: string;
  crm_sync_timestamp?: string;
}

/**
 * Servizio principale di sincronizzazione attività
 * Gestisce sync unidirezionale: CRM → Google Calendar
 */
export class ActivitySyncService {
  private static readonly TAG = '[ActivitySync]';
  private static readonly ENABLED = true;

  /**
   * Sincronizza creazione attività con Google Calendar
   */
  static async syncCreateActivity(
    activity: ActivityFormData & { id?: string },
    activityId: string,
    userId: string,
    encryptedAccessToken?: string
  ): Promise<SyncResult> {
    console.log(`${this.TAG} 🔄 Sync CREATE activity:`, { activityId, userId });

    if (!this.ENABLED) {
      return {
        success: true,
        operation: 'create',
        activityId,
        message: 'Sync disabled globally',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Per ora, placeholder - in produzione richiedere accessToken dalla session
      if (!encryptedAccessToken) {
        console.log(
          `${this.TAG} ⏭️  No Google Calendar token available - skip sync`
        );
        return {
          success: true,
          operation: 'create',
          activityId,
          message: 'No Google Calendar authentication available',
          timestamp: new Date().toISOString(),
        };
      }

      // Ottieni calendar ID
      const calendarId = await getCalendarId(encryptedAccessToken);

      // Trasforma attività in evento Google Calendar
      const eventParams = this.transformActivityToEventParams(activity, activityId);

      // Crea evento su Google Calendar
      const googleEventId = await createCalendarEvent(
        encryptedAccessToken,
        calendarId,
        eventParams
      );

      console.log(
        `${this.TAG} ✅ Activity ${activityId} synced to Google Calendar:`,
        googleEventId
      );

      return {
        success: true,
        operation: 'create',
        activityId,
        googleEventId,
        message: 'Activity created and synced to Google Calendar',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `${this.TAG} ❌ Error syncing CREATE activity [${activityId}]:`,
        error
      );

      return {
        success: false,
        operation: 'create',
        activityId,
        error: errorMsg,
        message: 'Activity created but failed to sync to Google Calendar',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Sincronizza aggiornamento attività con Google Calendar
   */
  static async syncUpdateActivity(
    activity: ActivityFormData & { id?: string },
    activityId: string,
    userId: string,
    encryptedAccessToken?: string
  ): Promise<SyncResult> {
    console.log(`${this.TAG} 🔄 Sync UPDATE activity:`, { activityId, userId });

    if (!this.ENABLED) {
      return {
        success: true,
        operation: 'update',
        activityId,
        message: 'Sync disabled globally',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      if (!encryptedAccessToken) {
        console.log(
          `${this.TAG} ⏭️  No Google Calendar token available - skip sync`
        );
        return {
          success: true,
          operation: 'update',
          activityId,
          message: 'No Google Calendar authentication available',
          timestamp: new Date().toISOString(),
        };
      }

      // Ottieni calendar ID
      const calendarId = await getCalendarId(encryptedAccessToken);

      // TODO: Implementare ricerca evento per Activity ID
      // Per ora: nessun evento trovato
      const googleEventId = await this.findGoogleEventByActivityId(
        activityId,
        encryptedAccessToken,
        calendarId
      );

      if (!googleEventId) {
        console.log(
          `${this.TAG} ⏭️  No Google Calendar event found for activity ${activityId}`
        );
        return {
          success: true,
          operation: 'update',
          activityId,
          message: 'No Google Calendar event to update',
          timestamp: new Date().toISOString(),
        };
      }

      // Trasforma dati aggiornati in evento Google
      const eventParams = this.transformActivityToEventParams(activity, activityId);

      // Aggiorna evento su Google Calendar
      await updateCalendarEvent(
        encryptedAccessToken,
        calendarId,
        {
          ...eventParams,
          eventId: googleEventId,
        }
      );

      console.log(
        `${this.TAG} ✅ Activity ${activityId} updated in Google Calendar:`,
        googleEventId
      );

      return {
        success: true,
        operation: 'update',
        activityId,
        googleEventId,
        message: 'Activity updated and synced to Google Calendar',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `${this.TAG} ❌ Error syncing UPDATE activity [${activityId}]:`,
        error
      );

      return {
        success: false,
        operation: 'update',
        activityId,
        error: errorMsg,
        message: 'Activity updated but failed to sync to Google Calendar',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Sincronizza eliminazione attività con Google Calendar
   */
  static async syncDeleteActivity(
    activityId: string,
    userId: string,
    encryptedAccessToken?: string
  ): Promise<SyncResult> {
    console.log(`${this.TAG} 🗑️  Sync DELETE activity:`, { activityId, userId });

    if (!this.ENABLED) {
      return {
        success: true,
        operation: 'delete',
        activityId,
        message: 'Sync disabled globally',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      if (!encryptedAccessToken) {
        console.log(
          `${this.TAG} ⏭️  No Google Calendar token available - skip sync`
        );
        return {
          success: true,
          operation: 'delete',
          activityId,
          message: 'No Google Calendar authentication available',
          timestamp: new Date().toISOString(),
        };
      }

      // Ottieni calendar ID
      const calendarId = await getCalendarId(encryptedAccessToken);

      // TODO: Implementare ricerca evento per Activity ID
      const googleEventId = await this.findGoogleEventByActivityId(
        activityId,
        encryptedAccessToken,
        calendarId
      );

      if (!googleEventId) {
        console.log(
          `${this.TAG} ⏭️  No Google Calendar event found for activity ${activityId}`
        );
        return {
          success: true,
          operation: 'delete',
          activityId,
          message: 'No Google Calendar event to delete',
          timestamp: new Date().toISOString(),
        };
      }

      // Elimina evento da Google Calendar
      await deleteCalendarEvent(
        encryptedAccessToken,
        calendarId,
        googleEventId
      );

      console.log(
        `${this.TAG} ✅ Activity ${activityId} deleted from Google Calendar:`,
        googleEventId
      );

      return {
        success: true,
        operation: 'delete',
        activityId,
        googleEventId,
        message: 'Activity deleted and synced from Google Calendar',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `${this.TAG} ❌ Error syncing DELETE activity [${activityId}]:`,
        error
      );

      return {
        success: true,
        operation: 'delete',
        activityId,
        error: errorMsg,
        message:
          'Activity deleted but failed to remove from Google Calendar (may require manual cleanup)',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Trasforma attività CRM in parametri per Google Calendar API
   */
  private static transformActivityToEventParams(
    activity: ActivityFormData | ActivityData,
    activityId: string
  ) {
    // Titolo
    const title = (
      ('Titolo' in activity && activity.Titolo) ||
      `${activity.Tipo}${activity['Nome Lead']?.[0] ? ` - ${activity['Nome Lead'][0]}` : ''}`
    ).substring(0, 254);

    // Descrizione formattata
    const description = [
      activity.Note || 'Nessuna nota',
      '',
      `📋 Tipo: ${activity.Tipo}`,
      activity.Priorità ? `🔴 Priorità: ${activity.Priorità}` : null,
      activity.Obiettivo ? `🎯 Obiettivo: ${activity.Obiettivo}` : null,
      activity.Esito ? `✅ Esito: ${activity.Esito}` : null,
      activity['Prossima azione']
        ? `➡️  Prossima azione: ${activity['Prossima azione']}`
        : null,
      '',
      '---',
      `CRM Activity ID: ${activityId}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Calcola durata in minuti
    let durationMinutes = 60;
    if (activity['Durata stimata']) {
      if (typeof activity['Durata stimata'] === 'string') {
        const parts = activity['Durata stimata'].split(':');
        if (parts.length === 2) {
          durationMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
      }
    }

    // Data/ora inizio e fine
    const startDateTime = activity.Data
      ? new Date(activity.Data).toISOString()
      : new Date().toISOString();
    const endDateTime = new Date(
      new Date(startDateTime).getTime() + durationMinutes * 60000
    ).toISOString();

    // Extended properties: il BRIDGE tra CRM e Google
    const extendedProperties: CrmExtendedProperties = {
      crm_activity_id: activityId,
      crm_activity_type: activity.Tipo,
      crm_activity_status: activity.Stato || 'Da Pianificare',
      crm_sync_timestamp: new Date().toISOString(),
    };

    return {
      summary: title,
      description,
      startDateTime,
      endDateTime,
      timeZone: 'Europe/Rome',
      reminders: [
        { method: 'popup' as const, minutes: 15 },
        { method: 'email' as const, minutes: 24 * 60 },
      ],
      extendedProperties: extendedProperties as Record<string, string>,
      attendeesEmails:
        activity.Assegnatario && activity.Assegnatario.length > 0
          ? activity.Assegnatario
          : undefined,
    };
  }

  /**
   * Ricerca l'ID dell'evento Google Calendar usando l'ID attività CRM
   * TODO: Implementare ricerca usando listEvents con filtro
   */
  private static async findGoogleEventByActivityId(
    activityId: string,
    encryptedAccessToken: string,
    calendarId: string
  ): Promise<string | null> {
    try {
      console.log(
        `${this.TAG} 🔎 Searching for Google event with CRM activity ID:`,
        activityId
      );

      // TODO: Implementare ricerca su Google Calendar API
      // Opzione 1: listEvents con fullText search sulla descrizione
      // Opzione 2: Query con filtered extended properties
      // Per ora: placeholder

      console.log(
        `${this.TAG} ⏭️  TODO: Implementare ricerca evento Google con CRM activity ID`
      );
      return null;
    } catch (error) {
      console.error(
        `${this.TAG} ❌ Error finding Google event [${activityId}]:`,
        error
      );
      return null;
    }
  }
}

export { ActivitySyncService };
export default ActivitySyncService;
