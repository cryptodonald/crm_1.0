'use client';

import { ActivityData, getActivityDateColor, formatDuration, ActivityTypeConfig, ActivityStatusConfig, ActivityPriorityConfig } from '@/types/activity';
import { ClientCell } from '@/components/leads/table-cells/ClientCell';
import { DateCell } from '@/components/leads/table-cells/DateCell';
import { BadgeCell } from '@/components/leads/table-cells/BadgeCell';
import { AssigneeCell } from '@/components/leads/table-cells/AssigneeCell';
import { DocumentCell } from '@/components/leads/table-cells/DocumentCell';
import { FollowUpCell } from './table-cells/FollowUpCell';
import { ActionDropdown } from '@/components/leads/ActionDropdown';

interface ActivityTableRowProps {
  activity: ActivityData;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  visibleColumns: string[];
}

export function ActivityTableRow({
  activity,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  visibleColumns
}: ActivityTableRowProps) {

  // Prepare data for reused components
  const clientData = {
    name: activity.titolo,
    avatar: null, // Will be taken from lead lookup
    badges: [
      {
        text: activity.stato,
        color: ActivityStatusConfig[activity.stato]?.color || 'bg-gray-100 text-gray-800',
        icon: ActivityStatusConfig[activity.stato]?.icon
      },
      {
        text: activity.priorita,
        color: ActivityPriorityConfig[activity.priorita]?.color || 'bg-gray-100 text-gray-800', 
        icon: ActivityPriorityConfig[activity.priorita]?.icon
      },
      {
        text: activity.tipo,
        color: ActivityTypeConfig[activity.tipo]?.color || 'bg-gray-100 text-gray-800',
        icon: ActivityTypeConfig[activity.tipo]?.icon
      }
    ],
    subtitle: activity.nomeLead?.[0] || '',
    subtitleLink: `/leads/${activity.idLead?.[0]}`, // Link to lead detail
    leadId: activity.idLead?.[0] // For avatar lookup
  };

  const dateData = {
    date: activity.data,
    colorClass: getActivityDateColor(activity.data, activity.stato),
    additionalInfo: activity.durataStimata ? formatDuration(activity.durataStimata) : undefined
  };

  const objectivesBadges = [
    {
      text: activity.obiettivo,
      color: 'bg-blue-100 text-blue-800',
      icon: '🎯'
    }
  ];

  // Add outcome badge if present
  if (activity.esito) {
    objectivesBadges.push({
      text: activity.esito,
      color: 'bg-green-100 text-green-800',
      icon: '✅'
    });
  }

  const assigneeData = {
    name: activity.nomeAssegnatario?.[0] || '',
    avatar: null, // Will be fetched based on assignee ID
    role: 'Agente', // TODO: Get from user lookup
    assigneeId: activity.assegnatario?.[0]
  };

  const followUpData = {
    nextAction: activity.prossimaAzione,
    nextDate: activity.dataProssimaAzione
  };

  const documentData = {
    notes: activity.note,
    attachmentCount: activity.allegati?.length || 0,
    hasDocuments: Boolean(activity.note) || Boolean(activity.allegati?.length)
  };

  const actions = [
    { key: 'edit', label: 'Modifica', icon: '✏️', onClick: onEdit },
    { key: 'delete', label: 'Elimina', icon: '🗑️', onClick: onDelete, variant: 'danger' as const }
  ];

  return (
    <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
      {/* Checkbox */}
      <td className=\"px-4 py-4\">
        <input
          type=\"checkbox\"
          checked={isSelected}
          onChange={onSelect}
          className=\"rounded border-gray-300 text-blue-600 focus:ring-blue-500\"
        />
      </td>

      {/* Cliente Column */}
      {visibleColumns.includes('cliente') && (
        <td className=\"px-4 py-4\">
          <ClientCell 
            client={clientData}
            showAvatar={true}
            showBadges={true}
            showSubtitle={true}
          />
        </td>
      )}

      {/* Data Column */}
      {visibleColumns.includes('data') && (
        <td className=\"px-4 py-4\">
          <DateCell 
            date={dateData}
            showTime={true}
            showAdditionalInfo={true}
          />
        </td>
      )}

      {/* Obiettivi Column */}
      {visibleColumns.includes('obiettivi') && (
        <td className=\"px-4 py-4\">
          <BadgeCell 
            badges={objectivesBadges}
            maxVisible={2}
          />
        </td>
      )}

      {/* Assegnatario Column */}
      {visibleColumns.includes('assegnatario') && (
        <td className=\"px-4 py-4\">
          <AssigneeCell 
            assignee={assigneeData}
            showRole={true}
          />
        </td>
      )}

      {/* Follow-up Column */}
      {visibleColumns.includes('followup') && (
        <td className=\"px-4 py-4\">
          <FollowUpCell 
            followUp={followUpData}
          />
        </td>
      )}

      {/* Documenti Column */}
      {visibleColumns.includes('documenti') && (
        <td className=\"px-4 py-4\">
          <DocumentCell 
            document={documentData}
            maxPreviewLength={50}
          />
        </td>
      )}

      {/* Actions */}
      <td className=\"px-4 py-4\">
        <ActionDropdown actions={actions} />
      </td>
    </tr>
  );
}
