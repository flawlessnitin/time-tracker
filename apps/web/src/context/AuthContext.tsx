import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import type { AuthUser, ApiResponse, AuthResponse } from '@time-tracker/shared';
import { authApi } from '../utils/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  signout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'time_tracker_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      validateToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (savedToken: string) => {
    try {
      const response = await authApi.getMe(savedToken) as ApiResponse<AuthUser>;
      if (response.success && response.data) {
        setUser(response.data);
        setToken(savedToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const signin = async (email: string, password: string) => {
    const response = await authApi.signin(email, password) as ApiResponse<AuthResponse>;
    if (response.success && response.data) {
      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem(TOKEN_KEY, response.data.token);
    } else {
      throw new Error('Sign in failed');
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const response = await authApi.signup(email, password, name) as ApiResponse<AuthResponse>;
    if (response.success && response.data) {
      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem(TOKEN_KEY, response.data.token);
    } else {
      throw new Error('Sign up failed');
    }
  };

  const signout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        signin,
        signup,
        signout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
