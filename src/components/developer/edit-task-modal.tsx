'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TaskTypeBadge, TaskPriorityBadge, TaskStatusBadge } from '@/components/ui/smart-badge';
import { useUpdateUserTask } from '@/hooks/use-user-tasks';
import { AirtableUserTask } from '@/types/developer';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Calendar as CalendarIcon, Save, RotateCcw, CheckSquare, User, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';

interface EditTaskModalProps {
  task: AirtableUserTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Mapping colori per tipo
const TYPE_COLORS = {
  call: { variant: 'primary', label: 'Chiamata' },
  email: { variant: 'primary', label: 'Email' },
  whatsapp: { variant: 'success', label: 'WhatsApp' },
  followup: { variant: 'info', label: 'Follow-up' },
  meeting: { variant: 'warning', label: 'Meeting' },
  other: { variant: 'secondary', label: 'Altro' },
} as const;

// Mapping colori per priorità
const PRIORITY_COLORS = {
  low: { variant: 'secondary', label: 'Low' },
  medium: { variant: 'primary', label: 'Medium' },
  high: { variant: 'destructive', label: 'High' },
} as const;

// Mapping colori per stato
const STATUS_COLORS = {
  todo: { variant: 'secondary', label: 'Da Fare' },
  in_progress: { variant: 'primary', label: 'In Corso' },
  done: { variant: 'success', label: 'Completato' },
} as const;

export function EditTaskModal({ task, open, onOpenChange, onSuccess }: EditTaskModalProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { updateTask, isUpdating } = useUpdateUserTask(task.id);
  const [assignedToOpen, setAssignedToOpen] = React.useState(false);
  const [isRewritingDescription, setIsRewritingDescription] = React.useState(false);
  
  // Fetch users list
  const { data: usersData } = useSWR<{ users: Record<string, { id: string; nome: string; email?: string; ruolo: string; avatarUrl?: string; telefono?: string }> }>(
    '/api/users',
    (url: string) => fetch(url).then((r) => r.json())
  );
  
  const usersArray = usersData?.users ? Object.values(usersData.users) : [];
  
  const getInitialFormData = () => ({
    title: task.fields.Title || '',
    description: task.fields.Description || '',
    type: (task.fields.Type || 'call') as keyof typeof TYPE_COLORS,
    priority: (task.fields.Priority || 'medium') as keyof typeof PRIORITY_COLORS,
    status: (task.fields.Status || 'todo') as keyof typeof STATUS_COLORS,
    dueDate: task.fields.DueDate ? new Date(task.fields.DueDate) : undefined,
    assignedTo: (task.fields.AssignedTo && task.fields.AssignedTo[0]) || currentUserId || '',
  });
  
  const [formData, setFormData] = React.useState(getInitialFormData());

  // Reset form when task changes
  React.useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
    }
  }, [open, task]);
  
  const handleReset = () => {
    setFormData(getInitialFormData());
    toast.success('Form ripristinato ai valori originali');
  };
  
  const handleRewriteDescription = async () => {
    const currentTitle = formData.title;
    const currentDescription = formData.description;
    
    if (!currentDescription || currentDescription.trim().length === 0) {
      toast.error('Inserisci prima un testo da riscrivere');
      return;
    }

    setIsRewritingDescription(true);
    toast.loading('Riscrivendo titolo e descrizione con AI...', { id: 'ai-rewrite-task' });
    
    try {
      // Combina titolo e descrizione per dare contesto completo all'AI
      const fullText = currentTitle 
        ? `Titolo: ${currentTitle}\n\nDescrizione: ${currentDescription}`
        : currentDescription;
      
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: fullText,
          context: 'task_completo'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to rewrite');
      }
      
      if (data.rewrittenText) {
        // Parse la risposta AI per estrarre titolo e descrizione
        const rewrittenText = data.rewrittenText;
        
        // Pattern per estrarre titolo e descrizione
        const titleMatch = rewrittenText.match(/Titolo:\s*(.+?)(?:\n|$)/i);
        const descMatch = rewrittenText.match(/Descrizione:\s*([\s\S]+)/i);
        
        if (titleMatch && descMatch) {
          // Se l'AI ha restituito sia titolo che descrizione
          setFormData({ 
            ...formData, 
            title: titleMatch[1].trim(),
            description: descMatch[1].trim()
          });
          toast.success('Titolo e descrizione riscritti con successo!', { id: 'ai-rewrite-task' });
        } else {
          // Fallback: usa tutto il testo come descrizione
          setFormData({ ...formData, description: rewrittenText });
          toast.success('Descrizione riscritta con successo!', { id: 'ai-rewrite-task' });
        }
      } else {
        throw new Error('Nessun testo riscritto ricevuto');
      }
    } catch (error) {
      console.error('Error rewriting description:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error(`Errore durante la riscrittura: ${errorMessage}`, { id: 'ai-rewrite-task' });
    } finally {
      setIsRewritingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Il titolo è obbligatorio');
      return;
    }

    const success = await updateTask({
      Title: formData.title,
      Description: formData.description || undefined,
      Type: formData.type,
      Priority: formData.priority,
      Status: formData.status,
      DueDate: formData.dueDate ? formData.dueDate.toISOString().split('T')[0] : undefined,
      AssignedTo: formData.assignedTo ? [formData.assignedTo] : undefined,
    });

    if (success) {
      toast.success('Task aggiornato con successo!');
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold">Modifica Task</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Titolo */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Titolo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Es: Chiamare cliente per follow-up..."
                required
                className="h-10"
              />
            </div>

            {/* Tipo e Priorità - Grid 2 colonne */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo di Task</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue>
                      <TaskTypeBadge type={formData.type} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_COLORS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <TaskTypeBadge type={key} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Priorità</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue>
                      <TaskPriorityBadge priority={formData.priority} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_COLORS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <TaskPriorityBadge priority={key} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stato e Descrizione */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Stato</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue>
                    <TaskStatusBadge status={formData.status} />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_COLORS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <TaskStatusBadge status={key} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-medium">Descrizione</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRewriteDescription}
                  disabled={!formData.description || isRewritingDescription}
                  className="h-7 text-xs"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {isRewritingDescription ? 'Riscrivendo...' : 'Riscrivi con AI'}
                </Button>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Aggiungi dettagli, contesto o note specifiche..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Assegnazione e Scadenza */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assegna a</Label>
                <Popover open={assignedToOpen} onOpenChange={setAssignedToOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-10"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {formData.assignedTo && usersArray.find(u => u.id === formData.assignedTo) ? (
                          <span>{usersArray.find(u => u.id === formData.assignedTo)?.nome}</span>
                        ) : (
                          <span className="text-muted-foreground">Seleziona utente</span>
                        )}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cerca utente..." />
                      <CommandList>
                        <CommandEmpty>
                          {!usersData ? "Caricamento utenti..." : "Nessun utente trovato."}
                        </CommandEmpty>
                        {usersArray.length > 0 && (
                          <CommandGroup>
                            {usersArray.map((user) => {
                              const isCurrentUser = user.id === currentUserId;
                              return (
                                <CommandItem
                                  key={user.id}
                                  onSelect={() => {
                                    setFormData({ ...formData, assignedTo: user.id });
                                    setAssignedToOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    <Avatar className="h-8 w-8">
                                      {user.avatarUrl && (
                                        <AvatarImage src={user.avatarUrl} alt={user.nome} />
                                      )}
                                      <AvatarFallback className="text-xs">
                                        {user.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{user.nome}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {user.ruolo}
                                        </Badge>
                                        {isCurrentUser && (
                                          <Badge variant="secondary" className="text-xs">Tu</Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {user.telefono || user.email || 'Nessun contatto'}
                                      </div>
                                    </div>
                                    <Check
                                      className={cn(
                                        "h-4 w-4 flex-shrink-0",
                                        formData.assignedTo === user.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {/* Utente selezionato */}
                {formData.assignedTo && usersArray.find(u => u.id === formData.assignedTo) && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md mt-2">
                    <Avatar className="h-6 w-6">
                      {usersArray.find(u => u.id === formData.assignedTo)?.avatarUrl && (
                        <AvatarImage 
                          src={usersArray.find(u => u.id === formData.assignedTo)!.avatarUrl!} 
                          alt={usersArray.find(u => u.id === formData.assignedTo)!.nome} 
                        />
                      )}
                      <AvatarFallback className="text-xs">
                        {usersArray.find(u => u.id === formData.assignedTo)!.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {usersArray.find(u => u.id === formData.assignedTo)?.nome}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {usersArray.find(u => u.id === formData.assignedTo)?.ruolo}
                        </Badge>
                      </div>
                    </div>
                    <X
                      className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => setFormData({ ...formData, assignedTo: '' })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Scadenza
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-empty={!formData.dueDate}
                      className={cn(
                        "w-full justify-start text-left font-normal h-10",
                        !formData.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? (
                        format(formData.dueDate, "PPP", { locale: it })
                      ) : (
                        <span>Seleziona data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate}
                      onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                      initialFocus
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </form>
        </div>

        {/* Footer con azioni */}
        <div className="flex items-center justify-between border-t pt-4 gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isUpdating}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isUpdating}
            >
              <Save className="mr-2 h-4 w-4" />
              {isUpdating ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
