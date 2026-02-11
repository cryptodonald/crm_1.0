import * as React from 'react';
import useSWR from 'swr';
import { Task } from '@/types/database';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<{ tasks: Task[] }>(
    '/api/tasks',
    fetcher
  );

  return {
    tasks: data?.tasks || [],
    isLoading,
    error,
    mutate,
  };
}

export function useDeleteTask() {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const deleteTask = async (taskId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete task');
      }
      
      return res.json();
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteTask, isDeleting };
}
