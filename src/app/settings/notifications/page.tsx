'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell } from 'lucide-react';

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifiche</CardTitle>
          <CardDescription>Gestisci le preferenze di notifica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Nuovi lead assegnati</Label>
              <p className="text-xs text-muted-foreground">Ricevi una notifica quando ti viene assegnato un nuovo lead.</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Attività in scadenza</Label>
              <p className="text-xs text-muted-foreground">Promemoria per attività con scadenza nelle prossime 24 ore.</p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Task completati</Label>
              <p className="text-xs text-muted-foreground">Notifica quando un task assegnato viene completato.</p>
            </div>
            <Switch disabled />
          </div>
          <Separator />
          <div className="rounded-lg border border-dashed p-4 text-center">
            <Bell className="mx-auto size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Le notifiche saranno disponibili nella prossima versione.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
