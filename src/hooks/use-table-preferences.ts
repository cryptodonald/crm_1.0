'use client';

import { useEffect, useState } from 'react';

interface TablePreferences {
  itemsPerPage: number;
  visibleColumns: Record<string, boolean>;
}

const DEFAULT_PREFERENCES: TablePreferences = {
  itemsPerPage: 10,
  visibleColumns: {
    cliente: true,
    contatti: true,
    data: true,
    relazioni: true,
    assegnatario: true,
    note: true,
  },
};

const STORAGE_KEY = 'crm_leads_table_preferences';

export function useTablePreferences() {
  const [preferences, setPreferences] = useState<TablePreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carica le preferenze da localStorage al mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({
          itemsPerPage: parsed.itemsPerPage || DEFAULT_PREFERENCES.itemsPerPage,
          visibleColumns: {
            ...DEFAULT_PREFERENCES.visibleColumns,
            ...parsed.visibleColumns,
          },
        });
        console.log('[TablePreferences] Loaded from localStorage:', parsed);
      }
    } catch (error) {
      console.error('[TablePreferences] Error loading preferences:', error);
    }
    setIsLoaded(true);
  }, []);

  // Salva le preferenze in localStorage quando cambiano
  const savePreferences = (newPreferences: TablePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
      console.log('[TablePreferences] Saved to localStorage:', newPreferences);
    } catch (error) {
      console.error('[TablePreferences] Error saving preferences:', error);
    }
  };

  const updateItemsPerPage = (itemsPerPage: number) => {
    savePreferences({
      ...preferences,
      itemsPerPage,
    });
  };

  const updateVisibleColumns = (visibleColumns: Record<string, boolean>) => {
    savePreferences({
      ...preferences,
      visibleColumns,
    });
  };

  const resetPreferences = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setPreferences(DEFAULT_PREFERENCES);
      console.log('[TablePreferences] Reset to defaults');
    } catch (error) {
      console.error('[TablePreferences] Error resetting preferences:', error);
    }
  };

  return {
    preferences,
    isLoaded,
    updateItemsPerPage,
    updateVisibleColumns,
    resetPreferences,
  };
}
