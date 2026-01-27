'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Calendar, LogOut } from 'lucide-react';

export function GoogleCalendarConnect() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await signIn('google', {
        redirect: false,
        callbackUrl: '/developers/settings',
      });
    } catch (error) {
      console.error('[GoogleCalendar] Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await signOut({
        redirect: false,
        callbackUrl: '/developers/settings',
      });
    } catch (error) {
      console.error('[GoogleCalendar] Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="text-center py-4">Caricamento...</div>;
  }

  const isConnected = !!session?.googleAccessToken;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Google Calendar</h3>
          <p className="text-sm text-muted-foreground">
            {isConnected
              ? `Connesso come: ${session?.googleCalendarEmail}`
              : 'Collega il tuo Google Calendar per sincronizzare le attività'}
          </p>
        </div>
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>

      {!isConnected ? (
        <Button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Connessione in corso...' : 'Connetti Google Calendar'}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-green-600">Sincronizzazione attiva</p>
          <Button
            onClick={handleDisconnect}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            {isLoading ? 'Disconnessione...' : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Disconnetti
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
