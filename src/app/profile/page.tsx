'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  IconUser, 
  IconMail, 
  IconPhone, 
  IconCamera, 
  IconLoader2, 
  IconCheck, 
  IconAlertCircle, 
  IconUpload,
  IconTrash
} from '@tabler/icons-react';
import { isValidEmail } from '@/lib/auth';

interface UserProfile {
  nome: string;
  email: string;
  telefono?: string;
  avatar_url?: string;
  ruolo: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefono: ''
  });
  
  const [formErrors, setFormErrors] = useState<{
    nome?: string;
    email?: string;
    telefono?: string;
  }>({});

  // Carica profilo utente
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setProfile(data.profile);
        setFormData({
          nome: data.profile.nome || '',
          email: data.profile.email || '',
          telefono: data.profile.telefono || ''
        });
      } else {
        setError(data.error || 'Errore nel caricamento del profilo');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Valida form
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    
    if (!formData.nome.trim()) {
      errors.nome = 'Nome è richiesto';
    } else if (formData.nome.length < 2) {
      errors.nome = 'Nome deve essere di almeno 2 caratteri';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email è richiesta';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Email non valida';
    }
    
    if (formData.telefono && formData.telefono.length > 0 && formData.telefono.length < 8) {
      errors.telefono = 'Numero di telefono non valido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Gestisce cambio input
  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Rimuovi errore quando l'utente inizia a digitare
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Salva profilo
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setProfile(data.profile);
        setSuccessMessage(data.message);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Errore nell\'aggiornamento del profilo');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setIsUpdating(false);
    }
  };

  // Gestisce selezione file avatar
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validazioni file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo file non supportato. Usa JPG, PNG o WebP');
      return;
    }
    
    if (file.size > maxSize) {
      setError('File troppo grande. Massimo 5MB');
      return;
    }
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewAvatar(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Upload
    uploadAvatar(file);
  };

  // Upload avatar
  const uploadAvatar = async (file: File) => {
    setIsUploadingAvatar(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Avatar uploaded to Blob:', data.avatarUrl);
        
        // Aggiorna profilo con nuovo avatar
        const updateResponse = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avatar_url: data.avatarUrl })
        });
        
        const updateData = await updateResponse.json();
        console.log('Profile update response:', updateData);
        
        if (updateResponse.ok && updateData.success) {
          await fetchProfile(); // Ricarica profilo
          setPreviewAvatar(null);
          setSuccessMessage('Avatar aggiornato con successo!');
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          console.error('❌ Failed to update profile with avatar URL:', updateData);
          setError(updateData.error || 'Errore nel salvataggio dell\'avatar URL');
        }
      } else {
        setError(data.error || 'Errore nell\'upload dell\'avatar');
        setPreviewAvatar(null);
      }
    } catch (err) {
      setError('Errore di connessione durante l\'upload');
      setPreviewAvatar(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Rimuovi avatar
  const handleRemoveAvatar = async () => {
    setError(null);
    
    try {
      console.log('🗑️ Removing avatar, current URL:', profile?.avatar_url);
      
      // Se c'è un avatar, rimuovilo anche da Vercel Blob
      if (profile?.avatar_url) {
        console.log('📸 Calling DELETE API for avatar URL:', profile.avatar_url);
        
        const deleteResponse = await fetch(`/api/user/avatar?url=${encodeURIComponent(profile.avatar_url)}`, {
          method: 'DELETE'
        });
        
        const deleteData = await deleteResponse.json();
        console.log('🗑️ Delete response:', deleteData);
        
        if (!deleteResponse.ok) {
          console.warn('⚠️ Delete from Blob failed, but continuing...');
        }
      }
      
      // Aggiorna profilo per rimuovere l'URL
      console.log('💾 Updating profile to remove avatar URL...');
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ avatar_url: '' })
      });
      
      const updateData = await response.json();
      console.log('📝 Profile update response:', updateData);
      
      if (response.ok && updateData.success) {
        await fetchProfile();
        setSuccessMessage('Avatar rimosso con successo!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(updateData.error || 'Errore nell\'aggiornamento del profilo');
      }
    } catch (err) {
      console.error('❌ Error removing avatar:', err);
      setError('Errore nella rimozione dell\'avatar');
    }
  };

  // Loading state
  if (loading) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb pageName="Il mio profilo" />
          <div className="px-4 lg:px-6">
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Caricamento profilo...</span>
            </div>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  const getInitials = (nome: string) => {
    return nome.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Il mio profilo" />
        
        <div className="px-4 lg:px-6">
          {/* Header */}
          <div className="mb-8 text-left">
            <h1 className="text-3xl font-bold tracking-tight">Il mio profilo</h1>
            <p className="text-muted-foreground mt-2">
              Gestisci le tue informazioni personali e preferenze account
            </p>
          </div>
          
          <div className="max-w-7xl space-y-8">
            {/* Messages */}
            {successMessage && (
              <Alert className="max-w-4xl">
                <IconCheck className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="max-w-4xl">
                <IconAlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Desktop Layout: Two Column Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
              {/* Left Column: Avatar Section */}
              <div className="xl:col-span-2 flex">
                {/* Avatar Section */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconCamera className="h-5 w-5" />
                  Foto profilo
                </CardTitle>
                <CardDescription>
                  Carica un'immagine per personalizzare il tuo profilo (max 5MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col justify-between h-full">
                <div className="flex flex-col items-center xl:items-start space-y-6 flex-grow justify-center">
                  {/* Avatar Display */}
                  <div className="relative">
                    <Avatar className="h-28 w-28 xl:h-32 xl:w-32">
                      <AvatarImage 
                        src={previewAvatar || profile?.avatar_url} 
                        alt="Avatar"
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xl xl:text-2xl">
                        {profile?.nome ? getInitials(profile.nome) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {(isUploadingAvatar) && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <IconLoader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Avatar Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full xl:max-w-sm">
                    <Button 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="flex-1"
                    >
                      <IconUpload className="h-4 w-4 mr-2" />
                      Carica foto
                    </Button>
                    
                    {profile?.avatar_url && (
                      <Button 
                        variant="outline"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                        className="flex-1"
                      >
                        <IconTrash className="h-4 w-4 mr-2" />
                        Rimuovi
                      </Button>
                    )}
                  </div>
                  
                  {/* User Info Summary */}
                  <div className="text-center xl:text-left space-y-1 xl:max-w-sm">
                    <h3 className="font-semibold text-lg">{profile?.nome || 'Nome utente'}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {profile?.ruolo || 'Sales'} • Membro dal {new Date().getFullYear()}
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
              </div>
              
              {/* Right Column: Profile Form */}
              <div className="xl:col-span-3 flex">
                {/* Profile Form */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconUser className="h-5 w-5" />
                  Informazioni personali
                </CardTitle>
                <CardDescription>
                  Aggiorna le tue informazioni personali
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Form Grid: Two columns on desktop */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Nome */}
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input
                        id="nome"
                        type="text"
                        placeholder="Il tuo nome completo"
                        value={formData.nome}
                        onChange={handleInputChange('nome')}
                        className={formErrors.nome ? 'border-destructive' : ''}
                        disabled={isUpdating}
                      />
                      {formErrors.nome && (
                        <p className="text-sm text-destructive">{formErrors.nome}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Indirizzo email</Label>
                      <div className="relative">
                        <IconMail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tua-email@esempio.com"
                          value={formData.email}
                          onChange={handleInputChange('email')}
                          className={`pl-10 ${formErrors.email ? 'border-destructive' : ''}`}
                          disabled={isUpdating}
                        />
                      </div>
                      {formErrors.email && (
                        <p className="text-sm text-destructive">{formErrors.email}</p>
                      )}
                    </div>

                    {/* Telefono */}
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Numero di telefono</Label>
                      <div className="relative">
                        <IconPhone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="telefono"
                          type="tel"
                          placeholder="+39 123 456 7890"
                          value={formData.telefono}
                          onChange={handleInputChange('telefono')}
                          className={`pl-10 ${formErrors.telefono ? 'border-destructive' : ''}`}
                          disabled={isUpdating}
                        />
                      </div>
                      {formErrors.telefono && (
                        <p className="text-sm text-destructive">{formErrors.telefono}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Opzionale - Usato per notifiche importanti
                      </p>
                    </div>

                    {/* Ruolo (read-only) */}
                    <div className="space-y-2">
                      <Label>Ruolo aziendale</Label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-md">
                        <div className={`w-2 h-2 rounded-full ${
                          profile?.ruolo === 'Admin' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        <span className="font-medium">{profile?.ruolo || 'Sales'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Il ruolo viene assegnato dall'amministratore
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      type="submit" 
                      className="min-w-[200px]" 
                      disabled={isUpdating}
                      size="lg"
                    >
                      {isUpdating ? (
                        <>
                          <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando modifiche...
                        </>
                      ) : (
                        <>
                          <IconCheck className="mr-2 h-4 w-4" />
                          Salva modifiche
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}