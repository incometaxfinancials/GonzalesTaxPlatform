/**
 * ITF - Income. Tax. Financials
 * Authentication Context
 *
 * Provides:
 * - Auth state management
 * - Login/logout functionality
 * - Protected route handling
 * - Token persistence
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { User, tokenManager, authApi, LoginRequest, RegisterRequest, ApiError } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<{ success: boolean; mfaRequired?: boolean }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from stored tokens
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = tokenManager.getUser();
      const token = tokenManager.getAccessToken();

      if (storedUser && token) {
        setUser(storedUser);
        // Optionally verify token with backend
        try {
          const profile = await authApi.getProfile();
          setUser(profile);
          tokenManager.setUser(profile);
        } catch (err) {
          // Token invalid, clear auth
          if (err instanceof ApiError && err.status === 401) {
            tokenManager.clearTokens();
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest): Promise<{ success: boolean; mfaRequired?: boolean }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authApi.login(data);

      if (result.mfaRequired) {
        setIsLoading(false);
        return { success: false, mfaRequired: true };
      }

      setUser(result.user);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      setError(message);
      setIsLoading(false);
      return { success: false };
    }
  };

  const register = async (data: RegisterRequest): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authApi.register(data);
      setIsLoading(false);
      return { success: true, message: result.message };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore errors, clear local state anyway
    }
    setUser(null);
    setIsLoading(false);
  };

  const clearError = () => setError(null);

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      tokenManager.setUser(updatedUser);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route component
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }

    if (!isLoading && isAuthenticated && requiredRole && user?.role !== requiredRole) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, isAuthenticated, requiredRole, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}

export default AuthContext;
