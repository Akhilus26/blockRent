import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType, RegisterData } from '@/types';
import { authAPI } from '@/services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { user: updatedUser } = await authAPI.getProfile();
      setUser(updatedUser);
      localStorage.setItem('blockrent_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  useEffect(() => {
    // Check for stored user on mount and refresh with backend
    const storedUser = localStorage.getItem('blockrent_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Refresh with backend to get latest verificationStatus
        authAPI.getProfile().then(({ user }) => {
          setUser(user);
          localStorage.setItem('blockrent_user', JSON.stringify(user));
        }).catch(() => {
          // Keep stored user if offline or ignore
        });
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('blockrent_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user } = await authAPI.login(email, password);
      setUser(user);
      localStorage.setItem('blockrent_user', JSON.stringify(user));
      return { user };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData | FormData) => {
    setIsLoading(true);
    try {
      const { user } = await authAPI.register(data);
      setUser(user);
      localStorage.setItem('blockrent_user', JSON.stringify(user));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('blockrent_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
