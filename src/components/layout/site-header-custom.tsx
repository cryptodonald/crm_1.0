"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { 
  IconSearch, 
  IconBell, 
  IconSettings 
} from "@tabler/icons-react"
import { ModeToggle } from "@/components/mode-toggle"

export function SiteHeaderCustom() {
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Handle ⌘K shortcut
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ⌘K on Mac or Ctrl+K on Windows/Linux
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select() // Select all text if present
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        
        {/* Modern searchbar */}
        <div className="relative flex-1 max-w-md ml-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IconSearch className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search..."
            className="pl-10 pr-12 h-9 rounded-lg bg-background border-input focus:ring-2 focus:ring-primary focus:border-transparent"
            onKeyDown={(e) => {
              // Escape to deselect
              if (e.key === 'Escape') {
                searchInputRef.current?.blur()
              }
            }}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
        
        {/* Header Actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Notifications - Simple button with indicator */}
          <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
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
  )
}
