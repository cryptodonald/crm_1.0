'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Camera, Upload, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAvatarPath,
  getInitials,
  getAvatarFallbackColor,
} from '@/lib/avatar-utils';

interface AvatarLeadProps {
  /** Nome del lead */
  nome: string;
  /** Avatar personalizzato (se presente) */
  customAvatar?: string;
  /** Dimensione dell'avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Se l'utente è un admin */
  isAdmin?: boolean;
  /** Classe CSS aggiuntiva */
  className?: string;
  /** Se abilitare la modifica dell'avatar */
  editable?: boolean;
  /** Callback per il caricamento di un nuovo avatar */
  onAvatarUpload?: (file: File) => void;
  /** Callback per il reset dell'avatar al default */
  onAvatarReset?: () => void;
  /** Se mostrare il tooltip con informazioni */
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-16 w-16',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
  xl: 'h-5 w-5',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
};

export function AvatarLead({
  nome,
  customAvatar,
  size = 'lg',
  isAdmin = false,
  className,
  editable = false,
  onAvatarUpload,
  onAvatarReset,
  showTooltip = true,
}: AvatarLeadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Determina l'avatar da utilizzare
  const avatarSrc = customAvatar || getAvatarPath(nome, isAdmin);
  const initials = getInitials(nome);
  const fallbackColor = getAvatarFallbackColor(nome);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !onAvatarUpload) return;

    // Validazione del file
    if (!file.type.startsWith('image/')) {
      setUploadError('Seleziona un file immagine valido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      setUploadError('Il file è troppo grande (max 5MB)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await onAvatarUpload(file);
    } catch (error) {
      setUploadError('Errore durante il caricamento');
      console.error('Avatar upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    if (onAvatarReset) {
      onAvatarReset();
    }
  };

  const avatarElement = (
    <div className="group relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={avatarSrc} alt={nome} />
        <AvatarFallback
          className={cn(
            'font-medium text-white',
            fallbackColor,
            textSizeClasses[size]
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Overlay per editing (solo se editable) */}
      {editable && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex space-x-1">
            {/* Upload button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className={cn('h-auto p-1', iconSizeClasses[size])}
                    disabled={isUploading}
                    onClick={() =>
                      document.getElementById(`avatar-upload-${nome}`)?.click()
                    }
                  >
                    {isUploading ? (
                      <RefreshCw
                        className={cn('animate-spin', iconSizeClasses[size])}
                      />
                    ) : (
                      <Upload className={iconSizeClasses[size]} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Carica avatar personalizzato</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Reset button (solo se c'è un custom avatar) */}
            {customAvatar && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className={cn('h-auto p-1', iconSizeClasses[size])}
                      onClick={handleReset}
                    >
                      <RefreshCw className={iconSizeClasses[size]} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ripristina avatar predefinito</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      {editable && (
        <input
          id={`avatar-upload-${nome}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      )}
    </div>
  );

  // Se showTooltip è false o non è editable, restituisce solo l'avatar
  if (!showTooltip && !uploadError) {
    return avatarElement;
  }

  // Wrapper con tooltip informativo
  return (
    <TooltipProvider>
      <div>
        <Tooltip>
          <TooltipTrigger asChild>{avatarElement}</TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">{nome}</p>
              {customAvatar && (
                <p className="text-xs text-gray-500">Avatar personalizzato</p>
              )}
              {isAdmin && (
                <p className="text-xs text-red-500">Amministratore</p>
              )}
              {editable && (
                <p className="mt-1 text-xs text-gray-400">
                  Clicca per modificare
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Mostra errori se presenti */}
        {uploadError && (
          <div className="mt-1 text-xs text-red-500">{uploadError}</div>
        )}
      </div>
    </TooltipProvider>
  );
}
