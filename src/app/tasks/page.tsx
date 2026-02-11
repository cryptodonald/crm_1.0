'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TaskTypeBadge, TaskPriorityBadge } from '@/components/ui/smart-badge';
import { Button } from '@/components/ui/button';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from '@/components/ui/kanban';
import { useUserTasks } from '@/hooks/use-user-tasks';
import { AirtableUserTask } from '@/types/developer';
import { GripVertical, Phone, Mail, MessageSquare, Calendar, Users, Filter, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { format, isPast } from 'date-fns';
import { NewTaskModal } from '@/components/developer/new-task-modal';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { EditTaskModal } from '@/components/developer/edit-task-modal';
import { useDeleteUserTask } from '@/hooks/use-user-tasks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_COLUMNS = {
  todo: 'Da Fare',
  in_progress: 'In Corso',
  done: 'Completati',
} as const;

const TYPE_ICONS = {
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  followup: Users,
  meeting: Calendar,
  other: Calendar,
};

interface TaskCardProps {
  task: AirtableUserTask; // Legacy type name (uses Postgres Task internally)
  asHandle?: boolean;
  onEdit?: (task: AirtableUserTask) => void;
  onDelete?: (task: AirtableUserTask) => void;
  currentUserId?: string;
  currentUserRole?: string;
  usersMap?: Record<string, { id: string; nome: string; avatarUrl?: string }>;
}

function TaskCard({ task, asHandle, onEdit, onDelete, currentUserId, currentUserRole, usersMap }: TaskCardProps) {
  // Check if user can manage this specific task
  const isCreator = task.fields.CreatedBy?.includes(currentUserId || '');
  const isAdmin = currentUserRole === 'admin';
  const canManage = isCreator || isAdmin;
  const Icon = TYPE_ICONS[task.type as keyof typeof TYPE_ICONS];
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  
  // Get assigned user info
  const assignedUserId = task.fields.AssignedTo?.[0];
  const assignedUser = assignedUserId && usersMap ? usersMap[assignedUserId] : null;

  const cardContent = (
    <div className="rounded-md border bg-card p-3 shadow-xs hover:shadow-sm transition-shadow group/card">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {Icon && <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />}
            <span className="line-clamp-2 font-medium text-sm">{task.title}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {task.priority && (
              <TaskPriorityBadge
                priority={task.priority}
                className="pointer-events-none h-5 rounded-sm px-1.5 text-[11px]"
              />
            )}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifica
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete?.(task); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {task.type && (
              <TaskTypeBadge
                type={task.type}
                className="text-[10px] h-4 px-1 shrink-0"
              />
            )}
            {assignedUser && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Avatar className="h-5 w-5 shrink-0">
                  {assignedUser.avatarUrl && (
                    <AvatarImage src={assignedUser.avatarUrl} alt={assignedUser.nome} />
                  )}
                  <AvatarFallback className="text-[9px] font-medium">
                    {assignedUser.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-foreground truncate">
                  {assignedUser.nome}
                </span>
              </div>
            )}
          </div>

          {task.due_date && (
            <time
              className={`text-[10px] tabular-nums whitespace-nowrap shrink-0 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}
            >
              {isOverdue && '⚠️ '}
              {format(new Date(task.due_date), 'dd MMM yyyy', { locale: it })}
            </time>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <KanbanItem value={task.id}>
      {asHandle ? <KanbanItemHandle>{cardContent}</KanbanItemHandle> : cardContent}
    </KanbanItem>
  );
}

interface TaskColumnProps {
  value: string;
  tasks: AirtableUserTask[]; // Legacy type name (uses Postgres Task internally)
  isOverlay?: boolean;
  onEdit?: (task: AirtableUserTask) => void;
  onDelete?: (task: AirtableUserTask) => void;
  currentUserId?: string;
  currentUserRole?: string;
  usersMap?: Record<string, { id: string; nome: string; avatarUrl?: string }>;
}

function TaskColumn({ value, tasks, isOverlay, onEdit, onDelete, currentUserId, currentUserRole, usersMap }: TaskColumnProps) {
  return (
    <KanbanColumn value={value} className="rounded-md border bg-card p-2.5 shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm">{STATUS_COLUMNS[value as keyof typeof STATUS_COLUMNS]}</span>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <KanbanColumnHandle asChild>
          <Button variant="ghost" className="h-6 w-6 p-0">
            <GripVertical className="h-4 w-4" />
          </Button>
        </KanbanColumnHandle>
      </div>
      <KanbanColumnContent value={value} className="flex flex-col gap-2.5 p-0.5 min-h-[200px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            asHandle={!isOverlay}
            onEdit={onEdit}
            onDelete={onDelete}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            usersMap={usersMap}
          />
        ))}
      </KanbanColumnContent>
    </KanbanColumn>
  );
}

export default function TasksPage() {
  const { tasks, isLoading, mutate } = useUserTasks();
  const { data: session } = useSession();
  const { deleteTask, isDeleting } = useDeleteUserTask();
  
  const [isNewTaskOpen, setIsNewTaskOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<AirtableUserTask | null>(null);
  const [deletingTask, setDeletingTask] = React.useState<AirtableUserTask | null>(null);
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  
  // Fetch users for avatar display
  const { data: usersData } = useSWR<{ users: Record<string, { id: string; nome: string; avatarUrl?: string }> }>(
    '/api/users',
    (url: string) => fetch(url).then((r) => r.json())
  );
  const usersMap = usersData?.users || {};

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) => {
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesType = typeFilter === 'all' || task.type === typeFilter;
      return matchesPriority && matchesType;
    });
  }, [tasks, priorityFilter, typeFilter]);

  // Group tasks by status
  const columns = React.useMemo(() => {
    const grouped: Record<string, AirtableUserTask[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    filteredTasks.forEach((task) => {
      const status = task.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });

    return grouped;
  }, [filteredTasks]);

  const handleMove = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (event: any) => {
      const { overContainer } = event;
      const taskId = event.event.active.id as string;

      // Find task being moved
      const task = filteredTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Update status only
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = { Status: overContainer };

      // Update task status via API
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Failed to update task status:', {
            status: res.status,
            statusText: res.statusText,
            error: errorData,
          });
          toast.error(`Errore: ${errorData.error || 'Impossibile aggiornare il task'}`);
          // Revalidate to rollback UI
          mutate();
          return;
        }
        
        // Success feedback
        const statusLabels: Record<string, string> = {
          todo: 'Da Fare',
          in_progress: 'In Corso',
          done: 'Completati',
        };
        toast.success(`Task spostato in "${statusLabels[overContainer] || overContainer}"`);
        
        // Revalidate data
        mutate();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error('Error updating task:', error);
        toast.error('Errore di rete durante l\'aggiornamento');
        mutate(); // Rollback
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTasks]
  );

  // Calculate overdue tasks
  const overdueTasks = filteredTasks.filter(
    (t) => t.status !== 'done' && t.due_date && isPast(new Date(t.due_date))
  ).length;

  // Check permissions: can manage if creator or admin
  const canManageTask = React.useCallback((task: AirtableUserTask) => {
    const isCreator = task.fields.CreatedBy?.includes(session?.user?.id || '');
    const isAdmin = session?.user?.role === 'admin';
    return isCreator || isAdmin;
  }, [session]);

  // Handler for edit
  const handleEdit = React.useCallback((task: AirtableUserTask) => {
    if (canManageTask(task)) {
      setEditingTask(task);
    } else {
      toast.error('Non hai i permessi per modificare questo task');
    }
  }, [canManageTask]);

  // Handler for delete
  const handleDelete = React.useCallback((task: AirtableUserTask) => {
    if (canManageTask(task)) {
      setDeletingTask(task);
    } else {
      toast.error('Non hai i permessi per eliminare questo task');
    }
  }, [canManageTask]);

  // Confirm delete
  const confirmDelete = React.useCallback(async () => {
    if (!deletingTask) return;

    const success = await deleteTask(deletingTask.id);
    if (success) {
      toast.success('Task eliminato con successo');
      mutate();
    } else {
      toast.error('Errore durante l\'eliminazione');
    }
    setDeletingTask(null);
  }, [deletingTask, deleteTask, mutate]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[400px] bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="I Miei Task" />
        
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">I Miei Task</h1>
          <p className="text-muted-foreground mt-1">
            Gestione attività assegnate • Trascina le card per cambiare stato
          </p>
          {overdueTasks > 0 && (
            <p className="text-sm text-destructive mt-1 font-semibold">
              ⚠️ {overdueTasks} task in ritardo
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsNewTaskOpen(true)}>Nuovo Task</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priorità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="call">Chiamata</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="followup">Follow-up</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="other">Altro</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground ml-auto">
          {filteredTasks.length} task
        </div>
      </div>

      {/* Kanban Board */}
      <Kanban value={columns} onValueChange={() => {}} getItemValue={(item) => item.id} onMove={handleMove}>
        <KanbanBoard className="grid auto-rows-fr grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(columns).map(([status, tasks]) => (
            <TaskColumn
              key={status}
              value={status}
              tasks={tasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              currentUserId={session?.user?.id}
              currentUserRole={session?.user?.role}
              usersMap={usersMap}
            />
          ))}
        </KanbanBoard>
        <KanbanOverlay>
          <div className="rounded-md bg-primary/10 backdrop-blur-sm size-full border-2 border-primary" />
        </KanbanOverlay>
      </Kanban>
          </div>
        </div>
      </div>

      {/* Modal per nuovo task */}
      <NewTaskModal open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen} onSuccess={() => mutate()} />

      {/* Modal per modifica task */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open: boolean) => !open && setEditingTask(null)}
          onSuccess={() => mutate()}
        />
      )}

      {/* AlertDialog per conferma eliminazione */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il task &quot;{deletingTask?.fields.Title}&quot;?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayoutCustom>
  );
}
