'use client';

import { Card } from '@/components/ui/card';
import { Package } from 'lucide-react';

export function LeadOrdersMockPanel() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Package className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Ordini</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sezione da implementare
          </p>
        </div>
      </div>
    </Card>
  );
}
