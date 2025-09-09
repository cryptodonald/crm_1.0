/**
 * 🚀 Sistema di Monitoring Performance Enterprise
 * 
 * Raccoglie metriche dettagliate per:
 * - Latenza API (percentili, medie, trending)
 * - Cache hit rates e performance
 * - Error rates e pattern
 * - User experience metrics
 * - Threshold alerts e anomaly detection
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'percent' | 'rate';
  timestamp: number;
  labels?: Record<string, string>;
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
}

export interface MetricSummary {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  recent: number[]; // Last 10 values for trending
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private thresholds: Map<string, { warning: number; error: number; critical: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isDev = process.env.NODE_ENV === 'development';
  
  constructor() {
    // 🎯 Configurazione thresholds di default
    this.setThresholds('lead_api_latency', {
      warning: 1500,  // 1.5s
      error: 3000,    // 3s  
      critical: 5000  // 5s
    });
    
    this.setThresholds('users_api_latency', {
      warning: 1000,  // 1s
      error: 2000,    // 2s
      critical: 3000  // 3s
    });
    
    this.setThresholds('cache_hit_rate', {
      warning: 80,    // 80%
      error: 60,      // 60%
      critical: 40    // 40%
    });
    
    this.setThresholds('error_rate', {
      warning: 5,     // 5%
      error: 10,      // 10%
      critical: 20    // 20%
    });

    // 🛡️ Avvia cleanup solo in produzione (evita interval leaks in dev)
    if (!this.isDev) {
      this.startCleanupInterval();
    }
  }

  /**
   * 🎯 Registra metrica di performance
   */
  recordMetric(
    name: string, 
    value: number, 
    unit: PerformanceMetric['unit'] = 'ms',
    labels: Record<string, string> = {}
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      labels,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Mantieni solo ultimi 1000 valori per metrica
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // Controlla soglie per alert
    this.checkThresholds(name, value);

    // Log ridotto in sviluppo per evitare spam
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      const formatted = this.formatMetric(metric);
      console.debug(`📊 [Perf] ${formatted}`);
    }
  }

  /**
   * ⚡ Helper specifici per metriche comuni
   */
  recordApiLatency(endpoint: string, latency: number, cached: boolean = false): void {
    this.recordMetric(`${endpoint}_latency`, latency, 'ms', {
      endpoint,
      cached: cached.toString(),
    });
  }

  recordCacheEvent(type: 'hit' | 'miss', service: string): void {
    this.recordMetric('cache_events', 1, 'count', {
      type,
      service,
    });
  }

  recordError(endpoint: string, errorType: string, statusCode?: number): void {
    this.recordMetric('api_errors', 1, 'count', {
      endpoint,
      errorType,
      statusCode: statusCode?.toString() || 'unknown',
    });
  }

  /**
   * 📈 Calcola statistiche aggregate
   */
  getMetricSummary(name: string, windowMinutes: number = 60): MetricSummary | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    const windowMs = windowMinutes * 60 * 1000;
    const cutoff = Date.now() - windowMs;
    const windowMetrics = metrics.filter(m => m.timestamp > cutoff);
    
    if (windowMetrics.length === 0) return null;

    const values = windowMetrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);
    
    const p50Index = Math.floor(values.length * 0.5);
    const p95Index = Math.floor(values.length * 0.95);
    const p99Index = Math.floor(values.length * 0.99);

    return {
      name,
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[p50Index] || 0,
      p95: values[p95Index] || 0,
      p99: values[p99Index] || 0,
      recent: values.slice(-10), // Ultimi 10 valori
    };
  }

  /**
   * 🔍 Calcola cache hit rate
   */
  getCacheStats(service?: string, windowMinutes: number = 60): {
    hitRate: number;
    totalEvents: number;
    hits: number;
    misses: number;
  } {
    const cacheEvents = this.metrics.get('cache_events') || [];
    const windowMs = windowMinutes * 60 * 1000;
    const cutoff = Date.now() - windowMs;
    
    let hits = 0;
    let misses = 0;
    
    cacheEvents
      .filter(m => m.timestamp > cutoff)
      .filter(m => !service || m.labels?.service === service)
      .forEach(m => {
        if (m.labels?.type === 'hit') hits++;
        if (m.labels?.type === 'miss') misses++;
      });

    const totalEvents = hits + misses;
    const hitRate = totalEvents > 0 ? (hits / totalEvents) * 100 : 0;

    return { hitRate, totalEvents, hits, misses };
  }

  /**
   * ⚠️ Gestione soglie e alert
   */
  setThresholds(metric: string, thresholds: { warning: number; error: number; critical: number }): void {
    this.thresholds.set(metric, thresholds);
  }

  private checkThresholds(metricName: string, value: number): void {
    const thresholds = this.thresholds.get(metricName);
    if (!thresholds) return;

    let severity: PerformanceAlert['severity'] | null = null;
    let threshold = 0;

    if (value >= thresholds.critical) {
      severity = 'critical';
      threshold = thresholds.critical;
    } else if (value >= thresholds.error) {
      severity = 'error';  
      threshold = thresholds.error;
    } else if (value >= thresholds.warning) {
      severity = 'warning';
      threshold = thresholds.warning;
    }

    if (severity) {
      const alert: PerformanceAlert = {
        id: `${metricName}_${Date.now()}`,
        metric: metricName,
        threshold,
        currentValue: value,
        severity,
        message: this.generateAlertMessage(metricName, value, threshold, severity),
        timestamp: Date.now(),
      };

      this.alerts.push(alert);
      
      // Mantieni solo ultimi 100 alert
      if (this.alerts.length > 100) {
        this.alerts.splice(0, this.alerts.length - 100);
      }

      // Log alert
      console.warn(`⚠️ [Perf-Alert] ${severity.toUpperCase()}: ${alert.message}`);
      
      // TODO: Implementare notifiche Slack/email per produzione
      if (severity === 'critical' && process.env.NODE_ENV === 'production') {
        this.sendCriticalAlert(alert);
      }
    }
  }

  private generateAlertMessage(metric: string, value: number, threshold: number, severity: string): string {
    const formatValue = (v: number) => {
      if (metric.includes('latency')) return `${v}ms`;
      if (metric.includes('rate')) return `${v.toFixed(1)}%`;
      return v.toString();
    };

    return `${metric} (${formatValue(value)}) exceeded ${severity} threshold (${formatValue(threshold)})`;
  }

  /**
   * 🚨 Sistema di alert critici (placeholder per produzione)
   */
  private async sendCriticalAlert(alert: PerformanceAlert): Promise<void> {
    // TODO: Implementare invio real-time
    // - Slack webhook
    // - Email notification 
    // - PagerDuty integration
    console.error(`🚨 CRITICAL ALERT: ${alert.message}`);
  }

  /**
   * 📊 Dashboard/Export data
   */
  getDashboardData(): {
    summary: Record<string, MetricSummary | null>;
    cacheStats: ReturnType<typeof this.getCacheStats>;
    recentAlerts: PerformanceAlert[];
    systemHealth: 'healthy' | 'degraded' | 'critical';
  } {
    const summary = {
      lead_api_latency: this.getMetricSummary('lead_api_latency'),
      users_api_latency: this.getMetricSummary('users_api_latency'),
      api_errors: this.getMetricSummary('api_errors'),
    };

    const cacheStats = this.getCacheStats();
    
    const recentAlerts = this.alerts
      .filter(a => a.timestamp > Date.now() - 60 * 60 * 1000) // Last hour
      .slice(-10);

    // Determina health generale
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical');
    const errorAlerts = recentAlerts.filter(a => a.severity === 'error');
    
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      systemHealth = 'critical';
    } else if (errorAlerts.length > 2) {
      systemHealth = 'degraded';
    }

    return {
      summary,
      cacheStats,
      recentAlerts,
      systemHealth,
    };
  }

  /**
   * 🔧 Controllo intervalli di cleanup
   */
  startCleanupInterval(): void {
    if (this.cleanupInterval) {
      console.debug('[Perf] Cleanup interval already running');
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 5 minuti

    if (this.isDev) {
      console.log('🧹 [Perf] Cleanup interval started (dev mode)');
    }
  }

  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      
      if (this.isDev) {
        console.log('🛑 [Perf] Cleanup interval stopped');
      }
    }
  }

  /**
   * 🧹 Cleanup dati vecchi
   */
  private cleanup(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 ore
    const cutoff = Date.now() - maxAge;

    // Pulisci metriche vecchie
    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }

    // Pulisci alert vecchi
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);

    // Log ridotto per evitare spam in development
    if (!this.isDev) {
      console.log(`🧹 [Perf] Cleanup completed - metrics: ${this.getMetricsCount()} alert: ${this.alerts.length}`);
    }
  }

  /**
   * 📝 Utility per formattazione
   */
  private formatMetric(metric: PerformanceMetric): string {
    const labels = metric.labels ? 
      Object.entries(metric.labels).map(([k, v]) => `${k}=${v}`).join(' ') : '';
    return `${metric.name}=${metric.value}${metric.unit} ${labels}`.trim();
  }

  private getMetricsCount(): number {
    return Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0);
  }

  /**
   * 🔍 Debug utilities
   */
  getDebugInfo(): any {
    return {
      metricsCount: this.getMetricsCount(),
      metricTypes: Array.from(this.metrics.keys()),
      alertsCount: this.alerts.length,
      thresholds: Object.fromEntries(this.thresholds),
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export conveniences
export const recordApiLatency = performanceMonitor.recordApiLatency.bind(performanceMonitor);
export const recordCacheEvent = performanceMonitor.recordCacheEvent.bind(performanceMonitor);
export const recordError = performanceMonitor.recordError.bind(performanceMonitor);

// 🔧 Export controlli per hot-reload e testing
export const startPerformanceMonitoring = performanceMonitor.startCleanupInterval.bind(performanceMonitor);
export const stopPerformanceMonitoring = performanceMonitor.stopCleanupInterval.bind(performanceMonitor);

/**
 * 🧼 Helper per sviluppo: riavvia monitoring se necessario
 * Utile in development per evitare interval leaks
 */
export const restartPerformanceMonitoring = (): void => {
  stopPerformanceMonitoring();
  startPerformanceMonitoring();
};

/**
 * 🧹 Helper per cleanup completo (test/shutdown)
 */
export const cleanupPerformanceIntervals = (): void => {
  stopPerformanceMonitoring();
  console.debug('[Perf] All intervals cleaned up');
};
