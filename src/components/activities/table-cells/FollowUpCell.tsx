'use client';

import { ActivityNextAction } from '@/types/activity';
import { formatDate } from '@/utils/dateUtils';

interface FollowUpCellProps {
  followUp: {
    nextAction?: ActivityNextAction;
    nextDate?: string;
  };
}

const NextActionConfig = {
  [ActivityNextAction.CHIAMATA]: { color: 'bg-blue-100 text-blue-800', icon: '📞' },
  [ActivityNextAction.WHATSAPP]: { color: 'bg-green-100 text-green-800', icon: '💬' },
  [ActivityNextAction.EMAIL]: { color: 'bg-purple-100 text-purple-800', icon: '📧' },
  [ActivityNextAction.SMS]: { color: 'bg-orange-100 text-orange-800', icon: '📱' },
  [ActivityNextAction.CONSULENZA]: { color: 'bg-indigo-100 text-indigo-800', icon: '🎯' },
  [ActivityNextAction.FOLLOWUP]: { color: 'bg-yellow-100 text-yellow-800', icon: '🔄' },
  [ActivityNextAction.NESSUNA]: { color: 'bg-gray-100 text-gray-800', icon: '✖️' }
};

export function FollowUpCell({ followUp }: FollowUpCellProps) {
  const { nextAction, nextDate } = followUp;

  if (!nextAction && !nextDate) {
    return (
      <div className=\"text-gray-400 text-sm\">
        Nessun follow-up
      </div>
    );
  }

  return (
    <div className=\"space-y-2\">
      {/* Next Date */}
      {nextDate && (
        <div className=\"text-sm text-gray-900\">
          {formatDate(nextDate, { 
            includeTime: true,
            format: 'dd/MM/yyyy HH:mm'
          })}
        </div>
      )}

      {/* Next Action Badge */}
      {nextAction && nextAction !== ActivityNextAction.NESSUNA && (
        <div className=\"inline-flex items-center\">
          <span 
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
              NextActionConfig[nextAction]?.color || 'bg-gray-100 text-gray-800'
            }`}
          >
            <span className=\"mr-1\">
              {NextActionConfig[nextAction]?.icon}
            </span>
            {nextAction}
          </span>
        </div>
      )}

      {/* No Action Badge */}
      {nextAction === ActivityNextAction.NESSUNA && (
        <div className=\"inline-flex items-center\">
          <span className=\"inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800\">
            <span className=\"mr-1\">✖️</span>
            Nessuna
          </span>
        </div>
      )}
    </div>
  );
}
