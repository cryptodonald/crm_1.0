import useSWR from 'swr';
import { useState } from 'react';
import type { AirtableNotes } from '@/types/airtable.generated';

interface Note extends AirtableNotes {}

interface UseNotesReturn {
  notes: Note[] | undefined;
  isLoading: boolean;
  error: any;
  createNote: (data: CreateNoteData) => Promise<Note>;
  updateNote: (noteId: string, data: UpdateNoteData) => Promise<Note>;
  deleteNote: (noteId: string) => Promise<void>;
  togglePin: (noteId: string, currentPinned: boolean) => Promise<Note>;
  mutate: () => void;
}

interface CreateNoteData {
  leadId: string;
  content: string;
  type?: 'Riflessione' | 'Promemoria' | 'Follow-up' | 'Info Cliente';
  pinned?: boolean;
}

interface UpdateNoteData {
  content?: string;
  type?: 'Riflessione' | 'Promemoria' | 'Follow-up' | 'Info Cliente';
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
  const [isCreating, setIsCreating] = useState(false);

  const { data, error, mutate } = useSWR<Note[]>(
    leadId ? `/api/notes?leadId=${leadId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const createNote = async (noteData: CreateNoteData): Promise<Note> => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create note');
      }

      const { note } = await res.json();
      
      // Optimistic update: add to local cache
      mutate((current) => [note, ...(current || [])], false);
      
      return note;
    } finally {
      setIsCreating(false);
    }
  };

  const updateNote = async (
    noteId: string,
    updateData: UpdateNoteData
  ): Promise<Note> => {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update note');
    }

    const { note } = await res.json();

    // Optimistic update: update in local cache
    mutate(
      (current) =>
        current?.map((n) => (n.id === noteId ? note : n)) || [],
      false
    );

    return note;
  };

  const deleteNote = async (noteId: string): Promise<void> => {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete note');
    }

    // Optimistic update: remove from local cache
    mutate((current) => current?.filter((n) => n.id !== noteId) || [], false);
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
