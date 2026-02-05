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
  Video,
  Users,
  Trash2,
  Edit,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUsers } from '@/hooks/use-users';
import type { AirtableActivity } from '@/types/airtable.generated';
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
  activities: AirtableActivity[];
  onAddActivity?: () => void;
  onEditActivity?: (activity: AirtableActivity) => void;
  onDeleteActivity?: (activityId: string) => Promise<void>;
}

const activityIcons: Record<string, any> = {
  Chiamata: Phone,
  Email: Mail,
  WhatsApp: MessageSquare,
  Appuntamento: Calendar,
  Consulenza: Users,
  Prova: Calendar,
  Videochiamata: Video,
};

const activityTypeColors: Record<string, string> = {
  Chiamata: 'bg-blue-100 text-blue-700 border-blue-200',
  Email: 'bg-purple-100 text-purple-700 border-purple-200',
  WhatsApp: 'bg-green-100 text-green-700 border-green-200',
  SMS: 'bg-teal-100 text-teal-700 border-teal-200',
  Consulenza: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Follow-up': 'bg-pink-100 text-pink-700 border-pink-200',
  Altro: 'bg-gray-100 text-gray-700 border-gray-200',
};

const statusColors: Record<string, string> = {
  'Da Pianificare': 'bg-gray-100 text-gray-700 border-gray-200',
  'Pianificata': 'bg-blue-100 text-blue-700 border-blue-200',
  'In corso': 'bg-amber-100 text-amber-700 border-amber-200',
  'In attesa': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Completata': 'bg-green-100 text-green-700 border-green-200',
  'Annullata': 'bg-red-100 text-red-700 border-red-200',
  'Rimandata': 'bg-orange-100 text-orange-700 border-orange-200',
};

const priorityColors: Record<string, string> = {
  Bassa: 'bg-gray-100 text-gray-700 border-gray-200',
  Media: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Alta: 'bg-orange-100 text-orange-700 border-orange-200',
  Urgente: 'bg-red-100 text-red-700 border-red-200',
};

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
      const dateA = a.fields.Data ? new Date(a.fields.Data).getTime() : 0;
      const dateB = b.fields.Data ? new Date(b.fields.Data).getTime() : 0;
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
        <AlertDialogContent className="p-0 gap-0">
          <div className="p-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. L'attività verrà eliminata permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="border-t bg-muted/30">
            <AlertDialogFooter className="p-4">
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteActivity}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
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
  activity: AirtableActivity;
  users: Record<string, any> | null;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const tipo = activity.fields.Tipo || 'Altro';
  const isCompleted = activity.fields.Stato === 'Completata';
  const ActivityIcon = activityIcons[tipo] || Calendar;
  const titolo = activity.fields.Titolo || `${tipo} - ${activity.fields['Nome Lead'] || 'Lead'}`;

  return (
    <div className="flex items-start gap-3 rtl:space-x-reverse">
      {/* Icona circolare */}
      <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 lg:h-12 lg:w-12 ${
        isCompleted 
          ? 'bg-green-100 text-green-600' 
          : 'bg-muted text-muted-foreground'
      }`}>
        {isCompleted ? (
          <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11.917 9.724 16.5 19 7.5"/>
          </svg>
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
                className={activityTypeColors[tipo] || ''}
              >
                {tipo}
              </Badge>
              {activity.fields.Stato && (
                <Badge
                  variant="outline"
                  className={statusColors[activity.fields.Stato] || ''}
                >
                  {activity.fields.Stato}
                </Badge>
              )}
              {activity.fields.Priorità && (
                <Badge
                  variant="outline"
                  className={priorityColors[activity.fields.Priorità] || ''}
                >
                  {activity.fields.Priorità}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
              {activity.fields.Data && (
                <span>
                  {format(new Date(activity.fields.Data), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                </span>
              )}
              {activity.fields.Assegnatario?.[0] && activity.fields['Nome Assegnatario'] && (() => {
                const nomeAssegnatario = Array.isArray(activity.fields['Nome Assegnatario']) 
                  ? activity.fields['Nome Assegnatario'][0] 
                  : activity.fields['Nome Assegnatario'];
                
                if (!nomeAssegnatario) return null;
                
                const initials = typeof nomeAssegnatario === 'string'
                  ? nomeAssegnatario.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : 'U';
                
                return (
                  <span className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage 
                          src={users?.[activity.fields.Assegnatario[0]]?.avatarUrl || users?.[activity.fields.Assegnatario[0]]?.avatar} 
                          alt={nomeAssegnatario} 
                        />
                        <AvatarFallback className="text-[10px]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
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

        {activity.fields.Note && (
          <p className="text-sm whitespace-pre-wrap mt-2">{activity.fields.Note}</p>
        )}
      </div>
    </div>
  );
}
