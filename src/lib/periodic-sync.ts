/**
 * 🚀 Enterprise Periodic Sync Manager
 * 
 * Gestisce la sincronizzazione periodica di tutti i dati del CRM
 * sostituendo i refresh multipli con un approccio centralizzato e professionale.
 * 
 * Pattern utilizzato da Salesforce, HubSpot, Pipedrive per evitare 
 * conflitti tra aggiornamenti ottimistici e refresh.
 */

import { toast } from 'sonner';

interface SyncConfig {
  interval: number; // milliseconds
  enabled: boolean;
  onError?: (error: Error, context: string) => void;
  onSuccess?: (context: string, duration: number) => void;
}

interface SyncTarget {
  id: string;
  name: string;
  refresh: (force?: boolean) => Promise<any>;
  enabled: boolean;
  lastSync?: Date;
  errors: number;
}

class PeriodicSyncManager {
  private targets: Map<string, SyncTarget> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private globalConfig: SyncConfig = {
    interval: 30000, // 30 seconds
    enabled: true,
  };
  private isDocumentVisible = true;
  private pausedDueToInactivity = false;

  constructor() {
    this.setupVisibilityHandling();
    this.setupNetworkHandling();
  }

  /**
   * 🎯 Registra un target per sync periodico
   */
  registerTarget(
    id: string,
    name: string,
    refresh: (force?: boolean) => Promise<any>,
    config?: Partial<SyncConfig>
  ): void {
    console.log(`🔄 [PeriodicSync] Registering target: ${name} (${id})`);
    
    this.targets.set(id, {
      id,
      name,
      refresh,
      enabled: true,
      errors: 0,
    });

    // Start sync if globally enabled
    if (this.globalConfig.enabled) {
      this.startTarget(id, config);
    }
  }

  /**
   * 🔥 Rimuove un target dal sync
   */
  unregisterTarget(id: string): void {
    console.log(`🗑️ [PeriodicSync] Unregistering target: ${id}`);
    
    this.stopTarget(id);
    this.targets.delete(id);
  }

  /**
   * ⚡ Avvia sync per un target specifico
   */
  private startTarget(id: string, config?: Partial<SyncConfig>): void {
    const target = this.targets.get(id);
    if (!target) return;

    const targetConfig = { ...this.globalConfig, ...config };
    
    console.log(`▶️ [PeriodicSync] Starting sync for ${target.name} (every ${targetConfig.interval / 1000}s)`);

    const intervalId = setInterval(async () => {
      await this.syncTarget(id, targetConfig);
    }, targetConfig.interval);

    this.intervals.set(id, intervalId);
  }

  /**
   * ⏹️ Ferma sync per un target specifico
   */
  private stopTarget(id: string): void {
    const intervalId = this.intervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
      console.log(`⏹️ [PeriodicSync] Stopped sync for target: ${id}`);
    }
  }

  /**
   * 🔄 Esegue sync per un target
   */
  private async syncTarget(id: string, config: SyncConfig): Promise<void> {
    const target = this.targets.get(id);
    if (!target || !target.enabled) return;

    // Skip se documento non visibile (performance optimization)
    if (!this.isDocumentVisible && !this.pausedDueToInactivity) {
      console.log(`⏸️ [PeriodicSync] Skipping ${target.name} - document not visible`);
      return;
    }

    const startTime = performance.now();
    
    try {
      console.log(`🔄 [PeriodicSync] Syncing ${target.name}...`);
      
      await target.refresh(true); // Force cache bypass
      
      const duration = performance.now() - startTime;
      target.lastSync = new Date();
      target.errors = 0; // Reset error count on success
      
      console.log(`✅ [PeriodicSync] ${target.name} synced successfully (${duration.toFixed(2)}ms)`);
      
      config.onSuccess?.(target.name, duration);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      target.errors++;
      
      console.error(`❌ [PeriodicSync] ${target.name} sync failed (${duration.toFixed(2)}ms):`, error);
      
      // Exponential backoff for failed targets
      if (target.errors >= 3) {
        console.warn(`⚠️ [PeriodicSync] ${target.name} has ${target.errors} consecutive errors - temporarily disabling`);
        target.enabled = false;
        
        // Re-enable after 2 minutes
        setTimeout(() => {
          target.enabled = true;
          target.errors = 0;
          console.log(`🔄 [PeriodicSync] Re-enabled ${target.name} after cooldown`);
        }, 120000);
      }
      
      config.onError?.(error as Error, target.name);
    }
  }

  /**
   * 🌐 Setup visibility handling per performance
   */
  private setupVisibilityHandling(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      this.isDocumentVisible = !document.hidden;
      
      if (this.isDocumentVisible) {
        console.log('👁️ [PeriodicSync] Document became visible - resuming normal sync');
        this.pausedDueToInactivity = false;
        
        // Immediate sync when becoming visible
        this.syncAllTargets();
      } else {
        console.log('👁️‍🗨️ [PeriodicSync] Document hidden - reducing sync frequency');
        this.pausedDueToInactivity = true;
      }
    });
  }

  /**
   * 🌐 Setup network handling
   */
  private setupNetworkHandling(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('🌐 [PeriodicSync] Network restored - immediate sync');
      this.syncAllTargets();
    });

    window.addEventListener('offline', () => {
      console.log('🌐 [PeriodicSync] Network lost - pausing sync');
    });
  }

  /**
   * 🔄 Sync immediato di tutti i target
   */
  private async syncAllTargets(): Promise<void> {
    const promises = Array.from(this.targets.keys()).map(id =>
      this.syncTarget(id, this.globalConfig)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * ⚙️ Configura sync globale
   */
  configure(config: Partial<SyncConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config };
    
    console.log(`⚙️ [PeriodicSync] Global config updated:`, {
      interval: this.globalConfig.interval / 1000 + 's',
      enabled: this.globalConfig.enabled,
    });

    // Riavvia tutti i target con nuova config
    if (this.globalConfig.enabled) {
      this.restartAll();
    } else {
      this.stopAll();
    }
  }

  /**
   * ▶️ Start all targets
   */
  startAll(): void {
    console.log('▶️ [PeriodicSync] Starting all targets');
    this.globalConfig.enabled = true;
    
    for (const [id] of this.targets) {
      this.startTarget(id);
    }
  }

  /**
   * ⏹️ Stop all targets
   */
  stopAll(): void {
    console.log('⏹️ [PeriodicSync] Stopping all targets');
    this.globalConfig.enabled = false;
    
    for (const [id] of this.intervals) {
      this.stopTarget(id);
    }
  }

  /**
   * 🔄 Restart all targets
   */
  private restartAll(): void {
    console.log('🔄 [PeriodicSync] Restarting all targets');
    
    this.stopAll();
    
    setTimeout(() => {
      this.startAll();
    }, 1000);
  }

  /**
   * 📊 Get sync statistics
   */
  getStats(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    lastSync?: Date;
    errors: number;
    isActive: boolean;
  }> {
    return Array.from(this.targets.entries()).map(([id, target]) => ({
      id,
      name: target.name,
      enabled: target.enabled,
      lastSync: target.lastSync,
      errors: target.errors,
      isActive: this.intervals.has(id),
    }));
  }

  /**
   * 🧹 Cleanup all resources
   */
  destroy(): void {
    console.log('🧹 [PeriodicSync] Destroying sync manager');
    
    this.stopAll();
    this.targets.clear();
  }
}

// Singleton instance
export const periodicSyncManager = new PeriodicSyncManager();

/**
 * 🎯 React Hook per registrare componenti al periodic sync
 */
export function usePeriodicSync(
  id: string,
  name: string,
  refresh: (force?: boolean) => Promise<any>,
  config?: Partial<SyncConfig>
) {
  React.useEffect(() => {
    periodicSyncManager.registerTarget(id, name, refresh, config);
    
    return () => {
      periodicSyncManager.unregisterTarget(id);
    };
  }, [id, name, refresh]);
}

// React import per hook
import React from 'react';

/**
 * 🛠️ Debug utilities
 */
export const debugPeriodicSync = {
  stats: () => periodicSyncManager.getStats(),
  configure: (config: Partial<SyncConfig>) => periodicSyncManager.configure(config),
  start: () => periodicSyncManager.startAll(),
  stop: () => periodicSyncManager.stopAll(),
};
