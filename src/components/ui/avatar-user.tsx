'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getInitials,
  getAvatarFallbackColor,
} from '@/lib/avatar-utils';

interface AvatarUserProps {
  /** Nome dell'utente */
  nome: string;
  /** Avatar personalizzato (URL custom dall'API) */
  avatarUrl?: string;
  /** Ruolo dell'utente (Admin, Developer, Sales, ecc.) */
  ruolo?: string;
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

export function AvatarUser({
  nome,
  avatarUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ruolo,
  size = 'md',
  className,
}: AvatarUserProps) {
  const initials = getInitials(nome);
  const fallbackColor = getAvatarFallbackColor(nome, 'unknown');

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={nome} />}
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
