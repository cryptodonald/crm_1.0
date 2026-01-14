'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ShoppingBag, Calendar, FileText, Settings, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export function DashboardQuickActions() {
  const actions = [
    {
      title: 'Nuovo Lead',
      description: 'Aggiungi un nuovo lead al sistema',
      icon: UserPlus,
      href: '/leads',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      title: 'Nuovo Ordine',
      description: 'Crea un nuovo ordine',
      icon: ShoppingBag,
      href: '/orders',
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
    },
    {
      title: 'Nuova Attività',
      description: 'Pianifica una nuova attività',
      icon: Calendar,
      href: '/activities',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
    },
    {
      title: 'Reports',
      description: 'Visualizza report dettagliati',
      icon: FileText,
      href: '/reports',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
    },
    {
      title: 'Gestione Prodotti',
      description: 'Gestisci il catalogo prodotti',
      icon: TrendingUp,
      href: '/products',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100',
    },
    {
      title: 'Impostazioni',
      description: 'Configura il sistema',
      icon: Settings,
      href: '/admin',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Azioni Rapide</CardTitle>
        <CardDescription>Accesso veloce alle funzioni principali</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href}>
                <Button
                  variant="outline"
                  className={`h-auto w-full flex-col items-start space-y-2 p-4 ${action.bgColor}`}
                >
                  <div className="flex w-full items-center space-x-3">
                    <div className={`rounded-lg p-2 ${action.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{action.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
