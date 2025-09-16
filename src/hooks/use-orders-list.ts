import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Order, OrderFilters } from '@/types/orders';
import { useFetchWithRetry } from './use-fetch-with-retry';
import { toast } from 'sonner';

interface UseOrdersListProps {
  filters?: OrderFilters;
  refreshKey?: number;
  enableSmartCache?: boolean;
  enabled?: boolean;
}

interface UseOrdersListReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refresh: () => Promise<void>;
  createOrder: (data: any) => Promise<boolean>;
  updateOrder: (orderId: string, data: any) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  deleteMultipleOrders: (orderIds: string[]) => Promise<number>;
}

export function useOrdersList({ 
  filters = {}, 
  refreshKey,
  enableSmartCache = false,
  enabled = true
}: UseOrdersListProps = {}): UseOrdersListReturn {
  
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // 🔧 Stabilizza i filtri per evitare re-render loops
  const stableFilters = useMemo(() => {
    return {
      stato_ordine: filters.stato_ordine,
      stato_pagamento: filters.stato_pagamento,
      venditore_id: filters.venditore_id,
      data_da: filters.data_da,
      data_a: filters.data_a,
      importo_min: filters.importo_min,
      importo_max: filters.importo_max,
    };
  }, [
    filters?.stato_ordine && filters.stato_ordine.join(','),
    filters?.stato_pagamento && filters.stato_pagamento.join(','),
    filters?.venditore_id,
    filters?.data_da,
    filters?.data_a,
    filters?.importo_min,
    filters?.importo_max,
  ]);

  // 🚀 Sistema di fetch con retry automatico
  const fetchOrdersWithRetry = useFetchWithRetry(
    async () => {
      console.log('🔍 [useOrdersList] Fetching orders with filters:', stableFilters);

      // Costruisci query params
      const queryParams = new URLSearchParams();
      
      // Aggiungi filtri
      if (stableFilters.stato_ordine && stableFilters.stato_ordine.length > 0) {
        stableFilters.stato_ordine.forEach(stato => queryParams.append('stato_ordine', stato));
      }
      if (stableFilters.stato_pagamento && stableFilters.stato_pagamento.length > 0) {
        stableFilters.stato_pagamento.forEach(stato => queryParams.append('stato_pagamento', stato));
      }
      if (stableFilters.venditore_id) queryParams.set('venditore_id', stableFilters.venditore_id);
      if (stableFilters.data_da) queryParams.set('data_da', stableFilters.data_da);
      if (stableFilters.data_a) queryParams.set('data_a', stableFilters.data_a);
      if (stableFilters.importo_min !== undefined) queryParams.set('importo_min', stableFilters.importo_min.toString());
      if (stableFilters.importo_max !== undefined) queryParams.set('importo_max', stableFilters.importo_max.toString());
      
      // Sempre carica tutto per la lista
      queryParams.set('loadAll', 'true');
      queryParams.set('sortField', 'Data_Ordine');
      queryParams.set('sortDirection', 'desc');

      // 🎯 Smart cache vs always fresh
      console.log('🔍 [useOrdersList] Cache decision - enableSmartCache:', enableSmartCache);
      if (!enableSmartCache) {
        // ⚡ Cache busting per dati sempre freschi
        const cacheBuster = Date.now();
        queryParams.set('_t', cacheBuster.toString());
        queryParams.set('skipCache', 'true');
        queryParams.set('_forceRefresh', cacheBuster.toString());
        console.log('🚀 [useOrdersList] Cache busting enabled - forcing fresh data', {
          cacheBuster,
          skipCache: queryParams.get('skipCache'),
          _forceRefresh: queryParams.get('_forceRefresh'),
          url: `/api/orders?${queryParams.toString()}`
        });
      } else {
        console.log('🧠 [useOrdersList] Smart cache enabled');
      }

      const fetchUrl = `/api/orders?${queryParams.toString()}`;
      
      // 💥 EXTREME cache busting per non-smart cache
      const finalUrl = enableSmartCache 
        ? fetchUrl 
        : `${fetchUrl}&__cb=${Date.now()}&__r=${Math.random()}&__bust=${Date.now()}-${Math.random()}-${performance.now()}`;
      
      console.log('📡 [useOrdersList] Final URL:', finalUrl);
      
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
          'Pragma': 'no-cache', 
          'Expires': '0',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'If-None-Match': '*',
          'X-Debug-Source': 'useOrdersList-cache-bust',
          'X-Request-Time': Date.now().toString(),
          'X-Random-Buster': Math.random().toString(),
          'X-Cache-Buster': `${Date.now()}-${Math.random()}`,
        },
        cache: 'no-store',
        mode: 'cors',
        credentials: 'same-origin',
        redirect: 'follow'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Orders non trovati');
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.records) {
        throw new Error('Formato risposta non valido');
      }

      console.log(`✅ [useOrdersList] Loaded ${data.records.length} orders successfully`);
      return {
        records: data.records.map((record: any) => ({
          id: record.id,
          createdTime: record.createdTime,
          ...record.fields
        })),
        totalCount: data.records.length,
        fromCache: data.fromCache || false
      };
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      timeout: 20000,
      onRetry: (attempt, error) => {
        toast.warning(`Tentativo ${attempt} di ricaricamento ordini...`);
        console.warn(`⚠️ [useOrdersList] Retry ${attempt}:`, error.message);
      }
    }
  );

  // Sincronizza stato degli ordini con il fetch result
  useEffect(() => {
    if (fetchOrdersWithRetry.data) {
      setOrders(fetchOrdersWithRetry.data.records);
      setTotalCount(fetchOrdersWithRetry.data.totalCount);
      
      if (fetchOrdersWithRetry.data.fromCache) {
        console.log('⚡ [useOrdersList] Data served from cache');
      } else {
        console.log('🔄 [useOrdersList] Fresh data from server');
      }
    } else if (fetchOrdersWithRetry.error) {
      setOrders([]);
      setTotalCount(0);
    }
  }, [fetchOrdersWithRetry.data, fetchOrdersWithRetry.error]);

  // 🔧 Flag per determinare se l'hook è attivo
  const isDisabled = !enabled;

  // Trigger fetch when filters change or refreshKey changes
  useEffect(() => {
    if (!isDisabled) {
      fetchOrdersWithRetry.execute();
    }
  }, [stableFilters, refreshKey, isDisabled, fetchOrdersWithRetry]);

  // 🔄 Refresh function
  const refresh = useCallback(async () => {
    console.log('🔄 [useOrdersList] Manual refresh triggered');
    await fetchOrdersWithRetry.execute();
  }, [fetchOrdersWithRetry]);

  // 📝 Create order function
  const createOrder = useCallback(async (orderData: any): Promise<boolean> => {
    try {
      console.log('📝 [useOrdersList] Creating new order:', orderData);
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create order');
      }

      const newOrder = await response.json();
      
      // Add to local state
      setOrders(prevOrders => [
        {
          id: newOrder.id,
          createdTime: newOrder.createdTime,
          ...newOrder.fields
        },
        ...prevOrders
      ]);
      setTotalCount(prev => prev + 1);

      toast.success('Ordine creato con successo');
      console.log('✅ [useOrdersList] Order created successfully:', newOrder.id);
      
      return true;
    } catch (error) {
      console.error('❌ [useOrdersList] Error creating order:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante la creazione dell\'ordine');
      return false;
    }
  }, []);

  // ✏️ Update order function
  const updateOrder = useCallback(async (orderId: string, updates: any): Promise<boolean> => {
    try {
      console.log('✏️ [useOrdersList] Updating order:', orderId, updates);
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update order');
      }

      const updatedOrder = await response.json();
      
      // Update in local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, ...updatedOrder.fields }
            : order
        )
      );

      toast.success('Ordine aggiornato con successo');
      console.log('✅ [useOrdersList] Order updated successfully:', orderId);
      
      return true;
    } catch (error) {
      console.error('❌ [useOrdersList] Error updating order:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'aggiornamento dell\'ordine');
      return false;
    }
  }, []);

  // 🗑️ Delete single order function
  const deleteOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      console.log('🗑️ [useOrdersList] Deleting order:', orderId);
      
      const response = await fetch('/api/orders', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderIds: [orderId] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete order');
      }

      const result = await response.json();
      
      if (result.deletedCount > 0) {
        // Remove from local state
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        setTotalCount(prev => prev - 1);
        
        toast.success('Ordine eliminato con successo');
        console.log('✅ [useOrdersList] Order deleted successfully:', orderId);
        return true;
      } else {
        throw new Error('Nessun ordine eliminato');
      }
    } catch (error) {
      console.error('❌ [useOrdersList] Error deleting order:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'eliminazione dell\'ordine');
      return false;
    }
  }, []);

  // 🗑️ Delete multiple orders function
  const deleteMultipleOrders = useCallback(async (orderIds: string[]): Promise<number> => {
    try {
      console.log('🗑️ [useOrdersList] Deleting multiple orders:', orderIds.length);
      
      const response = await fetch('/api/orders', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete orders');
      }

      const result = await response.json();
      const deletedCount = result.deletedCount || 0;
      
      if (deletedCount > 0) {
        // Remove from local state
        setOrders(prevOrders => 
          prevOrders.filter(order => !result.deletedIds?.includes(order.id))
        );
        setTotalCount(prev => prev - deletedCount);
        
        toast.success(`${deletedCount} ordini eliminati con successo`);
        console.log('✅ [useOrdersList] Orders deleted successfully:', deletedCount);
      }
      
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} ordini non sono stati eliminati`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('❌ [useOrdersList] Error deleting multiple orders:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'eliminazione degli ordini');
      return 0;
    }
  }, []);

  return {
    orders,
    loading: fetchOrdersWithRetry.loading,
    error: fetchOrdersWithRetry.error?.message || null,
    totalCount,
    refresh,
    createOrder,
    updateOrder,
    deleteOrder,
    deleteMultipleOrders,
  };
}