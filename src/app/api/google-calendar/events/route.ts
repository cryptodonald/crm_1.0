import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth.config';
import { listCalendarEvents } from '@/lib/google-calendar';

/**
 * GET /api/google-calendar/events
 * Recupera gli eventi da Google Calendar dell'utente loggato
 * 
 * Query parameters:
 * - startDate: ISO string (default: inizio mese corrente)
 * - endDate: ISO string (default: fine mese corrente)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[GoogleCalendarEvents] Starting request');

    // Verifica sessione
    const session: any = await getServerSession(authConfig);
    if (!session?.googleAccessToken) {
      console.warn('[GoogleCalendarEvents] No Google session found');
      return NextResponse.json(
        { error: 'Not authenticated with Google Calendar' },
        { status: 401 }
      );
    }

    // Recupera parametri query
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');

    // Default: primo e ultimo giorno del mese corrente
    if (!startDate || !endDate) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      startDate = firstDay.toISOString();
      endDate = lastDay.toISOString();
    }

    console.log('[GoogleCalendarEvents] Fetching events:', { startDate, endDate });

    // Recupera il calendar ID primario
    const encryptedAccessToken = session.googleAccessToken as string;
    
    // Recupera gli eventi dal calendario
    const events = await listCalendarEvents(
      encryptedAccessToken,
      'primary', // Calendar ID primario
      startDate,
      endDate
    );

    console.log('[GoogleCalendarEvents] Found events:', events.length);

    // Trasforma gli eventi nel formato atteso dal calendario del CRM
    const transformedEvents = events.map(event => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: !event.start?.dateTime, // Se non ha ora, è all-day
      location: event.location,
      attendees: event.attendees,
      extendedProperties: event.extendedProperties,
      colorId: event.colorId,
      transparency: event.transparency,
    }));

    return NextResponse.json({
      success: true,
      events: transformedEvents,
      count: transformedEvents.length,
    });

  } catch (error) {
    console.error('[GoogleCalendarEvents] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Google Calendar events',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
