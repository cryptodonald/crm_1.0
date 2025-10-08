'use client';

import React from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrdersDataTable } from '@/components/orders/orders-data-table';
import {
  calculateOrdersStats,
} from '@/components/orders/orders-stats';
import { useOrdersList } from '@/hooks/use-orders-list';
import {
  ShoppingCart,
  Plus,
  TrendingUp,
  Calendar,
  Package,
} from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const { orders, loading, error, totalCount } = useOrdersList();

  // Calcola le statistiche dai dati caricati
  const stats = React.useMemo(() => {
    if (!orders || orders.length === 0) return null;
    try {
      return calculateOrdersStats(orders);
    } catch (error) {
      console.warn('Error calculating orders stats:', error);
      return null;
    }
  }, [orders]);

  // Le funzioni per colori e formattazione sono ora nel OrdersDataTable component

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Ordini" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header con azioni */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  Gestione Ordini
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitora e gestisci tutti gli ordini del sistema CRM
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button asChild>
                  <Link href="/orders/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuovo Ordine
                  </Link>
                </Button>
              </div>
            </div>

            {/* Statistiche principali */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                  <Package className="h-5 w-5" />
                  <span className="font-medium">Errore nel caricamento delle statistiche</span>
                </div>
                <p className="text-red-600 dark:text-red-300 mt-1 text-sm">{error}</p>
              </div>
            )}
            
            {loading && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2 h-8 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {stats && !loading && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Ordini Totali */}
                <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ordini Totali
                    </CardTitle>
                    <ShoppingCart className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.totale?.toLocaleString('it-IT') || '0'}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Tutti gli ordini nel sistema
                    </p>
                  </CardContent>
                </Card>

                {/* Ricavi Totali */}
                <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ricavi Totali
                    </CardTitle>
                    <TrendingUp className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(stats?.ricavoTotale || 0)}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Valore complessivo ordini
                    </p>
                  </CardContent>
                </Card>

                {/* Ordini in Elaborazione */}
                <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      In Elaborazione
                    </CardTitle>
                    <Package className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(stats?.byStato?.['Confermato'] || 0) + (stats?.byStato?.['In_Produzione'] || 0)}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Confermati e in produzione
                    </p>
                  </CardContent>
                </Card>

                {/* Ordini Completati */}
                <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ordini Completati
                    </CardTitle>
                    <Calendar className="text-muted-foreground h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.byStato?.['Consegnato'] || 0}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Consegnati con successo
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabella Ordini con Filtri - Stile identico ai Leads */}
            <OrdersDataTable 
              orders={orders || []} 
              loading={loading}
              totalCount={totalCount || 0}
            />
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
