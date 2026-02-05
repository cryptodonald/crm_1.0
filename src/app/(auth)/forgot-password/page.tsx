'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconArrowLeft, IconCommand, IconLoader2, IconMail } from '@tabler/icons-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Email obbligatoria');
      return;
    }

    if (!validateEmail(email)) {
      setError('Formato email non valido');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore durante la richiesta');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Errore imprevisto. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary text-primary-foreground flex aspect-square size-12 items-center justify-center rounded-lg">
                <IconCommand className="size-6" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">CRM 2.0</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Email Inviata</CardTitle>
              <CardDescription>
                Controlla la tua casella di posta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="default" className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  Se esiste un account con l'email <strong className="break-all">{email}</strong>, riceverai un link per reimpostare la password.
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>Il link è valido per 1 ora.</p>
                <p>Non hai ricevuto l'email? Controlla la cartella spam.</p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                <IconArrowLeft className="mr-2 h-4 w-4" />
                Torna al login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-foreground flex aspect-square size-12 items-center justify-center rounded-lg">
              <IconCommand className="size-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CRM 2.0</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Recupera l'accesso al tuo account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Password Dimenticata?</CardTitle>
            <CardDescription>
              Inserisci la tua email e ti invieremo un link per reimpostare la password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@azienda.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  'Invia link di reset'
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center"
                >
                  <IconArrowLeft className="mr-1 h-3 w-3" />
                  Torna al login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
