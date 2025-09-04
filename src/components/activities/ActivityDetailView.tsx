'use client';

import { ActivityData, ActivityTypeConfig, ActivityStatusConfig, ActivityPriorityConfig, formatDuration, getActivityDateColor } from '@/types/activity';
import { formatDate } from '@/utils/dateUtils';

interface ActivityDetailViewProps {
  activity: ActivityData;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function ActivityDetailView({ activity, onEdit, onDelete, onBack }: ActivityDetailViewProps) {
  return (
    <div className=\"space-y-6\">
      {/* Header */}
      <div className=\"flex items-center justify-between\">
        <div className=\"flex items-center space-x-4\">
          <button
            onClick={onBack}
            className=\"flex items-center text-gray-500 hover:text-gray-700\"
          >
            <span className=\"mr-2\">←</span>
            Torna alle Attività
          </button>
          <div className=\"h-6 border-l border-gray-300\"></div>
          <h1 className=\"text-2xl font-bold text-gray-900\">{activity.titolo}</h1>
        </div>
        
        <div className=\"flex space-x-3\">
          <button
            onClick={onEdit}
            className=\"px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500\"
          >
            ✏️ Modifica
          </button>
          <button
            onClick={onDelete}
            className=\"px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500\"
          >
            🗑️ Elimina
          </button>
        </div>
      </div>

      {/* Status Badges */}
      <div className=\"flex flex-wrap gap-2\">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          ActivityStatusConfig[activity.stato]?.color || 'bg-gray-100 text-gray-800'
        }`}>
          <span className=\"mr-1\">{ActivityStatusConfig[activity.stato]?.icon}</span>
          {activity.stato}
        </span>
        
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          ActivityPriorityConfig[activity.priorita]?.color || 'bg-gray-100 text-gray-800'
        }`}>
          <span className=\"mr-1\">{ActivityPriorityConfig[activity.priorita]?.icon}</span>
          {activity.priorita}
        </span>

        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          ActivityTypeConfig[activity.tipo]?.color || 'bg-gray-100 text-gray-800'
        }`}>
          <span className=\"mr-1\">{ActivityTypeConfig[activity.tipo]?.icon}</span>
          {activity.tipo}
        </span>
      </div>

      {/* Main Content */}
      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
        {/* Left Column - Main Info */}
        <div className=\"lg:col-span-2 space-y-6\">
          
          {/* Basic Information */}
          <div className=\"bg-white rounded-lg shadow p-6\">
            <h2 className=\"text-lg font-semibold text-gray-900 mb-4\">Informazioni Principali</h2>
            
            <dl className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
              <div>
                <dt className=\"text-sm font-medium text-gray-500\">Data e Ora</dt>
                <dd className={`mt-1 text-sm ${getActivityDateColor(activity.data, activity.stato)}`}>
                  {formatDate(activity.data, { 
                    includeTime: true, 
                    format: 'dd MMMM yyyy, HH:mm'
                  })}
                </dd>
              </div>

              {activity.durataStimata && (
                <div>
                  <dt className=\"text-sm font-medium text-gray-500\">Durata Stimata</dt>
                  <dd className=\"mt-1 text-sm text-gray-900\">
                    {formatDuration(activity.durataStimata)}
                  </dd>
                </div>
              )}

              <div>
                <dt className=\"text-sm font-medium text-gray-500\">Obiettivo</dt>
                <dd className=\"mt-1 text-sm text-gray-900\">{activity.obiettivo}</dd>
              </div>

              {activity.esito && (
                <div>
                  <dt className=\"text-sm font-medium text-gray-500\">Esito</dt>
                  <dd className=\"mt-1 text-sm text-gray-900\">{activity.esito}</dd>
                </div>
              )}

              {activity.nomeLead?.[0] && (
                <div>
                  <dt className=\"text-sm font-medium text-gray-500\">Lead Collegato</dt>
                  <dd className=\"mt-1 text-sm text-blue-600 hover:text-blue-800\">
                    <a href={`/leads/${activity.idLead?.[0]}`}>
                      {activity.nomeLead[0]}
                    </a>
                  </dd>
                </div>
              )}

              {activity.nomeAssegnatario?.[0] && (
                <div>
                  <dt className=\"text-sm font-medium text-gray-500\">Assegnatario</dt>
                  <dd className=\"mt-1 text-sm text-gray-900\">{activity.nomeAssegnatario[0]}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Notes */}
          {activity.note && (
            <div className=\"bg-white rounded-lg shadow p-6\">
              <h2 className=\"text-lg font-semibold text-gray-900 mb-4\">Note</h2>
              <div className=\"prose max-w-none\">
                <p className=\"text-gray-700 whitespace-pre-wrap\">{activity.note}</p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {activity.allegati && activity.allegati.length > 0 && (
            <div className=\"bg-white rounded-lg shadow p-6\">
              <h2 className=\"text-lg font-semibold text-gray-900 mb-4\">Allegati</h2>
              <div className=\"space-y-2\">
                {activity.allegati.map((attachment, index) => (
                  <div key={index} className=\"flex items-center p-3 bg-gray-50 rounded-lg\">
                    <span className=\"mr-3 text-2xl\">📎</span>
                    <div className=\"flex-1\">
                      <p className=\"text-sm font-medium text-gray-900\">{attachment.filename}</p>
                      <p className=\"text-xs text-gray-500\">{(attachment.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <a
                      href={attachment.url}
                      target=\"_blank\"
                      rel=\"noopener noreferrer\"
                      className=\"text-blue-600 hover:text-blue-800 text-sm font-medium\"
                    >
                      Scarica
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Follow-up & Meta */}
        <div className=\"space-y-6\">
          
          {/* Follow-up */}
          {(activity.prossimaAzione || activity.dataProssimaAzione) && (
            <div className=\"bg-white rounded-lg shadow p-6\">
              <h2 className=\"text-lg font-semibold text-gray-900 mb-4\">Follow-up</h2>
              
              <div className=\"space-y-4\">
                {activity.prossimaAzione && (
                  <div>
                    <dt className=\"text-sm font-medium text-gray-500\">Prossima Azione</dt>
                    <dd className=\"mt-1\">
                      <span className=\"inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800\">
                        {activity.prossimaAzione}
                      </span>
                    </dd>
                  </div>
                )}

                {activity.dataProssimaAzione && (
                  <div>
                    <dt className=\"text-sm font-medium text-gray-500\">Data Prossima Azione</dt>
                    <dd className=\"mt-1 text-sm text-gray-900\">
                      {formatDate(activity.dataProssimaAzione, { 
                        includeTime: true, 
                        format: 'dd MMMM yyyy, HH:mm'
                      })}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className=\"bg-white rounded-lg shadow p-6\">
            <h2 className=\"text-lg font-semibold text-gray-900 mb-4\">Informazioni Sistema</h2>
            
            <dl className=\"space-y-4\">
              <div>
                <dt className=\"text-sm font-medium text-gray-500\">ID Attività</dt>
                <dd className=\"mt-1 text-sm font-mono text-gray-900\">{activity.id}</dd>
              </div>

              <div>
                <dt className=\"text-sm font-medium text-gray-500\">Creata il</dt>
                <dd className=\"mt-1 text-sm text-gray-900\">
                  {formatDate(activity.createdTime, { 
                    includeTime: true, 
                    format: 'dd MMMM yyyy, HH:mm'
                  })}
                </dd>
              </div>

              <div>
                <dt className=\"text-sm font-medium text-gray-500\">Ultima Modifica</dt>
                <dd className=\"mt-1 text-sm text-gray-900\">
                  {formatDate(activity.lastModifiedTime, { 
                    includeTime: true, 
                    format: 'dd MMMM yyyy, HH:mm'
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className=\"bg-white rounded-lg shadow p-6\">
            <h2 className=\"text-lg font-semibold text-gray-900 mb-4\">Azioni Rapide</h2>
            
            <div className=\"space-y-3\">
              <button className=\"w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200\">
                📞 Chiama Lead
              </button>
              <button className=\"w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200\">
                📧 Invia Email
              </button>
              <button className=\"w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200\">
                📝 Crea Follow-up
              </button>
              <button className=\"w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200\">
                📋 Duplica Attività
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
