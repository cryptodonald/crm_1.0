'use client';

import { TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { SourcePerformance } from '@/types/analytics';

interface AnalyticsChartsProps {
  data: SourcePerformance[];
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Prepare data for charts
  const chartData = data.map((source) => ({
    fonte: source.fonte,
    roi: source.roi,
    lead: source.totalLeads,
    qualificati: source.qualifiedLeads,
    vendite: source.sales,
    fatturato: source.totalRevenue / 1000, // In migliaia
  }));

  // Chart configs
  const roiChartConfig = {
    roi: {
      label: 'ROI',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  const funnelChartConfig = {
    lead: {
      label: 'Lead',
      color: 'hsl(var(--chart-1))',
    },
    qualificati: {
      label: 'Qualificati',
      color: 'hsl(var(--chart-2))',
    },
    vendite: {
      label: 'Vendite',
      color: 'hsl(var(--chart-3))',
    },
  } satisfies ChartConfig;

  const revenueChartConfig = {
    fatturato: {
      label: 'Fatturato (k€)',
      color: 'hsl(var(--chart-4))',
    },
  } satisfies ChartConfig;

  // Calculate total trend
  const totalROI = data.reduce((sum, s) => sum + s.roi, 0) / data.length;
  const totalRevenue = data.reduce((sum, s) => sum + s.totalRevenue, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ROI Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>ROI per Fonte</CardTitle>
          <CardDescription>Return on Investment per canale marketing</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={roiChartConfig} className="h-[250px]">
            <BarChart
              accessibilityLayer
              data={chartData.sort((a, b) => b.roi - a.roi)}
              layout="vertical"
              margin={{
                left: 20,
              }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="fonte"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <XAxis type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="roi" fill="var(--color-roi)" radius={5} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            ROI medio: {totalROI.toFixed(1)}%
            {totalROI > 0 && <TrendingUp className="h-4 w-4" />}
          </div>
          <div className="leading-none text-muted-foreground">
            Performance per canale marketing
          </div>
        </CardFooter>
      </Card>

      {/* Fatturato Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Fatturato per Fonte</CardTitle>
          <CardDescription>Revenue generato per canale</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueChartConfig} className="h-[250px]">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="fonte"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey="fatturato"
                type="natural"
                fill="var(--color-fatturato)"
                fillOpacity={0.4}
                stroke="var(--color-fatturato)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 font-medium leading-none">
                Fatturato totale: €{(totalRevenue / 1000).toFixed(1)}k
              </div>
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                Distribuzione per fonte lead
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Conversion Funnel - Stacked Area */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Funnel di Conversione</CardTitle>
          <CardDescription>
            Visualizzazione Lead → Qualificati → Vendite per fonte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={funnelChartConfig} className="h-[300px]">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="fonte"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="vendite"
                type="natural"
                fill="var(--color-vendite)"
                fillOpacity={0.4}
                stroke="var(--color-vendite)"
                stackId="a"
              />
              <Area
                dataKey="qualificati"
                type="natural"
                fill="var(--color-qualificati)"
                fillOpacity={0.4}
                stroke="var(--color-qualificati)"
                stackId="a"
              />
              <Area
                dataKey="lead"
                type="natural"
                fill="var(--color-lead)"
                fillOpacity={0.4}
                stroke="var(--color-lead)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                Stacked area chart mostra il volume totale per ogni fase del funnel
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
