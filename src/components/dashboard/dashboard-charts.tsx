'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LeadData } from '@/types/leads';
import { ActivityData } from '@/types/activities';

interface OrderData {
  id: string;
  Data?: string;
  'Totale Ordine'?: number;
  Stato?: string;
}

interface DashboardChartsProps {
  leads: LeadData[];
  orders: OrderData[];
  activities: ActivityData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function DashboardCharts({ leads, orders, activities }: DashboardChartsProps) {
  // Leads by status for pie chart
  const leadsByStatus = leads.reduce((acc, lead) => {
    const status = lead.Stato || 'Sconosciuto';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadsStatusData = Object.entries(leadsByStatus).map(([name, value]) => ({
    name,
    value,
  }));

  // Leads by source for pie chart
  const leadsBySource = leads.reduce((acc, lead) => {
    const source = lead.Provenienza || 'Sconosciuto';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadsSourceData = Object.entries(leadsBySource).map(([name, value]) => ({
    name,
    value,
  }));

  // Leads trend over last 30 days (bar chart)
  const getLeadsTrendData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const leadsByDay = last30Days.map(day => {
      const count = leads.filter(lead => {
        if (!lead.Data) return false;
        const leadDate = new Date(lead.Data).toISOString().split('T')[0];
        return leadDate === day;
      }).length;

      return {
        date: new Date(day).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        leads: count,
      };
    });

    return leadsByDay;
  };

  // Orders trend over last 30 days (line chart)
  const getOrdersTrendData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const ordersByDay = last30Days.map(day => {
      const dayOrders = orders.filter(order => {
        if (!order.Data) return false;
        const orderDate = new Date(order.Data).toISOString().split('T')[0];
        return orderDate === day;
      });

      const revenue = dayOrders.reduce((sum, order) => {
        return sum + (order['Totale Ordine'] || 0);
      }, 0);

      return {
        date: new Date(day).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        ordini: dayOrders.length,
        fatturato: Math.round(revenue),
      };
    });

    return ordersByDay;
  };

  // Activities by status (bar chart)
  const activitiesByStatus = activities.reduce((acc, activity) => {
    const status = activity.Stato || 'Sconosciuto';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activitiesStatusData = Object.entries(activitiesByStatus).map(([name, value]) => ({
    name,
    value,
  }));

  const leadsTrendData = getLeadsTrendData();
  const ordersTrendData = getOrdersTrendData();

  return (
    <div className="space-y-8">
      {/* Leads Trend - Main Chart */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Trend Lead</h3>
          <p className="text-xs text-muted-foreground">Ultimi 30 giorni</p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={leadsTrendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip />
            <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Orders Trend */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Trend Ordini e Fatturato</h3>
          <p className="text-xs text-muted-foreground">Ultimi 30 giorni</p>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={ordersTrendData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="ordini" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="fatturato" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
