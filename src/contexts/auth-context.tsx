'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { UserData } from '@/lib/auth';

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Verifica lo stato di autenticazione chiamando /api/auth/me
   */
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔍 [AuthContext] Checking authentication status...');

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      const data = await response.json();

      if (response.ok && data.success && data.authenticated) {
        console.log('✅ [AuthContext] User is authenticated:', data.user.nome);
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        console.log('❌ [AuthContext] User not authenticated');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error checking auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login utente
   */
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      console.log('🔐 [AuthContext] Attempting login for:', email);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ [AuthContext] Login successful:', data.user.nome);
        
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Salva token anche in localStorage per accesso client-side se necessario
        if (data.token) {
          localStorage.setItem('auth-token', data.token);
        }

        return {
          success: true,
          message: data.message || 'Login effettuato con successo'
        };
      } else {
        console.log('❌ [AuthContext] Login failed:', data.error);
        setUser(null);
        setIsAuthenticated(false);
        
        return {
          success: false,
          error: data.error || 'Errore durante il login'
        };
      }
    } catch (error) {
      console.error('❌ [AuthContext] Login error:', error);
      setUser(null);
      setIsAuthenticated(false);
      
      return {
        success: false,
        error: 'Errore di connessione. Riprova.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout utente
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      
      console.log('🚪 [AuthContext] Logging out...');

      // Chiama API logout per rimuovere cookie httpOnly
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Pulisci stato locale
      setUser(null);
      setIsAuthenticated(false);
      
      // Rimuovi token da localStorage
      localStorage.removeItem('auth-token');
      
      // Rimuovi eventuali cookie client-side (backup)
      Cookies.remove('auth-token');
      
      console.log('✅ [AuthContext] Logout completed');

      // Redirect alla pagina di login
      window.location.href = '/login';
      
    } catch (error) {
      console.error('❌ [AuthContext] Logout error:', error);
      
      // Anche in caso di errore, pulisci lo stato locale
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth-token');
      Cookies.remove('auth-token');
      
      window.location.href = '/login';
    } finally {
      setIsLoading(false);
    }
  };

  // Verifica autenticazione al mount del provider
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook per utilizzare il contesto di autenticazione
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}