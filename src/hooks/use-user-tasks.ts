/**
 * DEPRECATED: usa use-tasks invece
 * Stub per retrocompatibilità - map Task → UserTask
 */

import { useTasks, useDeleteTask } from './use-tasks';
import type { Task } from '@/types/database';
import type { UserTask } from '@/types/developer';

export function useUserTasks() {
  const { tasks, isLoading, error, mutate } = useTasks();
  
  // Map Task[] → UserTask[] per backward compatibility
  const mappedTasks = tasks.map((task: Task): UserTask => ({
    id: task.id,
    title: task.title || '',
    description: task.description,
    type: task.type,
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    due_date: typeof task.due_date === 'string' ? task.due_date : task.due_date?.toISOString(),
    assigned_to_id: task.assigned_to_id,
    created_by_id: task.created_by_id,
    fields: {
      Title: task.title || '',
      Description: task.description || '',
      Type: task.type || 'other',
      Status: task.status || 'todo',
      Priority: task.priority || 'medium',
      DueDate: typeof task.due_date === 'string' ? task.due_date : task.due_date?.toISOString(),
      AssignedTo: task.assigned_to_id ? [task.assigned_to_id] : [],
      CreatedBy: task.created_by_id ? [task.created_by_id] : [],
    },
  }));
  
  return {
    tasks: mappedTasks,
    isLoading,
    error,
    mutate,
  };
}

export function useDeleteUserTask() {
  return useDeleteTask();
}
