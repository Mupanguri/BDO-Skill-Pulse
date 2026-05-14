import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import frontendLogger from '../utils/frontend-logger.js'
import { API_ENDPOINTS } from '../services/api.js'

export interface User {
  email: string;
  department: string;
  isAdmin: boolean;
  isHR: boolean;
  isSuperAdmin: boolean;
}

export type PortalMode = 'admin' | 'user' | 'superadmin' | null

interface LoginResponse {
  email: string;
  department: string;
  isAdmin: boolean;
  isHR: boolean;
  isSuperAdmin: boolean;
  accessToken: string;
  refreshToken?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isDarkMode: boolean;
  isRememberMe: boolean;
  isLoading: boolean;
  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  toggleDarkMode: () => void;
  toggleRememberMe: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  loginWithData: (data: LoginResponse) => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  checkSessionStatus: () => Promise<boolean>;
  register: (email: string, password: string, department: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return { ...parsed, isHR: Boolean(parsed.isHR), isSuperAdmin: Boolean(parsed.isSuperAdmin) };
    } catch { return null; }
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isRememberMe, setIsRememberMe] = useState(() => {
    const saved = localStorage.getItem('rememberMe');
    return saved ? JSON.parse(saved) : false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [portalMode, setPortalModeState] = useState<PortalMode>(() => {
    const saved = sessionStorage.getItem('portalMode')
    return (saved === 'admin' || saved === 'user' || saved === 'superadmin') ? saved as PortalMode : null
  });

  const setPortalMode = (mode: PortalMode) => {
    setPortalModeState(mode)
    if (mode) sessionStorage.setItem('portalMode', mode)
    else sessionStorage.removeItem('portalMode')
  };

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) setAccessToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      try {
        await fetch(API_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': accessToken ? `Bearer ${accessToken}` : '',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
      } catch {
        // Best-effort
      }

      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      setPortalMode(null);
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const loginWithData = (data: LoginResponse) => {
    const userData: User = {
      email: data.email,
      department: data.department,
      isAdmin: Boolean(data.isAdmin),
      isHR: Boolean(data.isHR),
      isSuperAdmin: Boolean(data.isSuperAdmin),
    };
    setUser(userData);
    setPortalMode(null);
    if (data.accessToken) setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  const toggleRememberMe = () => {
    setIsRememberMe((prev: boolean) => !prev);
  };

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const startTime = performance.now();
    frontendLogger.formSubmission('login', { email, password: '[REDACTED]', rememberMe }, false);

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe })
      });

      const duration = performance.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const userData: User = {
          email: data.email,
          department: data.department,
          isAdmin: Boolean(data.isAdmin),
          isHR: Boolean(data.isHR),
          isSuperAdmin: Boolean(data.isSuperAdmin)
        };
        setUser(userData);
        setPortalMode(null);
        if (data.accessToken) setAccessToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        setIsRememberMe(rememberMe);

        frontendLogger.userAction('login_success', 'AuthContext', {
          email,
          isAdmin: data.isAdmin,
          duration: Math.round(duration)
        });

        return { success: true };
      } else {
        const errorData = await response.json();
        frontendLogger.userAction('login_failed', 'AuthContext', {
          email,
          error: errorData.error,
          duration: Math.round(duration)
        });
        return { success: false, error: errorData.error || 'Login failed' };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      frontendLogger.error(error, { context: 'login', email });
      frontendLogger.userAction('login_error', 'AuthContext', {
        email,
        duration: Math.round(duration)
      });
      return { success: false, error: 'Network error during login' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, department: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const startTime = performance.now();
    frontendLogger.formSubmission('register', { email, password: '[REDACTED]', department }, false);

    try {
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, department })
      });

      const duration = performance.now() - startTime;

      if (response.ok) {
        frontendLogger.userAction('register_success', 'AuthContext', { email, department, duration: Math.round(duration) });
        return { success: true };
      } else {
        const errorData = await response.json();
        frontendLogger.userAction('register_failed', 'AuthContext', { email, department, error: errorData.error, duration: Math.round(duration) });
        return { success: false, error: errorData.error || 'Registration failed' };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      frontendLogger.error(error, { context: 'register', email, department });
      frontendLogger.userAction('register_error', 'AuthContext', { email, department, duration: Math.round(duration) });
      return { success: false, error: 'Network error during registration' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSessionStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.SESSION_STATUS, {
        headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid;
      } else if (response.status === 401) {
        return await refreshAccessToken();
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    if (!user) return;
    const refreshTime = isRememberMe ? 23 * 60 * 60 * 1000 : 10 * 60 * 1000;

    const refreshInterval = setInterval(async () => {
      const success = await refreshAccessToken();
      if (!success) logout();
    }, refreshTime);

    return () => clearInterval(refreshInterval);
  }, [user, refreshAccessToken, logout, isRememberMe]);

  useEffect(() => {
    if (!user) return;
    const checkInterval = isRememberMe ? 30 * 60 * 1000 : 5 * 60 * 1000;

    const statusCheckInterval = setInterval(async () => {
      const isValid = await checkSessionStatus();
      if (!isValid) logout();
    }, checkInterval);

    return () => clearInterval(statusCheckInterval);
  }, [user, checkSessionStatus, logout, isRememberMe]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('rememberMe', JSON.stringify(isRememberMe));
  }, [isRememberMe]);

  useEffect(() => {
    const autoLogin = async () => {
      if (!user && isRememberMe) {
        const success = await refreshAccessToken();
        if (!success) {
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    };
    autoLogin();
  }, []);

  const value = {
    user,
    accessToken,
    refreshToken,
    isDarkMode,
    isRememberMe,
    isLoading,
    portalMode,
    setPortalMode,
    toggleDarkMode,
    toggleRememberMe,
    login,
    loginWithData,
    logout,
    refreshAccessToken,
    checkSessionStatus,
    register
  };

  return (
    <AuthContext.Provider value={value}>
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
