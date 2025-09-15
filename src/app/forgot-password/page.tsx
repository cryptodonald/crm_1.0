'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconCommand, IconLoader2, IconMail, IconCheck } from '@tabler/icons-react';
import { isValidEmail } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (): boolean => {
    if (!email) {
      setError('Email è richiesta');
      return false;
    }

    if (!isValidEmail(email)) {
      setError('Email non valida');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setIsSuccess(true);
        setSuccessMessage(result.message || 'Email di reset inviata con successo!');
      } else {
        setError(result.error || 'Errore durante l\'invio dell\'email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500 text-white flex aspect-square size-12 items-center justify-center rounded-lg">
                <IconCheck className="size-6" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-green-600">Email Inviata!</h1>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-green-600">{successMessage}</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <strong>📧 Controlla la tua email</strong>
                  <p className="mt-2">
                    Abbiamo inviato un link per il reset della password a <strong>{email}</strong>
                  </p>
                  <p className="mt-2">
                    Se non ricevi l'email entro 5 minuti, controlla la cartella spam.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href="/login">Torna al Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>Non hai ricevuto l'email?{' '}
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                  setSuccessMessage('');
                }}
                className="text-primary hover:underline"
              >
                Riprova
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-foreground flex aspect-square size-12 items-center justify-center rounded-lg">
              <IconCommand className="size-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Password Dimenticata?</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Inserisci la tua email per ricevere il link di reset
          </p>
        </div>

        {/* Forgot Password Form */}
        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Ti invieremo un'email con le istruzioni per reimpostare la password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Indirizzo Email</Label>
                <div className="relative">
                  <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@azienda.com"
                    value={email}
                    onChange={handleEmailChange}
                    className={`pl-10 ${error ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  'Invia Link di Reset'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Ti sei ricordato la password?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Torna al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}