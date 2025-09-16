'use client';

import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  OrdersStats,
  OrdersStatsBreakdown,
  calculateOrdersStats,
} from '@/components/orders/orders-stats';
import { useOrdersList } from '@/hooks/use-orders-list';
import {
  ShoppingCart,
  Plus,
  FileText,
  Package,
  TrendingUp,
  Calendar,
  Eye,
  Edit,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';

export default function OrdersPage() {
  const { orders, loading, error, totalCount } = useOrdersList({
    pageSize: 10, // Solo per recent orders nella dashboard
  });

  // Calcola le statistiche dai dati caricati
  const stats = orders.length > 0 ? calculateOrdersStats(orders) : null;

  // Filtra gli ordini recenti (ultimi 5)
  const recentOrders = orders
    .sort((a, b) => {
      if (!a.Data_Ordine || !b.Data_Ordine) return 0;
      return new Date(b.Data_Ordine).getTime() - new Date(a.Data_Ordine).getTime();
    })
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Bozza': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Confermato': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'In_Produzione': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Spedito': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Consegnato': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Annullato': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Non_Pagato': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Pagamento_Parziale': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Pagato': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Rimborsato': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

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
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtri
                </Button>
                <Button asChild>
                  <Link href="/orders/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuovo Ordine
                  </Link>
                </Button>
              </div>
            </div>

            {/* Statistiche principali */}
            <OrdersStats 
              stats={stats} 
              loading={loading} 
              error={error} 
            />

            {/* Layout principale con tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Panoramica</TabsTrigger>
                <TabsTrigger value="breakdown">Analisi</TabsTrigger>
                <TabsTrigger value="recent">Ordini Recenti</TabsTrigger>
                <TabsTrigger value="quick-actions">Azioni Rapide</TabsTrigger>
              </TabsList>

              {/* Tab Overview */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Quick Actions Card */}
                  <Card className="md:col-span-2 lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Azioni Rapide
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button asChild className="w-full justify-start" variant="outline">
                        <Link href="/orders/list">
                          <FileText className="mr-2 h-4 w-4" />
                          Visualizza Tutti gli Ordini
                        </Link>
                      </Button>
                      
                      <Button asChild className="w-full justify-start" variant="outline">
                        <Link href="/orders/new">
                          <Plus className="mr-2 h-4 w-4" />
                          Crea Nuovo Ordine
                        </Link>
                      </Button>
                      
                      <Button asChild className="w-full justify-start" variant="outline">
                        <Link href="/orders/products">
                          <Package className="mr-2 h-4 w-4" />
                          Gestione Prodotti
                        </Link>
                      </Button>
                      
                      <Button asChild className="w-full justify-start" variant="outline">
                        <Link href="/orders/payments">
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Report Pagamenti
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Ordini da Gestire */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Calendar className="mr-2 h-5 w-5" />
                        Ordini da Gestire
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-3">
                              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {recentOrders.map((order, index) => (
                            <div key={order.ID_Ordine} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-300 text-sm font-medium">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    Ordine #{order.ID_Ordine}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {order.Cliente_Nome} • {formatCurrency(order.Totale_Finale || 0)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(order.Stato_Ordine || 'Bozza')}>
                                  {(order.Stato_Ordine || 'Bozza').replace('_', ' ')}
                                </Badge>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/orders/${order.ID_Ordine}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {recentOrders.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                              <p>Nessun ordine recente trovato</p>
                              <Button asChild className="mt-4" variant="outline">
                                <Link href="/orders/new">
                                  <Plus className="mr-2 h-4 w-4" />
                                  Crea il primo ordine
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab Breakdown */}
              <TabsContent value="breakdown" className="space-y-6">
                <OrdersStatsBreakdown stats={stats} />
              </TabsContent>

              {/* Tab Recent Orders */}
              <TabsContent value="recent" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Ordini Recenti</CardTitle>
                    <Button variant="outline" asChild>
                      <Link href="/orders/list">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Vedi Tutti
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                              <div className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentOrders.map((order) => (
                          <div key={order.ID_Ordine} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium">#{order.ID_Ordine}</p>
                                  <Badge className={getPaymentStatusColor(order.Stato_Pagamento || 'Non_Pagato')}>
                                    {(order.Stato_Pagamento || 'Non Pagato').replace('_', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {order.Cliente_Nome} • {order.Data_Ordine && format(parseISO(order.Data_Ordine), 'dd MMM yyyy', { locale: it })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-medium">
                                  {formatCurrency(order.Totale_Finale || 0)}
                                </p>
                                <Badge className={getStatusColor(order.Stato_Ordine || 'Bozza')}>
                                  {(order.Stato_Ordine || 'Bozza').replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/orders/${order.ID_Ordine}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link href={`/orders/${order.ID_Ordine}/edit`}>
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Quick Actions */}
              <TabsContent value="quick-actions" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                      <Plus className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                      <h3 className="font-semibold mb-2">Nuovo Ordine</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Crea un nuovo ordine per un cliente
                      </p>
                      <Button asChild className="w-full">
                        <Link href="/orders/new">Crea Ordine</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 transition-colors">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                      <Package className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                      <h3 className="font-semibold mb-2">Gestione Prodotti</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configura catalogo e prezzi
                      </p>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/orders/products">Gestisci Prodotti</Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                      <TrendingUp className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                      <h3 className="font-semibold mb-2">Report & Analytics</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Visualizza performance e commissioni
                      </p>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/orders/payments">Vedi Report</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
