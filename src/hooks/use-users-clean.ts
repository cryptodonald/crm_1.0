/**
 * 🚀 Users UI System Clean - Sistema ottimizzato per gestione utenti
 * 
 * Combina l'API esistente con il sistema UI Clean generico per:
 * - Optimistic updates immediate
 * - Queue API con retry automatici
 * - Gestione errori robusta
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  createUISystemClean, 
  createGenericAPI, 
  GenericUISystemUtils,
  type Entity 
} from '@/lib/ui-system-clean-generic';

// ===== USER ENTITY TYPE =====
interface User extends Entity {
  id: string;
  nome: string;
  email?: string;
  ruolo: string;
  avatar?: string;
  telefono?: string;
}

// ===== USER FORM DATA =====
interface UserFormData {
  nome: string;
  email?: string;
  ruolo?: string;
  avatar?: string;
  telefono?: string;
}

// ===== USERS API CLIENT =====
const usersAPI = createGenericAPI<User>({
  baseUrl: '/api/users',
  entityName: 'users',
  transform: {
    request: (data: any) => data,
    response: (data: any) => ({
      id: data.id,
      nome: data.nome || data.Nome || '',
      email: data.email || data.Email || '',
      ruolo: data.ruolo || data.Ruolo || 'Staff',
      avatar: data.avatar || data.Avatar || '',
      telefono: data.telefono || data.Telefono || '',
    }),
  },
});

// ===== UI SYSTEM CLEAN INSTANCE =====
const usersUISystem = createUISystemClean<User>({
  retries: 2,
  timeout: 15000,
  showToasts: true,
  enableQueue: true,
  entityName: 'utente',
  entityNamePlural: 'utenti'
});

// ===== HOOK PRINCIPALE =====
interface UseUsersCleanProps {
  enableOptimistic?: boolean;
  autoFetch?: boolean;
}

export function useUsersClean({
  enableOptimistic = true,
  autoFetch = true,
}: UseUsersCleanProps = {}) {
  
  // 📊 STATE
  const [users, setUsers] = useState<User[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingOperations, setHasPendingOperations] = useState(false);

  // 🔄 FETCH USERS
  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.users) {
        // Converte l'oggetto users in array
        const usersArray = Object.values(data.users) as User[];
        const transformedUsers = usersArray.map(user => usersAPI.transform?.response ? usersAPI.transform.response(user) : user);
        
        setUsers(transformedUsers);
        setUsersById(data.users);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 OPTIMISTIC OPERATIONS
  const createUser = useCallback(async (userData: UserFormData): Promise<User | null> => {
    if (!enableOptimistic) {
      // Fallback tradizionale - gli users normalmente non supportano CREATE via API
      console.warn('⚠️ Create user not implemented in traditional API');
      return null;
    }

    // 🚀 Optimistic creation
    const tempId = GenericUISystemUtils.generateTempId('user');
    const tempUser: User = {
      id: tempId,
      nome: userData.nome,
      email: userData.email || '',
      ruolo: userData.ruolo || 'Staff',
      avatar: userData.avatar || '',
      telefono: userData.telefono || '',
    };

    const success = await usersUISystem.OptimisticManager.execute(
      {
        type: 'create',
        entity: 'users',
        tempData: tempUser,
      },
      {
        onUIUpdate: (newUser) => {
          console.log('⚡ [UsersClean] Adding optimistic user:', newUser.id);
          setUsers(prev => GenericUISystemUtils.addItem(prev, newUser));
          setUsersById(prev => ({ ...prev, [newUser.id]: newUser }));
          setHasPendingOperations(true);
        },
        onRollback: (failedUser) => {
          console.log('🔄 [UsersClean] Rolling back failed user:', failedUser.id);
          setUsers(prev => GenericUISystemUtils.removeItem(prev, failedUser.id));
          setUsersById(prev => {
            const { [failedUser.id]: removed, ...rest } = prev;
            return rest;
          });
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const result = await usersAPI.create(userData);
          
          // 🔄 Replace temp with real data
          setUsers(prev => GenericUISystemUtils.replaceTempItem(prev, tempId, result));
          setUsersById(prev => {
            const { [tempId]: temp, ...rest } = prev;
            return { ...rest, [result.id]: result };
          });
          
          // 🔄 Refresh in background
          setTimeout(() => {
            fetchUsers();
            setHasPendingOperations(false);
          }, 1000);
          
          return result;
        },
      },
      usersUISystem.queueManager
    );

    return success ? tempUser : null;
  }, [enableOptimistic, fetchUsers]);

  const updateUser = useCallback(async (userId: string, updates: Partial<UserFormData>): Promise<boolean> => {
    if (!enableOptimistic) {
      // Fallback tradizionale
      try {
        await usersAPI.update(userId, updates);
        await fetchUsers();
        return true;
      } catch (error) {
        console.error('❌ Update user failed:', error);
        return false;
      }
    }

    // 🚀 Optimistic update
    const currentUser = users.find(user => user.id === userId);
    if (!currentUser) return false;

    const updatedUser: User = { ...currentUser, ...updates };

    const success = await usersUISystem.OptimisticManager.execute(
      {
        type: 'update',
        entity: 'users',
        tempData: updatedUser,
        originalData: currentUser,
      },
      {
        onUIUpdate: (updated) => {
          console.log('⚡ [UsersClean] Updating optimistic user:', updated.id);
          setUsers(prev => GenericUISystemUtils.updateItem(prev, userId, updates));
          setUsersById(prev => ({ ...prev, [userId]: updated }));
          setHasPendingOperations(true);
        },
        onRollback: (original) => {
          console.log('🔄 [UsersClean] Rolling back failed update:', original.id);
          setUsers(prev => GenericUISystemUtils.updateItem(prev, userId, original));
          setUsersById(prev => ({ ...prev, [userId]: original }));
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const result = await usersAPI.update(userId, updates);
          
          // 🔄 Background refresh
          setTimeout(() => {
            fetchUsers();
            setHasPendingOperations(false);
          }, 1000);
          
          return result;
        },
      },
      usersUISystem.queueManager
    );

    return success;
  }, [enableOptimistic, users, fetchUsers]);

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!enableOptimistic) {
      // Fallback tradizionale
      try {
        await usersAPI.delete(userId);
        await fetchUsers();
        return true;
      } catch (error) {
        console.error('❌ Delete user failed:', error);
        return false;
      }
    }

    // 🚀 Optimistic deletion
    const userToDelete = users.find(user => user.id === userId);
    if (!userToDelete) return false;

    const success = await usersUISystem.OptimisticManager.execute(
      {
        type: 'delete',
        entity: 'users',
        tempData: userToDelete,
        originalData: userToDelete,
      },
      {
        onUIUpdate: (deleted) => {
          console.log('⚡ [UsersClean] Deleting optimistic user:', deleted.id);
          setUsers(prev => GenericUISystemUtils.removeItem(prev, userId));
          setUsersById(prev => {
            const { [userId]: removed, ...rest } = prev;
            return rest;
          });
          setHasPendingOperations(true);
        },
        onRollback: (restored) => {
          console.log('🔄 [UsersClean] Rolling back failed deletion:', restored.id);
          setUsers(prev => GenericUISystemUtils.addItem(prev, restored));
          setUsersById(prev => ({ ...prev, [userId]: restored }));
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          await usersAPI.delete(userId);
          
          // 🔄 Background refresh
          setTimeout(() => {
            fetchUsers();
            setHasPendingOperations(false);
          }, 1000);
          
          return userToDelete;
        },
      },
      usersUISystem.queueManager
    );

    return success;
  }, [enableOptimistic, users, fetchUsers]);

  // 🔄 REFRESH
  const refresh = useCallback(async () => {
    setHasPendingOperations(false);
    return fetchUsers();
  }, [fetchUsers]);

  // 🏁 INITIAL FETCH
  useEffect(() => {
    if (autoFetch) {
      fetchUsers();
    }
  }, [autoFetch, fetchUsers]);

  // 🎯 RETURN INTERFACE
  return {
    // 📊 Data
    users,
    usersById,
    loading,
    error,
    count: users.length,
    success: !error,
    
    // 🔄 Traditional methods
    fetchUsers,
    refresh,
    
    // 🚀 NEW: Optimistic operations
    createUser,
    updateUser,
    deleteUser,
    
    // 🎛️ System status
    hasPendingOperations,
    enableOptimistic,
    queueStatus: usersUISystem.monitor.getQueueStatus(usersUISystem.queueManager),
  };
}

// ===== UTILITIES =====
export const UsersUISystemUtils = {
  ...GenericUISystemUtils,
  
  /**
   * Find user by email
   */
  findUserByEmail: (users: User[], email: string): User | undefined => {
    return users.find(user => user.email?.toLowerCase() === email.toLowerCase());
  },
  
  /**
   * Filter users by role
   */
  filterUsersByRole: (users: User[], role: string): User[] => {
    return users.filter(user => user.ruolo === role);
  },
  
  /**
   * Get user display name
   */
  getUserDisplayName: (user: User): string => {
    return user.nome || user.email || `User ${user.id}`;
  },
};

console.log('🚀 Users UI System Clean initialized');
