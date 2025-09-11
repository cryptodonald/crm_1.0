/**
 * 🚀 Orders UI System Clean - Sistema ottimizzato per gestione ordini
 * 
 * Specializzato per l'API orders esistente che funziona con batch di IDs:
 * - Optimistic updates per operazioni immediate
 * - Queue API con retry automatici  
 * - Supporto per batch loading esistente
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  createUISystemClean, 
  createGenericAPI, 
  GenericUISystemUtils,
  type Entity 
} from '@/lib/ui-system-clean-generic';

// ===== ORDER ENTITY TYPE =====
interface Order extends Entity {
  id: string;
  createdTime?: string;
  Data?: string | null;
  Totale?: number | null;
  Stato?: string | null;
  Numero?: string | null;
  [key: string]: any; // Per supportare campi dinamici da Airtable
}

// ===== ORDER FORM DATA =====
interface OrderFormData {
  Data?: string;
  Totale?: number;
  Stato?: string;
  Numero?: string;
  [key: string]: any; // Per campi aggiuntivi
}

// ===== ORDERS API CLIENT =====
const ordersAPI = createGenericAPI<Order>({
  baseUrl: '/api/orders',
  entityName: 'orders',
  transform: {
    request: (data: any) => data,
    response: (data: any) => ({
      id: data.id,
      createdTime: data.createdTime,
      Data: data.Data || null,
      Totale: data.Totale ?? null,
      Stato: data.Stato || null,
      Numero: data.Numero || data['Numero Ordine'] || null,
      ...data, // Include tutti gli altri campi
    }),
  },
});

// ===== UI SYSTEM CLEAN INSTANCE =====
const ordersUISystem = createUISystemClean<Order>({
  retries: 2,
  timeout: 15000,
  showToasts: true,
  enableQueue: true,
  entityName: 'ordine',
  entityNamePlural: 'ordini'
});

// ===== HOOK PRINCIPALE =====
interface UseOrdersCleanProps {
  enableOptimistic?: boolean;
  autoFetch?: boolean;
  defaultIds?: string[]; // IDs iniziali da caricare
}

export function useOrdersClean({
  enableOptimistic = true,
  autoFetch = false, // Orders hanno bisogno di IDs specifici
  defaultIds = [],
}: UseOrdersCleanProps = {}) {
  
  // 📊 STATE
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersById, setOrdersById] = useState<Record<string, Order>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingOperations, setHasPendingOperations] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

  // 🔄 FETCH ORDERS BY IDS
  const fetchOrdersByIds = useCallback(async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Costruisci URL con parametri IDs per l'API esistente
      const url = new URL('/api/orders', window.location.origin);
      ids.forEach(id => url.searchParams.append('ids', id));
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.records) {
        const transformedOrders = data.records.map((order: any) => 
          ordersAPI.transform?.response ? ordersAPI.transform.response(order) : order
        );
        
        // Merge con ordini esistenti (evita duplicati)
        setOrders(prev => {
          const existingIds = new Set(prev.map(o => o.id));
          const newOrders = transformedOrders.filter((o: Order) => !existingIds.has(o.id));
          return [...prev, ...newOrders];
        });
        
        // Update ordersById
        setOrdersById(prev => {
          const updated = { ...prev };
          transformedOrders.forEach((order: Order) => {
            updated[order.id] = order;
          });
          return updated;
        });
        
        // Track loaded IDs
        setLoadedIds(prev => new Set([...prev, ...ids]));
        
      } else {
        throw new Error(data.error || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 OPTIMISTIC OPERATIONS
  const createOrder = useCallback(async (orderData: OrderFormData): Promise<Order | null> => {
    if (!enableOptimistic) {
      // Fallback tradizionale - Orders API normalmente è read-only
      console.warn('⚠️ Create order not implemented in traditional API');
      return null;
    }

    // 🚀 Optimistic creation
    const tempId = GenericUISystemUtils.generateTempId('order');
    const tempOrder: Order = {
      id: tempId,
      createdTime: new Date().toISOString(),
      Data: orderData.Data || new Date().toISOString().split('T')[0],
      Totale: orderData.Totale ?? null,
      Stato: orderData.Stato || 'Nuovo',
      Numero: orderData.Numero || `ORD-${Date.now()}`,
      ...orderData,
    };

    const success = await ordersUISystem.OptimisticManager.execute(
      {
        type: 'create',
        entity: 'orders',
        tempData: tempOrder,
      },
      {
        onUIUpdate: (newOrder) => {
          console.log('⚡ [OrdersClean] Adding optimistic order:', newOrder.id);
          setOrders(prev => GenericUISystemUtils.addItem(prev, newOrder));
          setOrdersById(prev => ({ ...prev, [newOrder.id]: newOrder }));
          setHasPendingOperations(true);
        },
        onRollback: (failedOrder) => {
          console.log('🔄 [OrdersClean] Rolling back failed order:', failedOrder.id);
          setOrders(prev => GenericUISystemUtils.removeItem(prev, failedOrder.id));
          setOrdersById(prev => {
            const { [failedOrder.id]: removed, ...rest } = prev;
            return rest;
          });
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const result = await ordersAPI.create(orderData);
          
          // 🔄 Replace temp with real data
          setOrders(prev => GenericUISystemUtils.replaceTempItem(prev, tempId, result));
          setOrdersById(prev => {
            const { [tempId]: temp, ...rest } = prev;
            return { ...rest, [result.id]: result };
          });
          
          // 🔄 Background refresh per questo ordine
          setTimeout(() => {
            fetchOrdersByIds([result.id]);
            setHasPendingOperations(false);
          }, 1000);
          
          return result;
        },
      },
      ordersUISystem.queueManager
    );

    return success ? tempOrder : null;
  }, [enableOptimistic, fetchOrdersByIds]);

  const updateOrder = useCallback(async (orderId: string, updates: Partial<OrderFormData>): Promise<boolean> => {
    if (!enableOptimistic) {
      // Fallback tradizionale
      try {
        await ordersAPI.update(orderId, updates);
        await fetchOrdersByIds([orderId]);
        return true;
      } catch (error) {
        console.error('❌ Update order failed:', error);
        return false;
      }
    }

    // 🚀 Optimistic update
    const currentOrder = orders.find(order => order.id === orderId);
    if (!currentOrder) return false;

    const updatedOrder: Order = { ...currentOrder, ...updates };

    const success = await ordersUISystem.OptimisticManager.execute(
      {
        type: 'update',
        entity: 'orders',
        tempData: updatedOrder,
        originalData: currentOrder,
      },
      {
        onUIUpdate: (updated) => {
          console.log('⚡ [OrdersClean] Updating optimistic order:', updated.id);
          setOrders(prev => GenericUISystemUtils.updateItem(prev, orderId, updates));
          setOrdersById(prev => ({ ...prev, [orderId]: updated }));
          setHasPendingOperations(true);
        },
        onRollback: (original) => {
          console.log('🔄 [OrdersClean] Rolling back failed update:', original.id);
          setOrders(prev => GenericUISystemUtils.updateItem(prev, orderId, original));
          setOrdersById(prev => ({ ...prev, [orderId]: original }));
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const result = await ordersAPI.update(orderId, updates);
          
          // 🔄 Background refresh
          setTimeout(() => {
            fetchOrdersByIds([orderId]);
            setHasPendingOperations(false);
          }, 1000);
          
          return result;
        },
      },
      ordersUISystem.queueManager
    );

    return success;
  }, [enableOptimistic, orders, fetchOrdersByIds]);

  const deleteOrder = useCallback(async (orderId: string): Promise<boolean> => {
    if (!enableOptimistic) {
      // Fallback tradizionale
      try {
        await ordersAPI.delete(orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setOrdersById(prev => {
          const { [orderId]: removed, ...rest } = prev;
          return rest;
        });
        return true;
      } catch (error) {
        console.error('❌ Delete order failed:', error);
        return false;
      }
    }

    // 🚀 Optimistic deletion
    const orderToDelete = orders.find(order => order.id === orderId);
    if (!orderToDelete) return false;

    const success = await ordersUISystem.OptimisticManager.execute(
      {
        type: 'delete',
        entity: 'orders',
        tempData: orderToDelete,
        originalData: orderToDelete,
      },
      {
        onUIUpdate: (deleted) => {
          console.log('⚡ [OrdersClean] Deleting optimistic order:', deleted.id);
          setOrders(prev => GenericUISystemUtils.removeItem(prev, orderId));
          setOrdersById(prev => {
            const { [orderId]: removed, ...rest } = prev;
            return rest;
          });
          setHasPendingOperations(true);
        },
        onRollback: (restored) => {
          console.log('🔄 [OrdersClean] Rolling back failed deletion:', restored.id);
          setOrders(prev => GenericUISystemUtils.addItem(prev, restored));
          setOrdersById(prev => ({ ...prev, [orderId]: restored }));
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          await ordersAPI.delete(orderId);
          
          // 🔄 Remove from loaded IDs
          setLoadedIds(prev => {
            const updated = new Set(prev);
            updated.delete(orderId);
            return updated;
          });
          setHasPendingOperations(false);
          
          return orderToDelete;
        },
      },
      ordersUISystem.queueManager
    );

    return success;
  }, [enableOptimistic, orders]);

  // 🔄 UTILITIES
  const loadOrders = useCallback(async (ids: string[]) => {
    const newIds = ids.filter(id => !loadedIds.has(id));
    if (newIds.length > 0) {
      await fetchOrdersByIds(newIds);
    }
  }, [loadedIds, fetchOrdersByIds]);

  const refresh = useCallback(async () => {
    setHasPendingOperations(false);
    const allIds = Array.from(loadedIds);
    if (allIds.length > 0) {
      // Reset loaded IDs e ricarica tutto
      setLoadedIds(new Set());
      await fetchOrdersByIds(allIds);
    }
  }, [loadedIds, fetchOrdersByIds]);

  const getOrdersByIds = useCallback((ids: string[]): Order[] => {
    return ids.map(id => ordersById[id]).filter(Boolean);
  }, [ordersById]);

  // 🏁 INITIAL FETCH
  useEffect(() => {
    if (autoFetch && defaultIds.length > 0) {
      fetchOrdersByIds(defaultIds);
    }
  }, [autoFetch, defaultIds, fetchOrdersByIds]);

  // 🎯 RETURN INTERFACE
  return {
    // 📊 Data
    orders,
    ordersById,
    loading,
    error,
    count: orders.length,
    success: !error,
    loadedIds: Array.from(loadedIds),
    
    // 🔄 Fetch methods (specific to orders API)
    fetchOrdersByIds,
    loadOrders,
    getOrdersByIds,
    refresh,
    
    // 🚀 NEW: Optimistic operations
    createOrder,
    updateOrder,
    deleteOrder,
    
    // 🎛️ System status
    hasPendingOperations,
    enableOptimistic,
    queueStatus: ordersUISystem.monitor.getQueueStatus(ordersUISystem.queueManager),
  };
}

// ===== UTILITIES =====
export const OrdersUISystemUtils = {
  ...GenericUISystemUtils,
  
  /**
   * Filter orders by status
   */
  filterOrdersByStatus: (orders: Order[], status: string): Order[] => {
    return orders.filter(order => order.Stato === status);
  },
  
  /**
   * Calculate total value of orders
   */
  calculateOrdersTotal: (orders: Order[]): number => {
    return orders.reduce((total, order) => total + (order.Totale || 0), 0);
  },
  
  /**
   * Sort orders by date
   */
  sortOrdersByDate: (orders: Order[], ascending = false): Order[] => {
    return [...orders].sort((a, b) => {
      const dateA = new Date(a.Data || a.createdTime || 0).getTime();
      const dateB = new Date(b.Data || b.createdTime || 0).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  },
  
  /**
   * Get order display number
   */
  getOrderDisplayNumber: (order: Order): string => {
    return order.Numero || `#${order.id.slice(-6)}`;
  },
};

console.log('🚀 Orders UI System Clean initialized');
