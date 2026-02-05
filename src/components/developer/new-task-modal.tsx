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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TaskTypeBadge, TaskPriorityBadge } from '@/components/ui/smart-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCreateUserTask } from '@/hooks/use-user-tasks';
import { toast } from 'sonner';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { RotateCcw, Save, CheckSquare, User, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewTaskModal({ open, onOpenChange, onSuccess }: NewTaskModalProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { createTask, isCreating } = useCreateUserTask();
  const [assignedToOpen, setAssignedToOpen] = React.useState(false);
  const [isRewritingDescription, setIsRewritingDescription] = React.useState(false);
  
  // Fetch users list
  const { data: usersData } = useSWR<{ users: Record<string, { id: string; nome: string; email?: string; ruolo: string; avatarUrl?: string; telefono?: string }> }>(
    '/api/users',
    (url: string) => fetch(url).then((r) => r.json())
  );
  
  const usersArray = usersData?.users ? Object.values(usersData.users) : [];
  
  const initialFormData = {
    title: '',
    description: '',
    type: 'call' as 'call' | 'email' | 'whatsapp' | 'followup' | 'meeting' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    assignedTo: currentUserId || '',
  };
  
  const [formData, setFormData] = React.useState(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Il titolo è obbligatorio');
      return;
    }

    const result = await createTask({
      Title: formData.title,
      Description: formData.description || undefined,
      Type: formData.type,
      Priority: formData.priority,
      DueDate: formData.dueDate || undefined,
      AssignedTo: formData.assignedTo ? [formData.assignedTo] : undefined,
    });

    if (result) {
      toast.success('Task creato con successo!');
      setFormData(initialFormData);
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error('Errore durante la creazione');
    }
  };
  
  const handleReset = () => {
    setFormData(initialFormData);
    toast.success('Form azzerato');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold">Nuovo Task</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Titolo */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Titolo <span className="text-red-500">*</span>
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
                    <SelectItem value="call">
                      <TaskTypeBadge type="call" />
                    </SelectItem>
                    <SelectItem value="email">
                      <TaskTypeBadge type="email" />
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <TaskTypeBadge type="whatsapp" />
                    </SelectItem>
                    <SelectItem value="followup">
                      <TaskTypeBadge type="followup" />
                    </SelectItem>
                    <SelectItem value="meeting">
                      <TaskTypeBadge type="meeting" />
                    </SelectItem>
                    <SelectItem value="other">
                      <TaskTypeBadge type="other" />
                    </SelectItem>
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
                    <SelectItem value="low">
                      <TaskPriorityBadge priority="low" />
                    </SelectItem>
                    <SelectItem value="medium">
                      <TaskPriorityBadge priority="medium" />
                    </SelectItem>
                    <SelectItem value="high">
                      <TaskPriorityBadge priority="high" />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descrizione */}
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

            {/* Assegnazione e Scadenza - Grid 2 colonne */}
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
                <Label htmlFor="dueDate" className="text-sm font-medium">Scadenza</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="h-10"
                />
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
            disabled={isCreating}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isCreating}
            >
              <Save className="mr-2 h-4 w-4" />
              {isCreating ? 'Creazione...' : 'Crea Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
