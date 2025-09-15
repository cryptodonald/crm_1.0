'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconUserX, IconArrowLeft } from '@tabler/icons-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <IconUserX className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Registrazione Chiusa</CardTitle>
          <CardDescription>
            La registrazione pubblica non è disponibile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Accesso solo su invito</strong><br/>
              La registrazione al CRM 1.0 è riservata agli utenti invitati dall'amministratore.
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Come ottenere l'accesso:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Contatta il tuo amministratore di sistema</li>
              <li>• Richiedi un invito via email</li>
              <li>• Attendi il link di attivazione</li>
            </ul>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Hai già ricevuto un invito?<br/>
            Controlla la tua email per il link di attivazione.
          </div>
          
          <Button asChild className="w-full">
            <Link href="/login">
              <IconArrowLeft className="mr-2 h-4 w-4" />
              Torna al Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
