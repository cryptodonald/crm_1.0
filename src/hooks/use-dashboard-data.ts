'use client';

import { useState, useEffect, useMemo } from 'react';
import { LeadData } from '@/types/leads';
import { ActivityData } from '@/types/activities';

interface OrderData {
  id: string;
  Data?: string;
  'Totale Ordine'?: number;
  Stato?: string;
  [key: string]: any;
}

interface DashboardData {
  leads: LeadData[];
  orders: OrderData[];
  activities: ActivityData[];
}

interface DashboardStats {
  // Leads
  totalLeads: number;
  newLeadsLast7Days: number;
  leadsContactedWithin48h: number;
  leadsQualificationRate: number;
  leadsConversionRate: number;
  
  // Orders
  totalOrders: number;
  ordersLast30Days: number;
  totalRevenue: number;
  averageOrderValue: number;
  
  // Activities
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  activitiesCompletionRate: number;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    leads: [],
    orders: [],
    activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch leads, orders, activities in parallel
        const [leadsRes, ordersRes, activitiesRes] = await Promise.all([
          fetch('/api/leads?loadAll=true'),
          fetch('/api/orders?loadAll=true'),
          fetch('/api/activities?loadAll=true'),
        ]);

        if (!leadsRes.ok || !ordersRes.ok || !activitiesRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const [leadsData, ordersData, activitiesData] = await Promise.all([
          leadsRes.json(),
          ordersRes.json(),
          activitiesRes.json(),
        ]);

        setData({
          leads: leadsData.records || leadsData.data || [],
          orders: ordersData.records || ordersData.data || [],
          activities: activitiesData.data || [],
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Calculate statistics
  const stats = useMemo<DashboardStats | null>(() => {
    if (!data.leads.length && !data.orders.length && !data.activities.length) {
      return null;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ===== LEADS STATS =====
    const totalLeads = data.leads.length;
    
    // New leads in last 7 days
    const newLeadsLast7Days = data.leads.filter(lead => {
      if (!lead.Data) return false;
      const leadDate = new Date(lead.Data);
      return leadDate >= sevenDaysAgo;
    }).length;

    // Leads contacted within 48h (with activities)
    const leadsWithActivitiesWithin48h = data.leads.filter(lead => {
      if (!lead.Data) return false;
      const leadCreationDate = new Date(lead.Data);
      const leadPlus48Hours = new Date(leadCreationDate.getTime() + 48 * 60 * 60 * 1000);

      return data.activities.some(activity => {
        const activityLeadIds = activity['ID Lead'] || [];
        const isLinkedToLead = activityLeadIds.includes(lead.id) || activityLeadIds.includes(lead.ID);
        
        if (!isLinkedToLead || !activity.Data) return false;
        
        const activityDate = new Date(activity.Data);
        return activityDate >= leadCreationDate && activityDate <= leadPlus48Hours;
      });
    }).length;

    const leadsContactedWithin48h = totalLeads > 0 
      ? Math.round((leadsWithActivitiesWithin48h / totalLeads) * 100) 
      : 0;

    // Lead qualification and conversion rates
    const qualifiedLeads = data.leads.filter(l => l.Stato === 'Qualificato').length;
    const convertedLeads = data.leads.filter(l => l.Stato === 'Cliente').length;
    
    const leadsQualificationRate = totalLeads > 0 
      ? Math.round((qualifiedLeads / totalLeads) * 100) 
      : 0;
    const leadsConversionRate = totalLeads > 0 
      ? Math.round((convertedLeads / totalLeads) * 100) 
      : 0;

    // ===== ORDERS STATS =====
    const totalOrders = data.orders.length;
    
    // Orders in last 30 days
    const ordersLast30Days = data.orders.filter(order => {
      if (!order.Data) return false;
      const orderDate = new Date(order.Data);
      return orderDate >= thirtyDaysAgo;
    }).length;

    // Revenue calculations
    const totalRevenue = data.orders.reduce((sum, order) => {
      const total = order['Totale Ordine'] || 0;
      return sum + (typeof total === 'number' ? total : 0);
    }, 0);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // ===== ACTIVITIES STATS =====
    const totalActivities = data.activities.length;
    const completedActivities = data.activities.filter(
      a => a.Stato === 'Completata'
    ).length;
    const pendingActivities = data.activities.filter(
      a => a.Stato !== 'Completata'
    ).length;
    
    const activitiesCompletionRate = totalActivities > 0 
      ? Math.round((completedActivities / totalActivities) * 100) 
      : 0;

    return {
      // Leads
      totalLeads,
      newLeadsLast7Days,
      leadsContactedWithin48h,
      leadsQualificationRate,
      leadsConversionRate,
      
      // Orders
      totalOrders,
      ordersLast30Days,
      totalRevenue,
      averageOrderValue,
      
      // Activities
      totalActivities,
      completedActivities,
      pendingActivities,
      activitiesCompletionRate,
    };
  }, [data]);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const [leadsRes, ordersRes, activitiesRes] = await Promise.all([
        fetch('/api/leads?loadAll=true'),
        fetch('/api/orders?loadAll=true'),
        fetch('/api/activities?loadAll=true'),
      ]);

      if (!leadsRes.ok || !ordersRes.ok || !activitiesRes.ok) {
        throw new Error('Failed to refresh dashboard data');
      }

      const [leadsData, ordersData, activitiesData] = await Promise.all([
        leadsRes.json(),
        ordersRes.json(),
        activitiesRes.json(),
      ]);

      setData({
        leads: leadsData.records || leadsData.data || [],
        orders: ordersData.records || ordersData.data || [],
        activities: activitiesData.data || [],
      });
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    stats,
    loading,
    error,
    refresh,
  };
}
