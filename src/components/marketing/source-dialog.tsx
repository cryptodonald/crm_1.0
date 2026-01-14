'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MarketingSource {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  color?: string;
}

interface SourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: MarketingSource | null;
  onSuccess: () => void;
}

export function SourceDialog({
  open,
  onOpenChange,
  source,
  onSuccess,
}: SourceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [color, setColor] = useState('#3B82F6');

  useEffect(() => {
    if (source) {
      setName(source.name);
      setDescription(source.description || '');
      setActive(source.active);
      setColor(source.color || '#3B82F6');
    } else {
      // Reset form
      setName('');
      setDescription('');
      setActive(true);
      setColor('#3B82F6');
    }
  }, [source, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Nome obbligatorio');
      return;
    }

    setLoading(true);

    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        active,
        color,
      };

      const url = source ? `/api/marketing/sources/${source.id}` : '/api/marketing/sources';
      const method = source ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }

      toast.success(source ? 'Fonte aggiornata' : 'Fonte creata');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving source:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const colorPresets = [
    { name: 'Blu', value: '#3B82F6' },
    { name: 'Azzurro', value: '#06B6D4' },
    { name: 'Indaco', value: '#6366F1' },
    { name: 'Viola', value: '#8B5CF6' },
    { name: 'Fucsia', value: '#D946EF' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Rosso', value: '#EF4444' },
    { name: 'Arancione', value: '#F97316' },
    { name: 'Ambra', value: '#F59E0B' },
    { name: 'Giallo', value: '#EAB308' },
    { name: 'Lime', value: '#84CC16' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Smeraldo', value: '#059669' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Grigio', value: '#6B7280' },
    { name: 'Ardesia', value: '#64748B' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{source ? 'Modifica Fonte' : 'Nuova Fonte Marketing'}</DialogTitle>
          <DialogDescription>
            Configura una nuova fonte per tracciare le campagne marketing.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Fonte *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: TikTok Ads"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi il canale marketing..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Colore</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 cursor-pointer"
              />
              <div className="flex-1">
                <div className="grid grid-cols-8 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      className={cn(
                        "w-8 h-8 rounded-md border-2 transition-all",
                        color === preset.value 
                          ? "border-gray-900 dark:border-gray-100 scale-110" 
                          : "border-transparent hover:border-gray-400 hover:scale-105"
                      )}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={active}
              onCheckedChange={(checked) => setActive(checked as boolean)}
            />
            <Label
              htmlFor="active"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Fonte attiva
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvataggio...' : (source ? 'Aggiorna' : 'Crea')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
