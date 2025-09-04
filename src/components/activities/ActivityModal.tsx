'use client';

import { useState, useEffect } from 'react';
import { ActivityData, ActivityFormData, ActivityType, ActivityStatus, ActivityPriority, ActivityObjective, ActivityOutcome, ActivityNextAction } from '@/types/activity';

interface ActivityModalProps {
  activity?: ActivityData | null;
  onClose: () => void;
  onSave: (activity: ActivityFormData) => void;
}

export function ActivityModal({ activity, onClose, onSave }: ActivityModalProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    tipo: ActivityType.CHIAMATA,
    stato: ActivityStatus.PIANIFICATA,
    priorita: ActivityPriority.MEDIA,
    data: new Date().toISOString().slice(0, 16), // Format for datetime-local input
    obiettivo: ActivityObjective.PRIMO_CONTATTO,
    idLead: '',
    durataStimata: 600 // 10 minutes default
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activity) {
      setFormData(prev => ({
        ...prev,
        titolo: activity.titolo,
        tipo: activity.tipo,
        stato: activity.stato,
        priorita: activity.priorita,
        data: activity.data.slice(0, 16), // Format for datetime-local
        durataStimata: activity.durataStimata,
        obiettivo: activity.obiettivo,
        idLead: activity.idLead[0] || '',
        ...(activity.esito ? { esito: activity.esito } : {}),
        ...(activity.assegnatario?.[0] ? { assegnatario: activity.assegnatario[0] } : {}),
        ...(activity.prossimaAzione ? { prossimaAzione: activity.prossimaAzione } : {}),
        ...(activity.dataProssimaAzione ? { dataProssimaAzione: activity.dataProssimaAzione.slice(0, 16) } : {}),
        ...(activity.note ? { note: activity.note } : {})
      }));
    }
  }, [activity]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.idLead) {
      newErrors.idLead = 'Lead è obbligatorio';
    }

    if (!formData.data) {
      newErrors.data = 'Data è obbligatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      onSave(formData);
    } catch (error) {
      console.error('Error saving activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ActivityFormData, value: any) => {
    setFormData(prev => {
      const next: ActivityFormData = { ...prev };

      const REQUIRED_FIELDS: (keyof ActivityFormData)[] = [
        'tipo', 'stato', 'priorita', 'data', 'obiettivo', 'idLead'
      ];

      const isEmpty = value === '' || value === null || typeof value === 'undefined';

      if (isEmpty) {
        if (REQUIRED_FIELDS.includes(field)) {
          // Per i campi required manteniamo il valore (può essere stringa vuota per input testo)
          (next as any)[field] = value as any;
        } else {
          // Rimuove i campi opzionali quando vuoti, evitando proprietà presenti con undefined
          delete (next as any)[field];
        }
      } else {
        (next as any)[field] = value as any;
      }

      return next;
    });

    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="relative w-full max-w-2xl transform rounded-lg bg-white p-6 shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {activity ? 'Modifica Attività' : 'Nuova Attività'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Titolo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titolo
                </label>
                <input
                  type="text"
                  value={formData.titolo || ''}
                  onChange={(e) => handleChange('titolo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-generato se vuoto"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => handleChange('tipo', e.target.value as ActivityType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(ActivityType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Stato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stato *
                </label>
                <select
                  value={formData.stato}
                  onChange={(e) => handleChange('stato', e.target.value as ActivityStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(ActivityStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Priorità */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorità *
                </label>
                <select
                  value={formData.priorita}
                  onChange={(e) => handleChange('priorita', e.target.value as ActivityPriority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(ActivityPriority).map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data e Ora *
                </label>
                <input
                  type="datetime-local"
                  value={formData.data}
                  onChange={(e) => handleChange('data', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.data ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.data && (
                  <p className="text-red-500 text-sm mt-1">{errors.data}</p>
                )}
              </div>

              {/* Lead */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead *
                </label>
                <input
                  type="text"
                  value={formData.idLead}
                  onChange={(e) => handleChange('idLead', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.idLead ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Seleziona o inserisci ID Lead"
                />
                {errors.idLead && (
                  <p className="text-red-500 text-sm mt-1">{errors.idLead}</p>
                )}
              </div>

              {/* Obiettivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Obiettivo *
                </label>
                <select
                  value={formData.obiettivo}
                  onChange={(e) => handleChange('obiettivo', e.target.value as ActivityObjective)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(ActivityObjective).map(objective => (
                    <option key={objective} value={objective}>{objective}</option>
                  ))}
                </select>
              </div>

              {/* Esito */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Esito
                </label>
                <select
                  value={formData.esito ?? ''}
                  onChange={(e) => handleChange('esito', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona esito...</option>
                  {Object.values(ActivityOutcome).map(outcome => (
                    <option key={outcome} value={outcome}>{outcome}</option>
                  ))}
                </select>
              </div>

              {/* Durata */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durata stimata (minuti)
                </label>
                <input
                  type="number"
                  value={formData.durataStimata ? Math.floor(formData.durataStimata / 60) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      handleChange('durataStimata', undefined);
                    } else {
                      handleChange('durataStimata', parseInt(val, 10) * 60);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="5"
                />
              </div>

              {/* Prossima Azione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prossima Azione
                </label>
                <select
                  value={formData.prossimaAzione ?? ''}
                  onChange={(e) => handleChange('prossimaAzione', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona azione...</option>
                  {Object.values(ActivityNextAction).map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              {/* Data Prossima Azione */}
              {formData.prossimaAzione && formData.prossimaAzione !== ActivityNextAction.NESSUNA && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Prossima Azione
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dataProssimaAzione || ''}
                    onChange={(e) => handleChange('dataProssimaAzione', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Note */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note
                </label>
                <textarea
                  value={formData.note || ''}
                  onChange={(e) => handleChange('note', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Aggiungi note per l'attività..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Salvando...' : activity ? 'Salva Modifiche' : 'Crea Attività'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
