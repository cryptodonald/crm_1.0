'use client';

import { ApiKeyData } from '@/lib/kv';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Shield,
  Key,
  Copy,
  CheckCircle,
  Activity,
  MapPin,
  Clock,
  User
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useState } from 'react';

interface ApiKeyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey?: ApiKeyData | null;
  className?: string;
}

export function ApiKeyDetailsDialog({
  open,
  onOpenChange,
  apiKey,
  className
}: ApiKeyDetailsDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (apiKeyId: string) => {
    try {
      // Fetch the full API key value
      const response = await fetch(`/api/api-keys/${apiKeyId}`);
      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.fullValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  if (!apiKey) return null;

  const getStatusBadge = (apiKey: ApiKeyData) => {
    if (!apiKey.isActive) {
      return <Badge variant="secondary">Inattiva</Badge>;
    }
    
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return <Badge variant="destructive">Scaduta</Badge>;
    }
    
    if (apiKey.expiresAt) {
      const expiryDate = new Date(apiKey.expiresAt);
      const now = new Date();
      const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry <= 7) {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Scadenza</Badge>;
      }
    }
    
    return <Badge variant="default" className="bg-green-100 text-green-800">Attiva</Badge>;
  };

  const getPermissionsBadges = (permissions: string[]) => {
    const colors: { [key: string]: string } = {
      read: 'bg-blue-100 text-blue-800',
      write: 'bg-orange-100 text-orange-800',
      delete: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
    };

    const permissionLabels: { [key: string]: string } = {
      read: 'Lettura',
      write: 'Scrittura',
      delete: 'Eliminazione',
      admin: 'Amministratore',
    };

    return permissions.map((permission) => (
      <Badge
        key={permission}
        variant="secondary"
        className={`text-xs ${colors[permission] || 'bg-gray-100 text-gray-800'}`}
      >
        {permissionLabels[permission] || permission}
      </Badge>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${className || ''}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Dettagli Chiave API</span>
          </DialogTitle>
          <DialogDescription>
            Visualizza informazioni dettagliate sulla tua chiave API
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{apiKey.name}</h3>
              {getStatusBadge(apiKey)}
            </div>
            
            {apiKey.description && (
              <p className="text-muted-foreground">{apiKey.description}</p>
            )}
          </div>

          <Separator />

          {/* API Key Value */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Key className="h-4 w-4" />
              <span className="font-medium">Chiave API</span>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm font-mono">
                {(apiKey as any).keyPreview || (apiKey.key as string)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(apiKey.id)}
                className="h-8 w-8 p-0"
                title={copied ? 'Copiato!' : 'Copia Chiave API Completa'}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600">✓ Chiave API copiata negli appunti!</p>
            )}
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Permessi</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {getPermissionsBadges(apiKey.permissions)}
            </div>
          </div>

          <Separator />

          {/* Usage Statistics */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span className="font-medium">Utilizzo</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Richieste totali:</span>
                  <span className="text-sm font-medium">{apiKey.usageCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ultimo utilizzo:</span>
                  <span className="text-sm font-medium">
                    {apiKey.lastUsed 
                      ? formatDistanceToNow(new Date(apiKey.lastUsed), { addSuffix: true })
                      : 'Mai'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Date</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Creata:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(apiKey.createdAt), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Aggiornata:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(apiKey.updatedAt), 'dd MMM yyyy')}
                  </span>
                </div>
                {apiKey.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Scade:</span>
                    <span className="text-sm font-medium">
                      {format(new Date(apiKey.expiresAt), 'dd MMM yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* IP Whitelist */}
          {apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Lista IP Consentiti</span>
                </div>
                <div className="space-y-1">
                  {apiKey.ipWhitelist.map((ip, index) => (
                    <code key={index} className="block text-sm bg-muted px-2 py-1 rounded">
                      {ip}
                    </code>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Technical Details */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="font-medium">Dettagli Tecnici</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">ID Chiave:</span>
                <code className="block text-xs bg-muted px-2 py-1 rounded mt-1">
                  {apiKey.id}
                </code>
              </div>
              <div>
                <span className="text-muted-foreground">ID Utente:</span>
                <code className="block text-xs bg-muted px-2 py-1 rounded mt-1">
                  {apiKey.userId}
                </code>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
