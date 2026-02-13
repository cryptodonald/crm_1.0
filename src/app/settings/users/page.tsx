'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  avatar_url: string | null;
  last_login: string | null;
}

const roleLabels: Record<string, string> = {
  admin: 'Amministratore',
  user: 'Utente',
  sales: 'Venditore',
  viewer: 'Visualizzatore',
};

const roleBadgeVariant: Record<string, 'primary' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'primary',
  user: 'secondary',
  sales: 'secondary',
  viewer: 'outline',
};

export default function UsersSettingsPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useSWR<{ users: UserRow[] }>('/api/users', fetcher, {
    revalidateOnFocus: false,
  });

  // Admin only
  if (session && session.user?.role !== 'admin') {
    redirect('/settings');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestione Utenti</CardTitle>
          <CardDescription>Visualizza e gestisci gli utenti del CRM.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Caricamento utenti...
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.users || []).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      {user.avatar_url && (
                        <AvatarImage src={user.avatar_url} alt={user.name} />
                      )}
                      <AvatarFallback className="text-sm font-semibold">
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={roleBadgeVariant[user.role] || 'secondary'}>
                      {roleLabels[user.role] || user.role}
                    </Badge>
                    {user.active ? (
                      <ShieldCheck className="size-4 text-green-500" />
                    ) : (
                      <ShieldAlert className="size-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
