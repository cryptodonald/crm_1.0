'use client';

import {
  IconCirclePlusFilled,
  IconUsers,
  IconActivity,
  IconBuildingStore,
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { SidebarMenuButton } from '@/components/ui/sidebar';

const quickCreateOptions = [
  {
    id: 'lead',
    label: 'Nuovo Lead',
    description: 'Crea un nuovo lead o contatto',
    icon: IconUsers,
    href: '/leads/new',
    keywords: ['lead', 'contatto', 'cliente', 'nuovo'],
  },
  {
    id: 'activity',
    label: 'Nuova Attività',
    description: 'Crea una nuova attività o task',
    icon: IconActivity,
    href: '/activities/new',
    keywords: ['attività', 'task', 'todo', 'lavoro'],
  },
  {
    id: 'client',
    label: 'Nuovo Cliente',
    description: 'Crea un nuovo cliente o azienda',
    icon: IconBuildingStore,
    href: '/clients/new',
    keywords: ['cliente', 'azienda', 'business', 'ditta'],
  },
];

export function QuickCreate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.metaKey && e.key.toLowerCase() === 'j') {
        const active = document.activeElement as HTMLElement | null;
        if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName)) return;
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  const handleSelect = (option: (typeof quickCreateOptions)[0]) => {
    setOpen(false);

    if (option.href) {
      router.push(option.href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground flex min-w-8 items-center justify-between duration-200 ease-linear">
          <div className="flex items-center gap-2">
            <IconCirclePlusFilled />
            <span>Crea Rapido</span>
          </div>
          <kbd className="bg-primary-foreground/20 ml-auto rounded px-1.5 py-0.5 font-mono text-xs">
            ⌘ J
          </kbd>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="max-w-[450px] p-0">
        <DialogTitle className="sr-only">Quick Create Menu</DialogTitle>
        <Command className="rounded-lg border-none shadow-md">
          <CommandInput placeholder="Cerca per creare..." className="h-12" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nessun risultato trovato.</CommandEmpty>
            <CommandGroup heading="Crea Nuovo">
              {quickCreateOptions.map(option => (
                <CommandItem
                  key={option.id}
                  value={`${option.label} ${option.keywords.join(' ')}`}
                  onSelect={() => handleSelect(option)}
                  className="flex cursor-pointer items-center gap-3 px-3 py-3"
                >
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                    <option.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {option.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
