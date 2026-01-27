import { calendar_v3, calendar, auth } from '@googleapis/calendar';
import { encryptionService } from '@/lib/encryption';

interface CreateEventParams {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
  attendeesEmails?: string[];
  reminders?: Array<{
    method: 'email' | 'notification' | 'popup';
    minutes: number;
  }>;
  extendedProperties?: Record<string, string>;
}

interface UpdateEventParams extends CreateEventParams {
  eventId: string;
}

/**
 * Crea un client Google Calendar autenticato
 */
function createCalendarClient(encryptedAccessToken: string): calendar_v3.Calendar {
  const accessToken = encryptionService.decrypt(encryptedAccessToken);

  // Crea un OAuth2 client con il token decriptato
  const oauth2Client = auth.setCredentials({
    access_token: accessToken,
  });

  // Ritorna il client Calendar autenticato
  return calendar({
    version: 'v3',
    auth: oauth2Client,
  });
}

/**
 * Ottiene il calendario primario dell'utente
 */
export async function getCalendarId(encryptedAccessToken: string): Promise<string> {
  try {
    const calendar = createCalendarClient(encryptedAccessToken);
    const calendarList = await calendar.calendarList.list({
      maxResults: 1,
    });

    const primaryCalendar = calendarList.data.items?.[0];
    if (!primaryCalendar?.id) {
      throw new Error('Nessun calendario primario trovato');
    }

    console.log('[GoogleCalendar] Primary calendar ID:', primaryCalendar.id);
    return primaryCalendar.id;
  } catch (error) {
    console.error('[GoogleCalendar] Error getting calendar ID:', error);
    throw error;
  }
}

/**
 * Crea un evento su Google Calendar
 */
export async function createCalendarEvent(
  encryptedAccessToken: string,
  calendarId: string,
  params: CreateEventParams
): Promise<string> {
  try {
    const calendar = createCalendarClient(encryptedAccessToken);

    const event: calendar_v3.Schema$Event = {
      summary: `[CRM] ${params.summary}`,
      description: params.description,
      start: {
        dateTime: params.startDateTime,
        timeZone: params.timeZone || 'Europe/Rome',
      },
      end: {
        dateTime: params.endDateTime,
        timeZone: params.timeZone || 'Europe/Rome',
      },
      attendees: params.attendeesEmails?.map((email) => ({
        email,
        responseStatus: 'accepted',
      })),
      reminders: params.reminders
        ? {
            useDefault: false,
            overrides: params.reminders,
          }
        : undefined,
      extendedProperties: params.extendedProperties
        ? {
            private: params.extendedProperties,
          }
        : undefined,
    };

    const createdEvent = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    const eventId = createdEvent.data.id;
    console.log('[GoogleCalendar] Event created:', eventId);
    return eventId || '';
  } catch (error) {
    console.error('[GoogleCalendar] Error creating event:', error);
    throw error;
  }
}

/**
 * Aggiorna un evento su Google Calendar
 */
export async function updateCalendarEvent(
  encryptedAccessToken: string,
  calendarId: string,
  params: UpdateEventParams
): Promise<void> {
  try {
    const calendar = createCalendarClient(encryptedAccessToken);

    const event: calendar_v3.Schema$Event = {
      summary: `[CRM] ${params.summary}`,
      description: params.description,
      start: {
        dateTime: params.startDateTime,
        timeZone: params.timeZone || 'Europe/Rome',
      },
      end: {
        dateTime: params.endDateTime,
        timeZone: params.timeZone || 'Europe/Rome',
      },
      attendees: params.attendeesEmails?.map((email) => ({
        email,
        responseStatus: 'accepted',
      })),
      reminders: params.reminders
        ? {
            useDefault: false,
            overrides: params.reminders,
          }
        : undefined,
      extendedProperties: params.extendedProperties
        ? {
            private: params.extendedProperties,
          }
        : undefined,
    };

    await calendar.events.update({
      calendarId,
      eventId: params.eventId,
      requestBody: event,
    });

    console.log('[GoogleCalendar] Event updated:', params.eventId);
  } catch (error) {
    console.error('[GoogleCalendar] Error updating event:', error);
    throw error;
  }
}

/**
 * Elimina un evento da Google Calendar
 */
export async function deleteCalendarEvent(
  encryptedAccessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    const calendar = createCalendarClient(encryptedAccessToken);

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    console.log('[GoogleCalendar] Event deleted:', eventId);
  } catch (error) {
    console.error('[GoogleCalendar] Error deleting event:', error);
    throw error;
  }
}

/**
 * Recupera un evento da Google Calendar
 */
export async function getCalendarEvent(
  encryptedAccessToken: string,
  calendarId: string,
  eventId: string
): Promise<calendar_v3.Schema$Event | null> {
  try {
    const calendar = createCalendarClient(encryptedAccessToken);

    const event = await calendar.events.get({
      calendarId,
      eventId,
    });

    return event.data;
  } catch (error) {
    console.error('[GoogleCalendar] Error getting event:', error);
    return null;
  }
}

/**
 * Lista gli eventi del calendario entro un intervallo di date
 */
export async function listCalendarEvents(
  encryptedAccessToken: string,
  calendarId: string,
  startDate: string,
  endDate: string
): Promise<calendar_v3.Schema$Event[]> {
  try {
    const calendar = createCalendarClient(encryptedAccessToken);

    const events = await calendar.events.list({
      calendarId,
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return events.data.items || [];
  } catch (error) {
    console.error('[GoogleCalendar] Error listing events:', error);
    return [];
  }
}
