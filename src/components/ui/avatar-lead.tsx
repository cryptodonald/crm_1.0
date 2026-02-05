'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getInitials,
  getAvatarFallbackColor,
  getAvatarPath,
  type Gender,
} from '@/lib/avatar-utils';

interface AvatarLeadProps {
  /** Nome del lead */
  nome: string;
  /** Avatar personalizzato (URL custom) */
  customAvatar?: string;
  /** Gender noto (male/female/unknown) per forzare avatar specifico */
  gender?: Gender;
  /** Se l'utente è admin */
  isAdmin?: boolean;
  /** Dimensione dell'avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Classe CSS aggiuntiva */
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-16 w-16 text-base',
};

export function AvatarLead({
  nome,
  customAvatar,
  gender,
  isAdmin = false,
  size = 'md',
  className,
}: AvatarLeadProps) {
  const initials = getInitials(nome);
  const fallbackColor = getAvatarFallbackColor(nome, gender);
  
  // Determina l'avatar da usare (priorità: custom > default basato su genere)
  const avatarSrc = customAvatar || getAvatarPath(nome, isAdmin, gender);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarSrc} alt={nome} />
      <AvatarFallback
        className={cn(
          'font-medium text-white',
          fallbackColor
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
