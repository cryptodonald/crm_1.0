'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconEye, IconEyeOff, IconLoader2, IconLock, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { isValidPassword } from '@/lib/auth';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect se non autenticato
  if (!authLoading && !user) {
    router.push('/login');
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Password attuale è richiesta';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'Nuova password è richiesta';
    } else if (!isValidPassword(formData.newPassword)) {
      newErrors.newPassword = 'La nuova password deve essere di almeno 6 caratteri';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Conferma password è richiesta';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Le password non corrispondono';
    }

    if (formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'La nuova password deve essere diversa da quella attuale';
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
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setIsSuccess(true);
        setSuccessMessage(result.message || 'Password cambiata con successo!');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setErrors({
          general: result.error || 'Errore durante il cambio password'
        });
      }
    } catch (error) {
      console.error('Change password error:', error);
      setErrors({
        general: 'Errore di connessione. Riprova.'
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold tracking-tight text-green-600">Password Cambiata!</h1>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-green-600">{successMessage}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                  <strong>✅ Sicurezza aggiornata</strong>
                  <p className="mt-2">
                    La tua password è stata cambiata con successo. La sessione attuale rimane attiva.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsSuccess(false);
                      setSuccessMessage('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cambia di Nuovo
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/dashboard">Vai alla Dashboard</Link>
                  </Button>
                </div>
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
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Cambia Password</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Aggiorna la password del tuo account
          </p>
        </div>

        {/* Change Password Form */}
        <Card>
          <CardHeader>
            <CardTitle>Modifica Password</CardTitle>
            <CardDescription>
              Per la tua sicurezza, inserisci la password attuale e quella nuova
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

              {/* Current Password Field */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Attuale</Label>
                <div className="relative">
                  <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="La tua password attuale"
                    value={formData.currentPassword}
                    onChange={handleInputChange('currentPassword')}
                    className={`pl-10 pr-10 ${errors.currentPassword ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showCurrentPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-destructive">{errors.currentPassword}</p>
                )}
              </div>

              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova Password</Label>
                <div className="relative">
                  <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="La tua nuova password"
                    value={formData.newPassword}
                    onChange={handleInputChange('newPassword')}
                    className={`pl-10 pr-10 ${errors.newPassword ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showNewPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Minimo 6 caratteri
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
                <div className="relative">
                  <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Conferma la nuova password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    disabled={isLoading}
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
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aggiornamento...
                  </>
                ) : (
                  'Cambia Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* User Info */}
        {user && (
          <div className="text-center text-sm text-muted-foreground">
            <p>Stai modificando la password per: <strong>{user.nome}</strong></p>
            <p className="text-xs mt-1">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}