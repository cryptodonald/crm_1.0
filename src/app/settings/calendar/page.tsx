'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  RefreshCw,
  Plus,
  Unlink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  useGoogleAccounts,
  useGoogleCalendars,
  useCalendarSync,
} from '@/hooks/use-google-calendar';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CalendarSettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center gap-2 py-8 justify-center text-muted-foreground"><Loader2 className="size-4 animate-spin" />Caricamento...</div>}>
      <CalendarSettingsContent />
    </Suspense>
  );
}

function CalendarSettingsContent() {
  const searchParams = useSearchParams();
  const { accounts, isLoading: accountsLoading, mutate: mutateAccounts } = useGoogleAccounts();
  const { calendars, isLoading: calendarsLoading } = useGoogleCalendars();
  const { triggerSync, disconnectAccount, toggleCalendarVisibility, refreshCalendars } = useCalendarSync();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'connected') {
      toast.success('Account Google collegato con successo!');
      mutateAccounts();
    } else if (error) {
      const messages: Record<string, string> = {
        access_denied: 'Accesso negato. Riprova e accetta i permessi.',
        missing_params: 'Parametri mancanti. Riprova.',
        state_expired: 'La sessione è scaduta. Riprova.',
        invalid_state: 'Sessione non valida. Riprova.',
        connection_failed: 'Connessione fallita. Riprova.',
      };
      toast.error(messages[error] || 'Errore durante la connessione.');
    }
  }, [searchParams, mutateAccounts]);

  const handleConnect = () => {
    window.location.href = '/api/google-calendar/auth/connect';
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnectAccount(accountId);
      toast.success('Account disconnesso');
    } catch {
      toast.error('Errore nella disconnessione');
    }
  };

  const handleSync = async (accountId?: string) => {
    try {
      toast.info('Sincronizzazione in corso...');
      await triggerSync(accountId);
      toast.success('Sincronizzazione completata');
    } catch {
      toast.error('Errore nella sincronizzazione');
    }
  };

  const handleToggleCalendar = async (calendarId: string, visible: boolean) => {
    try {
      await toggleCalendarVisibility(calendarId, visible);
    } catch {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const handleRefreshCalendars = async (accountId: string) => {
    try {
      await refreshCalendars(accountId);
      toast.success('Lista calendari aggiornata');
    } catch {
      toast.error('Errore nell\'aggiornamento calendari');
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Google</CardTitle>
              <CardDescription>Collega i tuoi account Google per sincronizzare i calendari.</CardDescription>
            </div>
            <Button onClick={handleConnect} size="sm">
              <Plus className="mr-2 size-4" />
              Collega account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!mounted || accountsLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Caricamento...
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-4 text-sm text-muted-foreground">
              Nessun account Google collegato. Clicca &quot;Collega account&quot; per iniziare.
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <CalendarIcon className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">{account.google_email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {account.sync_status === 'idle' && account.last_sync_at && (
                          <>
                            <CheckCircle className="size-3 text-green-500" />
                            Ultima sync: {formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true, locale: it })}
                          </>
                        )}
                        {account.sync_status === 'syncing' && (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            Sincronizzazione in corso...
                          </>
                        )}
                        {account.sync_status === 'error' && (
                          <>
                            <AlertCircle className="size-3 text-red-500" />
                            Errore: {account.sync_error}
                          </>
                        )}
                        {account.sync_status === 'idle' && !account.last_sync_at && (
                          <span>Mai sincronizzato</span>
                        )}
                      </div>
                    </div>
                    {account.is_corporate && (
                      <Badge variant="secondary" className="ml-2">Aziendale</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(account.id)}
                      disabled={account.sync_status === 'syncing'}
                    >
                      <RefreshCw className={`mr-1 size-3 ${account.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                      Sync
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(account.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Unlink className="mr-1 size-3" />
                      Disconnetti
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendars */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calendari</CardTitle>
                <CardDescription>Scegli quali calendari visualizzare nella pagina Calendario.</CardDescription>
              </div>
              {accounts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshCalendars(accounts[0].id)}
                >
                  <RefreshCw className="mr-2 size-3" />
                  Aggiorna lista
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {calendarsLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Caricamento...
              </div>
            ) : calendars.length === 0 ? (
              <div className="py-4 text-sm text-muted-foreground">
                Nessun calendario trovato. Prova ad aggiornare la lista.
              </div>
            ) : (
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <div
                    key={cal.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: cal.color || '#4285F4' }}
                      />
                      <div>
                        <p className="text-sm font-medium">{cal.name}</p>
                        <div className="flex items-center gap-1.5">
                          {cal.is_primary && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Principale</Badge>
                          )}
                          {cal.is_writable && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Scrittura</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={cal.is_visible}
                      onCheckedChange={(checked) => handleToggleCalendar(cal.id, checked)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Info */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sincronizzazione</CardTitle>
            <CardDescription>La sincronizzazione automatica avviene ogni 15 minuti.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Sincronizzazione automatica</span>
                <Badge variant="outline">Ogni 15 min</Badge>
              </div>
              <Separator />
              <Button onClick={() => handleSync()} className="w-full">
                <RefreshCw className="mr-2 size-4" />
                Sincronizza ora tutti gli account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
