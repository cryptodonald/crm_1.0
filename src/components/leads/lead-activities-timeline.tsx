'use client';

import { useMemo } from 'react';
import * as React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Users,
  Trash2,
  Edit,
  AlertTriangle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { useUsers } from '@/hooks/use-users';
import type { Activity } from '@/types/database';
import {
  getActivityTipoColor,
  getActivityStatoColor,
  getActivityPrioritaColor,
} from '@/types/activities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LeadActivitiesTimelineProps {
  activities: Activity[];
  onAddActivity?: () => void;
  onEditActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activityId: string) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activityIcons: Record<string, any> = {
  Chiamata: Phone,
  Messaggistica: MessageSquare,
  Email: Mail,
  Consulenza: Users,
  'Follow-up': Calendar,
};

// Colori centralizzati importati da types/activities.ts

export function LeadActivitiesTimeline({
  activities,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
}: LeadActivitiesTimelineProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [activityToDelete, setActivityToDelete] = React.useState<string | null>(null);
  const { users } = useUsers();

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  }, [activities]);

  const handleDeleteActivity = async () => {
    if (!activityToDelete || !onDeleteActivity) return;
    
    try {
      await onDeleteActivity(activityToDelete);
    } catch (error) {
      console.error('Failed to delete activity:', error);
    } finally {
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con bottone aggiungi */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Timeline Attività</h2>
        {onAddActivity && (
          <Button onClick={onAddActivity} size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Nuova Attività
          </Button>
        )}
      </div>

      {/* Vertical Stepper Timeline */}
      {sortedActivities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nessuna attività registrata
            </p>
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-8 w-full">
          {sortedActivities.map((activity, index) => (
            <li key={activity.id} className="relative">
              {/* Linea verticale */}
              {index < sortedActivities.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-px bg-border -mb-8" />
              )}
              <ActivityItemCard
                activity={activity}
                users={users}
                onDelete={onDeleteActivity ? () => {
                  setActivityToDelete(activity.id);
                  setDeleteDialogOpen(true);
                } : undefined}
                onEdit={onEditActivity ? () => onEditActivity(activity) : undefined}
              />
            </li>
          ))}
        </ol>
      )}

      {/* Alert Dialog per conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm" className="p-4 gap-3">
          <AlertDialogHeader className="!grid-rows-none !place-items-start space-y-1 pb-0 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-base font-semibold">Eliminare l&apos;attività?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm mt-1">
                  <span className="text-destructive font-medium">Questa azione è irreversibile.</span> L&apos;attività verrà eliminata permanentemente.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-muted/50 -mx-4 -mb-4 px-4 py-3 border-t mt-2 !flex !flex-row !justify-end gap-2">
            <AlertDialogCancel size="sm">Annulla</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              variant="destructive"
              onClick={handleDeleteActivity}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActivityItemCard({
  activity,
  users,
  onDelete,
  onEdit,
}: {
  activity: Activity;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: Record<string, any> | null;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const tipo = activity.type || 'Altro';
  const ActivityIcon = activityIcons[tipo] || Calendar;
  const titolo = activity.title || `${tipo} - Lead`;

  // Mappa stato → stile icona circolare
  const getIconStyle = () => {
    switch (activity.status) {
      case 'Completata':
        return { bg: 'bg-green-100 text-green-600', icon: Check };
      case 'Annullata':
        return { bg: 'bg-red-100 text-red-600', icon: X };
      case 'In corso':
        return { bg: 'bg-blue-100 text-blue-600', icon: Loader2 };
      default: // Da fare
        return { bg: 'bg-muted text-muted-foreground', icon: null };
    }
  };

  const iconStyle = getIconStyle();
  const StatusIcon = iconStyle.icon;

  return (
    <div className="flex items-start gap-3 rtl:space-x-reverse">
      {/* Icona circolare — colore basato sullo stato */}
      <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 lg:h-12 lg:w-12 ${iconStyle.bg}`}>
        {StatusIcon ? (
          <StatusIcon className="w-5 h-5" />
        ) : (
          <ActivityIcon className="w-5 h-5" />
        )}
      </span>

      {/* Contenuto */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium leading-tight text-base">
                {titolo}
              </h3>
              <Badge
                variant="outline"
                className={getActivityTipoColor(tipo)}
              >
                {tipo}
              </Badge>
              {activity.status && (
                <Badge
                  variant="outline"
                  className={getActivityStatoColor(activity.status)}
                >
                  {activity.status}
                </Badge>
              )}
              {activity.priority && (
                <Badge
                  variant="outline"
                  className={getActivityPrioritaColor(activity.priority)}
                >
                  {activity.priority}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
              {activity.activity_date && (
                <span>
                  {format(new Date(activity.activity_date), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                </span>
              )}
              {activity.assigned_to && users?.[activity.assigned_to] && (() => {
                const user = users[activity.assigned_to];
                const nomeAssegnatario = user?.name || 'User';
                if (!nomeAssegnatario) return null;

                return (
                  <span className="flex items-center gap-1.5">
                    <AvatarLead
                      nome={nomeAssegnatario}
                      customAvatar={user?.avatarUrl}
                      size="sm"
                      className="h-5 w-5"
                    />
                    {nomeAssegnatario}
                  </span>
                );
              })()}
            </div>
          </div>

          {(onDelete || onEdit) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onEdit}
                  title="Modifica attività"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={onDelete}
                  title="Elimina attività"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {activity.notes && (
          <p className="text-sm whitespace-pre-wrap mt-2">{activity.notes}</p>
        )}
      </div>
    </div>
  );
}
