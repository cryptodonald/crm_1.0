'use client';

import { useState, useEffect } from 'react';
import { ApiKeyData } from '@/lib/kv';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Calendar,
  Shield,
  Key,
  Copy,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';

interface CreateApiKeyData {
  name: string;
  value: string;
  service?: string;
  description?: string;
  permissions?: string[];
  expiresAt?: string;
  ipWhitelist?: string[];
}

interface UpdateApiKeyData {
  name?: string;
  value?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
  expiresAt?: string;
  ipWhitelist?: string[];
}

interface ApiKeysEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey?: ApiKeyData | null;
  onCreate: (data: CreateApiKeyData) => Promise<ApiKeyData | null>;
  onUpdate: (id: string, data: UpdateApiKeyData) => Promise<ApiKeyData | null>;
  loading?: boolean;
  className?: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'read', label: 'read', description: 'Visualizza dati e risorse' },
  { id: 'write', label: 'write', description: 'Crea e aggiorna risorse' },
  { id: 'delete', label: 'delete', description: 'Elimina risorse' },
  { id: 'admin', label: 'admin', description: 'Accesso amministrativo completo' },
];

export function ApiKeysEditDialog({
  open,
  onOpenChange,
  apiKey,
  onCreate,
  onUpdate,
  loading,
  className
}: ApiKeysEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    service: '',
    description: '',
    permissions: ['read'],
    isActive: true,
    expiresAt: '',
    ipWhitelist: [''],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingRealValue, setLoadingRealValue] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isEditing = Boolean(apiKey);

  // Reset form when dialog opens/closes or when apiKey changes
  useEffect(() => {
    if (open) {
      if (apiKey) {
        // Editing mode
        setFormData({
          name: apiKey.name,
          value: '', // Will be populated by fetching the real value
          service: apiKey.service || '',
          description: apiKey.description || '',
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresAt ? format(new Date(apiKey.expiresAt), 'yyyy-MM-dd') : '',
          ipWhitelist: apiKey.ipWhitelist?.length ? apiKey.ipWhitelist : [''],
        });
        setShowAdvanced(Boolean(apiKey.expiresAt || apiKey.ipWhitelist?.length));
      } else {
        // Creating mode
        setFormData({
          name: '',
          value: '',
          service: '',
          description: '',
          permissions: ['read'],
          isActive: true,
          expiresAt: '',
          ipWhitelist: [''],
        });
        setShowAdvanced(false);
      }
      setError(null);
      setCreatedKey(null);
      setCopied(false);
    }
  }, [open, apiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isEditing && apiKey) {
        // Update existing API key
        const updateData: UpdateApiKeyData = {
          name: formData.name,
          value: formData.value || undefined, // Include new value if provided
          description: formData.description || undefined,
          permissions: formData.permissions,
          isActive: formData.isActive,
          expiresAt: formData.expiresAt || undefined,
          ipWhitelist: formData.ipWhitelist.filter(ip => ip.trim()),
        };
        
        await onUpdate(apiKey.id, updateData);
      } else {
        // Create new API key
        const createData: CreateApiKeyData = {
          name: formData.name,
          value: formData.value,
          service: formData.service || undefined,
          description: formData.description || undefined,
          permissions: formData.permissions,
          expiresAt: formData.expiresAt || undefined,
          ipWhitelist: formData.ipWhitelist.filter(ip => ip.trim()),
        };
        
        const newKey = await onCreate(createData);
        if (newKey) {
          setCreatedKey(newKey.key);
          return; // Don't close dialog yet, show the key first
        }
      }
      
      // Close dialog on success (for editing, or if creation failed)
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleIpWhitelistChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.map((ip, i) => i === index ? value : ip)
    }));
  };

  const addIpWhitelistEntry = () => {
    setFormData(prev => ({
      ...prev,
      ipWhitelist: [...prev.ipWhitelist, '']
    }));
  };

  const removeIpWhitelistEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter((_, i) => i !== index)
    }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const loadCurrentValue = async () => {
    if (!apiKey) return;
    
    setLoadingRealValue(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/api-keys/${apiKey.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch API key value');
      }
      
      const data = await response.json();
      
      // Set the real value in the form (use fullValue to get decrypted key)
      setFormData(prev => ({ ...prev, value: data.fullValue || '' }));
    } catch (err: any) {
      setError(err.message || 'Failed to load current value');
    } finally {
      setLoadingRealValue(false);
    }
  };

  // If we just created a key, show the success view
  if (createdKey) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`max-w-md ${className || ''}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Chiave API creata con successo</span>
            </DialogTitle>
            <DialogDescription>
              La tua nuova chiave API è stata generata. Assicurati di copiarla ora, non potrai più visualizzarla.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">La tua chiave API:</p>
                  <div className="flex items-center space-x-2 p-2 bg-muted rounded">
                    <code className="flex-1 text-sm">{createdKey}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(createdKey)}
                      className="h-8 w-8 p-0"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-sm text-green-600">Copiato negli appunti!</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              Fatto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${className || ''}`}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>{isEditing ? 'Modifica Chiave API' : 'Crea Nuova Chiave API'}</span>
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Aggiorna le impostazioni della tua chiave API.'
                : 'Configura la tua nuova chiave API con i permessi e le impostazioni appropriate.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="es. Chiave API Airtable"
                  required
                />
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="value" className="flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <span>Valore Chiave API *</span>
                  </Label>
                  <Input
                    id="value"
                    type="password"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Incolla qui il valore effettivo della tua chiave API (es. patKEe4q8UeW13rVL...)"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Questo è il valore effettivo della chiave API che vuoi memorizzare in modo sicuro. Sarà crittografato nel database.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="service">Servizio/Categoria</Label>
                <Input
                  id="service"
                  value={formData.service}
                  onChange={(e) => setFormData(prev => ({ ...prev, service: e.target.value }))}
                  placeholder="es. airtable, stripe, openai, github"
                />
                <p className="text-xs text-muted-foreground">
                  Opzionale: Specifica il servizio per cui è questa chiave API (es. "airtable", "stripe", "openai"). Aiuta ad organizzare e filtrare le tue chiavi.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrizione opzionale di cosa viene utilizzata questa chiave"
                  rows={3}
                />
              </div>

              {isEditing && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="newValue" className="flex items-center space-x-2">
                        <Key className="h-4 w-4" />
                        <span>Aggiorna Valore Chiave API</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadCurrentValue}
                        disabled={loadingRealValue}
                        className="text-xs"
                      >
                        {loadingRealValue ? 'Caricamento...' : 'Mostra Valore Corrente'}
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="newValue"
                        type={showPassword ? "text" : "password"}
                        value={formData.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                        placeholder={formData.value ? 'Valore corrente caricato - modifica o cancella per mantenerlo invariato' : 'Lascia vuoto per mantenere il valore corrente, o incolla un nuovo valore'}
                        className="pr-10"
                      />
                      {formData.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? 'Nascondi valore' : 'Mostra valore'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.value 
                        ? 'Il valore corrente della chiave API è caricato sopra. Modificalo per cambiarlo, o cancella il campo per mantenere invariato il valore esistente.'
                        : 'Opzionale: Incolla un nuovo valore di chiave API per sostituire quello corrente. Clicca "Mostra Valore Corrente" per caricare e modificare il valore esistente.'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Attivo</Label>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Permissions */}
            <div className="space-y-3">
              <Label>Permessi *</Label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                    <Checkbox
                      id={permission.id}
                      checked={formData.permissions.includes(permission.id)}
                      onCheckedChange={() => handlePermissionToggle(permission.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={permission.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {permission.label}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {formData.permissions.length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Deve essere selezionato almeno un permesso.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Advanced Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Impostazioni Avanzate</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Nascondi' : 'Mostra'}
                </Button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  {/* Expiration Date */}
                  <div className="space-y-2">
                    <Label>Data di Scadenza</Label>
                    <DatePicker
                      date={formData.expiresAt ? new Date(formData.expiresAt) : undefined}
                      onSelect={(date) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          expiresAt: date ? format(date, 'yyyy-MM-dd') : '' 
                        }));
                      }}
                      placeholder="Seleziona data di scadenza"
                      minDate={new Date()}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lascia vuoto per nessuna scadenza
                    </p>
                  </div>

                  {/* IP Whitelist */}
                  <div className="space-y-2">
                    <Label>Lista IP Consentiti</Label>
                    <div className="space-y-2">
                      {formData.ipWhitelist.map((ip, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={ip}
                            onChange={(e) => handleIpWhitelistChange(index, e.target.value)}
                            placeholder="192.168.1.0/24 o 203.0.113.1"
                            className="flex-1"
                          />
                          {formData.ipWhitelist.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIpWhitelistEntry(index)}
                              className="h-9 w-9 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addIpWhitelistEntry}
                      >
                        Aggiungi Range IP
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Limita l'uso della chiave API a indirizzi o intervalli IP specifici. Lascia vuoto per nessuna restrizione.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || formData.permissions.length === 0 || !formData.name.trim() || (!isEditing && !formData.value.trim())}
            >
              {loading ? (
                isEditing ? 'Aggiornamento...' : 'Creazione...'
              ) : (
                isEditing ? 'Aggiorna Chiave API' : 'Crea Chiave API'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
