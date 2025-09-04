'use client';

import { useState } from 'react';
import { ActivityData } from '@/types/activity';
import { TableContainer } from '@/components/leads/TableContainer';
import { ActivityTableRow } from './ActivityTableRow';

interface ActivityTableProps {
  activities: ActivityData[];
  loading?: boolean;
  selectedActivities: string[];
  onSelectionChange: (selected: string[]) => void;
  onActivityEdit: (activity: ActivityData) => void;
  onActivityDelete: (id: string) => void;
  onBulkAction: (action: string, ids: string[]) => void;
  visibleColumns: string[];
}

export function ActivityTable({
  activities,
  loading = false,
  selectedActivities,
  onSelectionChange,
  onActivityEdit,
  onActivityDelete,
  onBulkAction,
  visibleColumns
}: ActivityTableProps) {

  const handleSelectAll = () => {
    if (selectedActivities.length === activities.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(activities.map(activity => activity.id));
    }
  };

  const handleSelectActivity = (activityId: string) => {
    if (selectedActivities.includes(activityId)) {
      onSelectionChange(selectedActivities.filter(id => id !== activityId));
    } else {
      onSelectionChange([...selectedActivities, activityId]);
    }
  };

  const columns = [
    {
      key: 'cliente',
      label: 'Cliente',
      visible: visibleColumns.includes('cliente'),
      sortable: true
    },
    {
      key: 'data',
      label: 'Data',
      visible: visibleColumns.includes('data'),
      sortable: true
    },
    {
      key: 'obiettivi',
      label: 'Obiettivi',
      visible: visibleColumns.includes('obiettivi'),
      sortable: false
    },
    {
      key: 'assegnatario',
      label: 'Assegnatario',
      visible: visibleColumns.includes('assegnatario'),
      sortable: true
    },
    {
      key: 'followup',
      label: 'Follow-up',
      visible: visibleColumns.includes('followup'),
      sortable: true
    },
    {
      key: 'documenti',
      label: 'Documenti',
      visible: visibleColumns.includes('documenti'),
      sortable: false
    }
  ];

  const bulkActions = [
    {
      key: 'details',
      label: 'Dettagli',
      icon: '👁️',
      variant: 'secondary' as const,
      requiresSingle: true
    },
    {
      key: 'edit',
      label: 'Modifica',
      icon: '✏️',
      variant: 'secondary' as const,
      requiresSingle: true
    },
    {
      key: 'delete',
      label: 'Elimina',
      icon: '🗑️',
      variant: 'danger' as const,
      requiresConfirmation: true
    }
  ];

  return (
    <TableContainer
      title={`${activities.length} Attività`}
      loading={loading}
      selectedCount={selectedActivities.length}
      totalCount={activities.length}
      columns={columns}
      bulkActions={bulkActions}
      onSelectAll={handleSelectAll}
      onBulkAction={onBulkAction}
      selectedItems={selectedActivities}
    >
      <div className=\"overflow-x-auto\">
        <table className=\"w-full table-auto\">
          <thead className=\"bg-gray-50 border-b border-gray-200\">
            <tr>
              <th className=\"w-12 px-4 py-3\">
                <input
                  type=\"checkbox\"
                  checked={selectedActivities.length === activities.length && activities.length > 0}
                  onChange={handleSelectAll}
                  className=\"rounded border-gray-300 text-blue-600 focus:ring-blue-500\"
                />
              </th>
              {columns.map(column => column.visible && (
                <th
                  key={column.key}
                  className=\"px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\"
                >
                  <div className=\"flex items-center space-x-1\">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <button className=\"text-gray-400 hover:text-gray-600\">
                        ↕️
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className=\"w-12 px-4 py-3\"></th>
            </tr>
          </thead>
          <tbody className=\"bg-white divide-y divide-gray-200\">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className=\"animate-pulse\">
                  <td className=\"px-4 py-4\">
                    <div className=\"w-4 h-4 bg-gray-200 rounded\"></div>
                  </td>
                  {columns.map(column => column.visible && (
                    <td key={column.key} className=\"px-4 py-4\">
                      <div className=\"h-6 bg-gray-200 rounded\"></div>
                    </td>
                  ))}
                  <td className=\"px-4 py-4\">
                    <div className=\"w-6 h-6 bg-gray-200 rounded\"></div>
                  </td>
                </tr>
              ))
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={columns.filter(c => c.visible).length + 2} className=\"px-4 py-12 text-center\">
                  <div className=\"text-gray-500\">
                    <div className=\"text-4xl mb-4\">📝</div>
                    <h3 className=\"text-lg font-medium mb-2\">Nessuna attività trovata</h3>
                    <p className=\"text-sm\">Prova a modificare i filtri o crea una nuova attività.</p>
                  </div>
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <ActivityTableRow
                  key={activity.id}
                  activity={activity}
                  isSelected={selectedActivities.includes(activity.id)}
                  onSelect={() => handleSelectActivity(activity.id)}
                  onEdit={() => onActivityEdit(activity)}
                  onDelete={() => onActivityDelete(activity.id)}
                  visibleColumns={visibleColumns}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </TableContainer>
  );
}
