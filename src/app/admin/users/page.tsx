'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconUserPlus, IconLoader2, IconCheck, IconAlertCircle, IconUsers, IconMail, IconSettings } from '@tabler/icons-react';
import { isValidEmail } from '@/lib/auth';

// Email Configuration Component
function EmailConfigurationCard() {
  const [emailConfig, setEmailConfig] = useState<{
    hasApiKey: boolean;
    hasFromAddress: boolean;
    isEnabled: boolean;
  } | null>(null);
  const [currentValues, setCurrentValues] = useState<{
    fromAddress: string;
    enabled: boolean;
    apiKeyStatus: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null); // 'api_key' | 'from_address' | 'enabled'
  const [formData, setFormData] = useState({
    newApiKey: '',
    newFromAddress: '',
    newEnabled: false
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchEmailConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/email/config');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setEmailConfig(data.configuration.config);
      } else {
        setError(data.error || 'Errore nel caricamento configurazione email');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentValues = async () => {
    try {
      const response = await fetch('/api/admin/email/config', { method: 'PATCH' });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setCurrentValues(data.values);
        setFormData({
          newApiKey: '',
          newFromAddress: data.values.fromAddress,
          newEnabled: data.values.enabled
        });
      }
    } catch (err) {
      console.error('Error fetching current values:', err);
    }
  };

  useEffect(() => {
    fetchEmailConfig();
    fetchCurrentValues();
  }, []);

  const handleUpdate = async (action: string, payload: any) => {
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/email/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...payload })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccessMessage(data.message);
        setEmailConfig(data.configuration.config);
        setEditMode(null);
        await fetchCurrentValues();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Errore nell\'aggiornamento');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setIsUpdating(false);
    }
  };

  const startEdit = (mode: string) => {
    setEditMode(mode);
    setError(null);
    setSuccessMessage(null);
  };

  const cancelEdit = () => {
    setEditMode(null);
    setError(null);
    if (currentValues) {
      setFormData({
        newApiKey: '',
        newFromAddress: currentValues.fromAddress,
        newEnabled: currentValues.enabled
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconSettings className="h-5 w-5" />
            <CardTitle>Configurazione Email</CardTitle>
          </div>
          <CardDescription>
            Configurazioni per l'invio di email dal sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Caricamento configurazione...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconSettings className="h-5 w-5" />
            <CardTitle>Configurazione Email</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <IconAlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconSettings className="h-5 w-5" />
          <CardTitle>Configurazione Email</CardTitle>
        </div>
        <CardDescription>
          Gestisci le configurazioni per l'invio di email dal sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert>
            <IconCheck className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive">
            <IconAlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Configuration Cards */}
        <div className="space-y-4">
          {/* Resend API Key */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Resend API Key</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentValues?.apiKeyStatus || 'Caricamento...'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    emailConfig?.hasApiKey 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {emailConfig?.hasApiKey ? 'Configurata' : 'Mancante'}
                  </div>
                  {editMode !== 'api_key' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => startEdit('api_key')}
                      disabled={isUpdating}
                    >
                      Modifica
                    </Button>
                  )}
                </div>
              </div>
              
              {editMode === 'api_key' && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="newApiKey">Nuova API Key Resend</Label>
                    <Input
                      id="newApiKey"
                      type="password"
                      placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={formData.newApiKey}
                      onChange={(e) => setFormData({...formData, newApiKey: e.target.value})}
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Inserisci la tua API key Resend (deve iniziare con "re_")
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdate('update_api_key', { apiKey: formData.newApiKey })}
                      disabled={isUpdating || !formData.newApiKey.startsWith('re_')}
                    >
                      {isUpdating ? (
                        <><IconLoader2 className="h-3 w-3 animate-spin mr-1" />Salvando...</>
                      ) : (
                        'Salva'
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isUpdating}>
                      Annulla
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* FROM Address */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Indirizzo FROM</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentValues?.fromAddress || 'Caricamento...'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    emailConfig?.hasFromAddress 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {emailConfig?.hasFromAddress ? 'Configurato' : 'Mancante'}
                  </div>
                  {editMode !== 'from_address' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => startEdit('from_address')}
                      disabled={isUpdating}
                    >
                      Modifica
                    </Button>
                  )}
                </div>
              </div>
              
              {editMode === 'from_address' && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="newFromAddress">Indirizzo Email Mittente</Label>
                    <Input
                      id="newFromAddress"
                      type="email"
                      placeholder="CRM Sistema <noreply@tuodominio.com>"
                      value={formData.newFromAddress}
                      onChange={(e) => setFormData({...formData, newFromAddress: e.target.value})}
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deve essere un dominio verificato su Resend
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleUpdate('update_from_address', { fromAddress: formData.newFromAddress })}
                      disabled={isUpdating || !formData.newFromAddress.includes('@')}
                    >
                      {isUpdating ? (
                        <><IconLoader2 className="h-3 w-3 animate-spin mr-1" />Salvando...</>
                      ) : (
                        'Salva'
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isUpdating}>
                      Annulla
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Service Toggle */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Servizio Email</h4>
                  <p className="text-sm text-muted-foreground">
                    {emailConfig?.isEnabled ? 'Il servizio email è attivo' : 'Il servizio email è disabilitato'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    emailConfig?.isEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {emailConfig?.isEnabled ? 'Attivo' : 'Disabilitato'}
                  </div>
                  <Button 
                    size="sm" 
                    variant={emailConfig?.isEnabled ? 'destructive' : 'default'}
                    onClick={() => handleUpdate('toggle_enabled', { enabled: !emailConfig?.isEnabled })}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <><IconLoader2 className="h-3 w-3 animate-spin mr-1" />Aggiornando...</>
                    ) : (
                      emailConfig?.isEnabled ? 'Disabilita' : 'Abilita'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Sicurezza:</strong> Le configurazioni email sono archiviate in modo sicuro in Vercel KV. 
            Le API key non sono mai visualizzate per motivi di sicurezza.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [inviteForm, setInviteForm] = useState({
    nome: '',
    email: '',
    ruolo: 'Sales' as 'Admin' | 'Sales'
  });
  
  const [errors, setErrors] = useState<{
    nome?: string;
    email?: string;
    general?: string;
  }>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Controllo permessi admin
  if (!user || user.ruolo !== 'Admin') {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb pageName="Gestione Utenti" />
          <div className="px-4 lg:px-6">
            <div className="flex justify-center py-8">
              <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                  <IconAlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <CardTitle>Accesso Negato</CardTitle>
                  <CardDescription>
                    Solo gli amministratori possono accedere a questa sezione.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!inviteForm.nome.trim()) {
      newErrors.nome = 'Nome è richiesto';
    } else if (inviteForm.nome.length < 2) {
      newErrors.nome = 'Nome deve essere di almeno 2 caratteri';
    }
    
    if (!inviteForm.email.trim()) {
      newErrors.email = 'Email è richiesta';
    } else if (!isValidEmail(inviteForm.email)) {
      newErrors.email = 'Email non valida';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: 'nome' | 'email') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setInviteForm(prev => ({
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

  const handleRoleChange = (value: 'Admin' | 'Sales') => {
    setInviteForm(prev => ({
      ...prev,
      ruolo: value,
    }));
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setIsSuccess(true);
        setSuccessMessage(result.message || 'Invito inviato con successo!');
        setInviteForm({ nome: '', email: '', ruolo: 'Sales' });
        
        // Reset success state after 5 seconds
        setTimeout(() => {
          setIsSuccess(false);
          setSuccessMessage('');
        }, 5000);
      } else {
        setErrors({
          general: result.error || 'Errore durante l\'invito'
        });
      }
    } catch (error) {
      console.error('Invite error:', error);
      setErrors({
        general: 'Errore di connessione. Riprova.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Gestione Utenti" />
        
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  Gestione Utenti
                </h1>
                <p className="text-muted-foreground">
                  Invita nuovi utenti e gestisci gli accessi al CRM
                </p>
              </div>
            </div>

        <Tabs defaultValue="invite" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invite">Invita Utente</TabsTrigger>
            <TabsTrigger value="manage">Gestisci Utenti</TabsTrigger>
            <TabsTrigger value="config">Configurazioni</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invite">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IconUserPlus className="h-5 w-5" />
                  <CardTitle>Invita Nuovo Utente</CardTitle>
                </div>
                <CardDescription>
                  Invita un nuovo utente al CRM. Riceverà un'email per impostare la password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSuccess ? (
                  <Alert className="mb-4">
                    <IconCheck className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Invito inviato!</strong><br />
                      {successMessage}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleInviteSubmit} className="space-y-4">
                    {/* General Error */}
                    {errors.general && (
                      <Alert variant="destructive">
                        <AlertDescription>{errors.general}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name Field */}
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo</Label>
                        <Input
                          id="nome"
                          type="text"
                          placeholder="Es: Mario Rossi"
                          value={inviteForm.nome}
                          onChange={handleInputChange('nome')}
                          className={errors.nome ? 'border-destructive' : ''}
                          disabled={isLoading}
                        />
                        {errors.nome && (
                          <p className="text-sm text-destructive">{errors.nome}</p>
                        )}
                      </div>

                      {/* Email Field */}
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="mario.rossi@azienda.com"
                          value={inviteForm.email}
                          onChange={handleInputChange('email')}
                          className={errors.email ? 'border-destructive' : ''}
                          disabled={isLoading}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Role Field */}
                    <div className="space-y-2">
                      <Label htmlFor="ruolo">Ruolo</Label>
                      <Select value={inviteForm.ruolo} onValueChange={handleRoleChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona ruolo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales - Gestione lead e clienti</SelectItem>
                          <SelectItem value="Admin">Admin - Accesso completo</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Gli Admin possono invitare altri utenti e gestire il sistema
                      </p>
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
                          Inviando invito...
                        </>
                      ) : (
                        <>
                          <IconMail className="mr-2 h-4 w-4" />
                          Invia Invito
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>Utenti Registrati</CardTitle>
                <CardDescription>
                  Visualizza e gestisci gli utenti del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <IconUsers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Funzionalità in sviluppo</p>
                  <p className="text-sm">Presto sarà possibile visualizzare e gestire tutti gli utenti</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="config">
            <EmailConfigurationCard />
          </TabsContent>
        </Tabs>

            {/* Info Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Connesso come <strong>{user.nome}</strong> ({user.ruolo})</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
