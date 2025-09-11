/**
 * 🐛 UI System Debug - Componente per debugging del nuovo sistema
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UISystemMonitor } from '@/lib/ui-system-clean';
import { RefreshCw, Bug, CheckCircle, AlertCircle } from 'lucide-react';

interface UISystemDebugProps {
  className?: string;
}

export const UISystemDebug: React.FC<UISystemDebugProps> = ({ className = '' }) => {
  const [stats, setStats] = useState(() => UISystemMonitor.getStats());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(UISystemMonitor.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-gray-900 text-white border-gray-700 hover:bg-gray-800"
        >
          <Bug className="w-4 h-4 mr-2" />
          Debug UI
        </Button>
      </div>
    );
  }

  const { queueStatus } = stats;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-80 bg-gray-900 text-white border-gray-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="w-4 h-4" />
              UI System Debug
            </CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Queue Status */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">API Queue</span>
              <Badge 
                variant={queueStatus.processing ? "default" : "secondary"}
                className="text-xs"
              >
                {queueStatus.processing ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Idle
                  </>
                )}
              </Badge>
            </div>
            <div className="text-xs text-gray-300">
              Queue Length: {queueStatus.queueLength}
            </div>
          </div>

          {/* Health Status */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">System Health</span>
              <Badge 
                variant={queueStatus.queueLength < 10 ? "secondary" : "destructive"}
                className="text-xs"
              >
                {queueStatus.queueLength < 10 ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Healthy
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Queue Overload
                  </>
                )}
              </Badge>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
            Last Update: {new Date(stats.timestamp).toLocaleTimeString()}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => setStats(UISystemMonitor.getStats())}
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                console.log('🐛 [UISystemDebug] Current stats:', stats);
                console.log('🐛 [UISystemDebug] Full queue status:', UISystemMonitor.getQueueStatus());
              }}
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
            >
              Log Stats
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UISystemDebug;
