"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  const toggleTheme = () => {
    // Use resolvedTheme to get the actual theme (resolves 'system' to 'light' or 'dark')
    const currentTheme = resolvedTheme || theme
    setTheme(currentTheme === "dark" ? "light" : "dark")
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 w-8 rounded-full" 
      onClick={toggleTheme}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
