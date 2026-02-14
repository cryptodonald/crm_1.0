import useSWR, { useSWRConfig } from 'swr';
import type { Note as PostgresNote } from '@/types/database';

type Note = PostgresNote;

interface UseNotesReturn {
  notes: Note[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  createNote: (data: CreateNoteData) => Promise<Note>;
  updateNote: (noteId: string, data: UpdateNoteData) => Promise<Note>;
  deleteNote: (noteId: string) => Promise<void>;
  togglePin: (noteId: string, currentPinned: boolean) => Promise<Note>;
  mutate: () => void;
}

interface CreateNoteData {
  lead_id: string;
  content: string;
  pinned?: boolean;
}

interface UpdateNoteData {
  content?: string;
  pinned?: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch notes');
  }
  const data = await res.json();
  return data.notes as Note[];
};

export function useNotes(leadId: string | undefined): UseNotesReturn {
  const { mutate: globalMutate } = useSWRConfig();

  const { data, error, mutate } = useSWR<Note[]>(
    leadId ? `/api/notes?lead_id=${leadId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  // Helper: aggiorna tutte le cache /api/notes (CRITICAL-001 pattern matching)
  const mutateAllNotes = (
    updater: (current: Note[] | undefined) => Note[] | undefined,
    options: { revalidate: boolean } = { revalidate: false }
  ) => {
    globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/api/notes'),
      updater,
      { revalidate: options.revalidate }
    );
  };

  // Helper: rollback — revalida tutte le cache /api/notes
  const rollbackNotes = () => {
    globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/api/notes')
    );
  };

  const createNote = async (noteData: CreateNoteData): Promise<Note> => {
    // Crea nota ottimistica con ID temporaneo
    const tempId = `temp-${Date.now()}`;
    const optimisticNote: Note = {
      id: tempId,
      lead_id: noteData.lead_id,
      content: noteData.content,
      pinned: noteData.pinned ?? false,
      user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_name: null, // Risolto dal server dopo POST
    };

    // Optimistic update: aggiungi in testa a tutte le cache
    mutateAllNotes((current) => {
      if (!current) return current;
      return [optimisticNote, ...current];
    });

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create note');
      }

      const { note } = await res.json();

      // Sostituisci nota temporanea con quella reale dal server
      mutateAllNotes((current) => {
        if (!current) return current;
        return current.map((n) => (n.id === tempId ? note : n));
      });

      return note;
    } catch (error) {
      // Rollback: rimuovi nota temporanea e revalida
      rollbackNotes();
      throw error;
    }
  };

  const updateNote = async (
    noteId: string,
    updateData: UpdateNoteData
  ): Promise<Note> => {
    // Optimistic update: applica modifiche immediatamente
    mutateAllNotes((current) => {
      if (!current) return current;
      return current.map((n) =>
        n.id === noteId ? { ...n, ...updateData, updated_at: new Date().toISOString() } : n
      );
    });

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update note');
      }

      const { note } = await res.json();

      // Aggiorna con dati reali dal server
      mutateAllNotes((current) => {
        if (!current) return current;
        return current.map((n) => (n.id === noteId ? note : n));
      });

      return note;
    } catch (error) {
      // Rollback: revalida per ripristinare stato precedente
      rollbackNotes();
      throw error;
    }
  };

  const deleteNote = async (noteId: string): Promise<void> => {
    // Optimistic update: rimuovi immediatamente
    mutateAllNotes((current) => {
      if (!current) return current;
      return current.filter((n) => n.id !== noteId);
    });

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete note');
      }
    } catch (error) {
      // Rollback: revalida per ripristinare nota eliminata
      rollbackNotes();
      throw error;
    }
  };

  const togglePin = async (
    noteId: string,
    currentPinned: boolean
  ): Promise<Note> => {
    return updateNote(noteId, { pinned: !currentPinned });
  };

  return {
    notes: data,
    isLoading: !error && !data && !!leadId,
    error,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    mutate,
  };
}
