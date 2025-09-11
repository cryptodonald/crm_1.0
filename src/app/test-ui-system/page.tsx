/**
 * 🧪 Test UI System Clean - Pagina di Demo
 * 
 * Pagina dedicata per testare tutti i nuovi hook ottimizzati.
 * Accessibile via /test-ui-system
 */

import { UISystemDemo } from '@/components/ui-system-demo/UISystemDemo';

export default function TestUISystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <UISystemDemo />
    </div>
  );
}

export const metadata = {
  title: 'Test UI System Clean - CRM 1.0',
  description: 'Demo e test completo del nuovo sistema UI Clean ottimizzato',
};
