/**
 * Adapter per trasformare eventi Google Calendar in formato ActivityData-like
 * Permette a CalendarView di renderizzare sia attività CRM che eventi Google Calendar
 */

export interface GoogleCalendarEventFormatted {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  isGoogleEvent: true;
  source: 'google-calendar';
}

export interface ActivityDataLike {
  id: string;
  Data: string; // ISO string
  Titolo?: string;
  'Nome Lead'?: string[];
  Tipo: string;
  Stato: string;
  Priorità?: string;
  Note?: string;
  Obiettivo?: string;
  isGoogleEvent?: false;
  source?: 'crm';
}

export type CalendarEvent = ActivityDataLike | GoogleCalendarEventFormatted;

/**
 * Trasforma un evento Google Calendar nel formato atteso da CalendarView
 */
export function adaptGoogleCalendarEvent(event: any): GoogleCalendarEventFormatted {
  return {
    id: event.id,
    title: event.summary || 'Evento senza titolo',
    description: event.description,
    start: new Date(event.start?.dateTime || event.start?.date || new Date()),
    end: new Date(event.end?.dateTime || event.end?.date || new Date()),
    isGoogleEvent: true,
    source: 'google-calendar',
  };
}

/**
 * Estrae la data formattata da un evento (sia CRM che Google Calendar)
 */
export function getEventDate(event: CalendarEvent): Date {
  if ('isGoogleEvent' in event && event.isGoogleEvent) {
    return new Date(event.start);
  }
  return new Date(event.Data);
}

/**
 * Estrae il titolo/nome da un evento
 */
export function getEventTitle(event: CalendarEvent): string {
  if ('isGoogleEvent' in event && event.isGoogleEvent) {
    return event.title;
  }
  
  // Per attività CRM
  if (event['Nome Lead']?.[0]) {
    return event['Nome Lead'][0];
  }
  if (event.Titolo) {
    return event.Titolo;
  }
  if (event.Obiettivo) {
    return event.Obiettivo;
  }
  return event.Tipo || 'Attività';
}

/**
 * Estrae il tipo di evento
 */
export function getEventType(event: CalendarEvent): string {
  if ('isGoogleEvent' in event && event.isGoogleEvent) {
    return 'Evento Google Calendar';
  }
  return event.Tipo || 'Attività';
}

/**
 * Estrae lo stato di un evento
 */
export function getEventStatus(event: CalendarEvent): string {
  if ('isGoogleEvent' in event && event.isGoogleEvent) {
    return 'Completato'; // Gli eventi Google Calendar sono sempre "completati"
  }
  return event.Stato || 'Pianificata';
}

/**
 * Estrae le note di un evento
 */
export function getEventNotes(event: CalendarEvent): string | undefined {
  if ('isGoogleEvent' in event && event.isGoogleEvent) {
    return event.description;
  }
  return event.Note;
}

/**
 * Determina se un evento è di Google Calendar
 */
export function isGoogleCalendarEvent(event: CalendarEvent): boolean {
  return 'isGoogleEvent' in event && event.isGoogleEvent === true;
}
