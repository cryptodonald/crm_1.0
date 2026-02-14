'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SeoTrendDataPoint } from '@/types/seo-ads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SeoTrendChartProps {
  title: string;
  data: SeoTrendDataPoint[];
  /** Colore area (default: hsl(var(--primary))) */
  color?: string;
  /** Formatter per tooltip value */
  valueFormatter?: (value: number) => string;
  /** Altezza chart in px */
  height?: number;
  className?: string;
  loading?: boolean;
}

export function SeoTrendChart({
  title,
  data,
  color = 'hsl(var(--primary))',
  valueFormatter = (v) => v.toLocaleString('it-IT'),
  height = 250,
  className,
  loading = false,
}: SeoTrendChartProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div
            className="animate-pulse rounded bg-muted motion-reduce:animate-none"
            style={{ height }}
          />
        ) : data.length === 0 ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height }}
          >
            Nessun dato disponibile
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
              <AreaChart
                data={data}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {valueFormatter(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-${title})`}
                />
              </AreaChart>
            </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
