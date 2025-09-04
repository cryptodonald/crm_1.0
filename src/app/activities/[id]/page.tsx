'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ActivityData } from '@/types/activity';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activityId = params?.id as string;

  useEffect(() => {
    if (activityId) {
      loadActivity();
    }
  }, [activityId]);

  const loadActivity = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - same as in main page
      const mockActivity: ActivityData = {
        id: activityId,
        createdTime: '2025-08-30T15:18:37.000Z',
        lastModifiedTime: '2025-08-30T15:18:37.000Z',
        titolo: 'Chiamata - Maria Assunta Landi',
        tipo: 'Chiamata' as any,
        stato: 'Pianificata' as any,
        priorita: 'Alta' as any,
        data: '2025-09-02T15:18:34.652Z',
        durataStimata: 600,
        obiettivo: 'Primo contatto' as any,
        esito: undefined,
        idLead: ['recjrAD9cSuFi2k3X'],
        nomeLead: ['Maria Assunta Landi'],
        assegnatario: ['recUser123'],
        nomeAssegnatario: ['Marco Rossi'],
        prossimaAzione: 'Follow-up' as any,
        dataProssimaAzione: '2025-09-05T10:00:00.000Z',
        note: 'Primo contatto per presentazione servizi. Cliente interessato ai nostri prodotti premium.',
        allegati: []
      };
      
      setActivity(mockActivity);
    } catch (err) {
      console.error('Error loading activity:', err);
      setError('Errore nel caricamento dell\'attività');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // TODO: Open edit modal or navigate to edit page
    console.log('Edit activity:', activityId);
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa attività?')) {
      return;
    }
    
    try {
      // TODO: Implement delete API call
      console.log('Delete activity:', activityId);
      router.push('/activities');
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const handleBack = () => {
    router.push('/activities');
  };

  if (loading) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb 
            pageName="Dettaglio Attività" 
            previousPages={[
              { name: 'Attività', href: '/activities' }
            ]}
          />
          <div className="px-4 lg:px-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  if (error || !activity) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb 
            pageName="Dettaglio Attività" 
            previousPages={[
              { name: 'Attività', href: '/activities' }
            ]}
          />
          <div className="px-4 lg:px-6">
            <div className="text-center py-12">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold mb-2">
                {error || 'Attività non trovata'}
              </h2>
              <p className="text-gray-600 mb-4">
                L'attività richiesta non è disponibile o è stata eliminata.
              </p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Torna alle Attività
              </button>
            </div>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb 
          pageName={activity.titolo}
          previousPages={[
            { name: 'Attività', href: '/activities' }
          ]}
        />
        
        <div className="px-4 lg:px-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex items-center"
                >
                  ← Torna alle Attività
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">{activity.titolo}</h1>
              </div>
              
              <div className="flex space-x-3">
                <Button onClick={handleEdit} variant="outline">
                  ✏️ Modifica
                </Button>
                <Button onClick={handleDelete} variant="destructive">
                  🗑️ Elimina
                </Button>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                activity.stato === 'Completata' ? 'bg-green-100 text-green-800' :
                activity.stato === 'In corso' ? 'bg-yellow-100 text-yellow-800' :
                activity.stato === 'Pianificata' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {activity.stato}
              </span>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                activity.priorita === 'Urgente' ? 'bg-red-100 text-red-800' :
                activity.priorita === 'Alta' ? 'bg-orange-100 text-orange-800' :
                activity.priorita === 'Media' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {activity.priorita}
              </span>

              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {activity.tipo}
              </span>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Principali</h2>
                
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Data e Ora</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(activity.data).toLocaleString('it-IT')}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">Durata Stimata</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {activity.durataStimata ? Math.floor(activity.durataStimata / 60) + ' minuti' : 'N/A'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">Obiettivo</dt>
                    <dd className="mt-1 text-sm text-gray-900">{activity.obiettivo}</dd>
                  </div>

                  {activity.esito && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Esito</dt>
                      <dd className="mt-1 text-sm text-gray-900">{activity.esito}</dd>
                    </div>
                  )}

                  {activity.nomeLead?.[0] && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Lead Collegato</dt>
                      <dd className="mt-1 text-sm text-blue-600 hover:text-blue-800">
                        <a href={`/leads/${activity.idLead?.[0]}`}>
                          {activity.nomeLead[0]}
                        </a>
                      </dd>
                    </div>
                  )}

                  {activity.nomeAssegnatario?.[0] && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Assegnatario</dt>
                      <dd className="mt-1 text-sm text-gray-900">{activity.nomeAssegnatario[0]}</dd>
                    </div>
                  )}
                </dl>
              </Card>

              {/* Follow-up & Meta */}
              <div className="space-y-6">
                {/* Follow-up */}
                {(activity.prossimaAzione || activity.dataProssimaAzione) && (
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Follow-up</h2>
                    
                    <div className="space-y-4">
                      {activity.prossimaAzione && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Prossima Azione</dt>
                          <dd className="mt-1">
                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                              {activity.prossimaAzione}
                            </span>
                          </dd>
                        </div>
                      )}

                      {activity.dataProssimaAzione && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Data Prossima Azione</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date(activity.dataProssimaAzione).toLocaleString('it-IT')}
                          </dd>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Metadata */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Informazioni Sistema</h2>
                  
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ID Attività</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900">{activity.id}</dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Creata il</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(activity.createdTime).toLocaleString('it-IT')}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Ultima Modifica</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(activity.lastModifiedTime).toLocaleString('it-IT')}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </div>
            </div>

            {/* Notes */}
            {activity.note && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Note</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{activity.note}</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
