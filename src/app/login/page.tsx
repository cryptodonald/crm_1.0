'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconCommand, IconEye, IconEyeOff, IconLoader2, IconLock, IconMail } from '@tabler/icons-react';
import { useAuth } from '@/contexts/auth-context';
import { isValidEmail, isValidPassword } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect se già autenticato
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  // Se l'utente è già autenticato o stiamo caricando, non mostrare il form
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Il redirect avverrà tramite useEffect
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email è richiesta';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email non valida';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password è richiesta';
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = 'Password deve essere di almeno 6 caratteri';
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
    
    // Rimuovi errore quando l'utente inizia a digitare
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        setSuccessMessage(result.message || 'Login effettuato con successo!');
        
        // Redirect dopo breve delay per mostrare messaggio
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1500);
        
      } else {
        setErrors({
          general: result.error || 'Errore durante il login'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({
        general: 'Errore di connessione. Riprova.'
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight">CRM 1.0</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Accedi al tuo account per continuare
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Accedi</CardTitle>
            <CardDescription>
              Inserisci le tue credenziali per accedere al sistema
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

              {/* Success Message */}
              {successMessage && (
                <Alert variant="default" className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@azienda.com"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

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
                    disabled={isLoading}
                    autoComplete="current-password"
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
              </div>

              {/* Forgot Password Link */}
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Password dimenticata?
                </Link>
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
                    Accesso in corso...
                  </>
                ) : (
                  'Accedi'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p className="text-muted-foreground">
            Accesso riservato agli utenti autorizzati.
          </p>
          <p>© 2024 CRM 1.0. Tutti i diritti riservati.</p>
          <p>
            Problemi di accesso?{' '}
            <Link href="mailto:support@crm.com" className="text-primary hover:underline">
              Contatta il supporto
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}