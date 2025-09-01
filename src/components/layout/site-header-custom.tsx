'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { IconSearch, IconBell, IconSettings, IconX } from '@tabler/icons-react';
import { ModeToggle } from '@/components/mode-toggle';

export function SiteHeaderCustom() {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = React.useState('');

  // Handle ⌘K shortcut
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ⌘K on Mac or Ctrl+K on Windows/Linux
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select(); // Select all text if present
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        {/* Modern searchbar */}
        <div className="relative ml-2 max-w-md flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <IconSearch className="text-muted-foreground h-4 w-4" />
          </div>
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className={`bg-background border-input focus:ring-primary h-9 rounded-lg pl-10 focus:border-transparent focus:ring-2 ${
              searchValue ? 'pr-20' : 'pr-12'
            }`}
            onKeyDown={e => {
              // Escape to deselect and clear
              if (e.key === 'Escape') {
                setSearchValue('');
                searchInputRef.current?.blur();
              }
            }}
          />

          {/* Clear button - only show when there's text */}
          {searchValue && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-12">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted h-6 w-6 rounded-sm p-0"
                onClick={() => {
                  setSearchValue('');
                  searchInputRef.current?.focus();
                }}
              >
                <IconX className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Keyboard shortcut indicator */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Header Actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Notifications - Simple button with indicator */}
          <Button
            variant="ghost"
            size="sm"
            className="relative h-8 w-8 rounded-full"
          >
            <IconBell className="h-4 w-4" />
            {/* Red notification dot */}
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
          </Button>

          {/* Theme Toggle - Simple button */}
          <ModeToggle />

          {/* Settings - Simple button */}
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
            <IconSettings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
