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
    stato: true,
    fonte: true,
    citta: true,
    telefono: true,
    email: false,
    data: true,
    attivita: true,
    assegnatario: false,
    relazioni: false,
  },
};

const STORAGE_KEY = 'crm_leads_table_preferences';

export function useTablePreferences() {
  const [preferences, setPreferences] =
    useState<TablePreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carica le preferenze da localStorage al mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge con i default, assicurandosi che tutte le nuove colonne siano presenti
        const mergedColumns = { ...DEFAULT_PREFERENCES.visibleColumns };
        
        // Sovrascrivi solo le colonne che esistono già nel saved state
        if (parsed.visibleColumns) {
          Object.keys(parsed.visibleColumns).forEach(key => {
            if (key in mergedColumns) {
              mergedColumns[key] = parsed.visibleColumns[key];
            }
          });
        }
        
        const loadedPrefs = {
          itemsPerPage: parsed.itemsPerPage || DEFAULT_PREFERENCES.itemsPerPage,
          visibleColumns: mergedColumns,
        };
        
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreferences(loadedPrefs);
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
