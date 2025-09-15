'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconCommand, IconEye, IconEyeOff, IconLoader2, IconLock, IconCheck } from '@tabler/icons-react';
import { isValidPassword } from '@/lib/auth';

function ActivateAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenData, setTokenData] = useState<{ email: string; nome: string } | null>(null);

  // Verifica token all'avvio
  useEffect(() => {
    if (!token) {
      setErrors({
        general: 'Token di attivazione non valido o mancante.'
      });
      return;
    }

    // Simula verifica token (in realtà viene verificata quando si invia la password)
    // Per ora assumiamo sia valido
    console.log('Token presente:', token);
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!formData.password) {
      newErrors.password = 'Password è richiesta';
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = 'Password deve essere di almeno 6 caratteri';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Conferma password è richiesta';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Le password non corrispondono';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      return;
    }

    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      // Usa la stessa API di set-password ma con token di registrazione
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setIsSuccess(true);
        setSuccessMessage(result.message || 'Account attivato con successo!');
        setTokenData(result.user || { email: '', nome: 'Utente' });
        
        // Redirect al login dopo breve delay
        setTimeout(() => {
          router.push('/login?message=account-activated');
        }, 3000);
        
      } else {
        setErrors({
          general: result.error || 'Errore durante l\'attivazione dell\'account'
        });
      }
    } catch (error) {
      console.error('Account activation error:', error);
      setErrors({
        general: 'Errore di connessione. Riprova.'
      });
    } finally {
      setIsLoading(false);
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
            <h1 className="text-2xl font-bold tracking-tight text-green-600">Account Attivato!</h1>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-green-600">{successMessage}</p>
                {tokenData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                    <strong>🎉 Benvenuto, {tokenData.nome}!</strong>
                    <p className="mt-2">
                      Il tuo account è stato attivato con successo. Puoi ora accedere al sistema CRM.
                    </p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Sarai reindirizzato alla pagina di login tra pochi secondi...
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">Accedi Ora</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
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
          <h1 className="text-2xl font-bold tracking-tight">Attiva il tuo Account</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Imposta la tua password per completare la registrazione
          </p>
        </div>

        {/* Activation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Imposta Password</CardTitle>
            <CardDescription>
              Scegli una password sicura per il tuo nuovo account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* General Error */}
              {errors.general && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="La tua password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    disabled={isLoading || !token}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Minimo 6 caratteri
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <div className="relative">
                  <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Conferma la tua password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    disabled={isLoading || !token}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Attivazione...
                  </>
                ) : (
                  'Attiva Account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Hai già un account attivo?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Accedi qui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    }>
      <ActivateAccountContent />
    </Suspense>
  );
}