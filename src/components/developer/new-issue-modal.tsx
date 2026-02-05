'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDevIssue } from '@/hooks/use-dev-issues';
import { toast } from 'sonner';

interface NewIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewIssueModal({ open, onOpenChange, onSuccess }: NewIssueModalProps) {
  const { createIssue, isCreating } = useCreateDevIssue();
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    type: 'bug' as 'bug' | 'feature' | 'improvement' | 'tech_debt',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    status: 'backlog' as 'backlog' | 'todo' | 'in_progress' | 'review' | 'done',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Il titolo è obbligatorio');
      return;
    }

    const result = await createIssue({
      Title: formData.title,
      Description: formData.description || undefined,
      Type: formData.type,
      Priority: formData.priority,
      Status: formData.status,
    });

    if (result) {
      toast.success('Issue creato con successo!');
      setFormData({
        title: '',
        description: '',
        type: 'bug',
        priority: 'medium',
        status: 'backlog',
      });
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error('Errore durante la creazione');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuovo Issue</DialogTitle>
            <DialogDescription>
              Crea un nuovo bug report o feature request
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Titolo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Descrivi brevemente l'issue..."
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Dettagli aggiuntivi..."
                rows={4}
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">🐛 Bug</SelectItem>
                  <SelectItem value="feature">⚡ Feature</SelectItem>
                  <SelectItem value="improvement">💡 Improvement</SelectItem>
                  <SelectItem value="tech_debt">⚙️ Tech Debt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="grid gap-2">
              <Label>Priorità</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">🚨 Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creazione...' : 'Crea Issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
