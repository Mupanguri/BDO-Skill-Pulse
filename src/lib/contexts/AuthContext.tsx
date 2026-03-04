import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import frontendLogger from '../utils/frontend-logger.js'

// User interface
export interface User {
  email: string;
  department: 'Tax' | 'IT' | 'Audit' | 'Consulting';
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isDarkMode: boolean;
  isRememberMe: boolean;
  isLoading: boolean;
  toggleDarkMode: () => void;
  toggleRememberMe: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  checkSessionStatus: () => Promise<boolean>;
  register: (email: string, password: string, department: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('accessToken');
  });
  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    return localStorage.getItem('refreshToken');
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isRememberMe, setIsRememberMe] = useState(() => {
    const saved = localStorage.getItem('rememberMe');
    return saved ? JSON.parse(saved) : false;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Define functions first before they're used in useEffect
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;

    try {
      const response = await fetch('http://localhost:3001/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return true;
      } else {
        console.error('Token refresh failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }, [refreshToken]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (accessToken) {
        try {
          await fetch('http://localhost:3001/api/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      }

      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('rememberMe');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const logoutAll = useCallback(async () => {
    setIsLoading(true);
    try {
      if (accessToken) {
        try {
          await fetch('http://localhost:3001/api/logout-all', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Logout all API call failed:', error);
        }
      }

      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('rememberMe');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

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
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const duration = performance.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        const userData = {
          email: data.email,
          department: data.department as 'Tax' | 'IT' | 'Audit' | 'Consulting',
          isAdmin: data.isAdmin
        };
        setUser(userData);
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
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
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, department })
      });

      const duration = performance.now() - startTime;
      
      if (response.ok) {
        frontendLogger.userAction('register_success', 'AuthContext', { 
          email, 
          department, 
          duration: Math.round(duration) 
        });
        return { success: true };
      } else {
        const errorData = await response.json();
        frontendLogger.userAction('register_failed', 'AuthContext', { 
          email, 
          department, 
          error: errorData.error, 
          duration: Math.round(duration) 
        });
        return { success: false, error: errorData.error || 'Registration failed' };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      frontendLogger.error(error, { context: 'register', email, department });
      frontendLogger.userAction('register_error', 'AuthContext', { 
        email, 
        department, 
        duration: Math.round(duration) 
      });
      return { success: false, error: 'Network error during registration' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSessionStatus = useCallback(async (): Promise<boolean> => {
    if (!accessToken) return false;

    try {
      const response = await fetch('http://localhost:3001/api/session-status', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid;
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        return refreshed;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Session status check error:', error);
      return false;
    }
  }, [accessToken, refreshAccessToken]);

  // Enhanced auto-refresh token with persistent sessions
  useEffect(() => {
    if (accessToken && refreshToken) {
      // For persistent sessions (Remember Me), refresh every 23 hours
      // For regular sessions, refresh every 10 minutes
      const refreshTime = isRememberMe ? 23 * 60 * 60 * 1000 : 10 * 60 * 1000;

      const refreshInterval = setInterval(async () => {
        try {
          const success = await refreshAccessToken();
          if (!success) {
            console.warn('Token refresh failed, logging out user');
            logout();
          } else {
            console.log('Token refreshed successfully');
          }
        } catch (error) {
          console.error('Auto token refresh failed:', error);
          logout();
        }
      }, refreshTime);

      return () => clearInterval(refreshInterval);
    }
  }, [accessToken, refreshToken, refreshAccessToken, logout, isRememberMe]);

  // Enhanced session status check with persistent sessions
  useEffect(() => {
    if (user && accessToken) {
      // For persistent sessions, check every 30 minutes
      // For regular sessions, check every 5 minutes
      const checkInterval = isRememberMe ? 30 * 60 * 1000 : 5 * 60 * 1000;

      const statusCheckInterval = setInterval(async () => {
        try {
          const isValid = await checkSessionStatus();
          if (!isValid) {
            logout();
          }
        } catch (error) {
          console.error('Session status check failed:', error);
        }
      }, checkInterval);

      return () => clearInterval(statusCheckInterval);
    }
  }, [user, accessToken, checkSessionStatus, logout, isRememberMe]);

  // Initialize dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initialize user data
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Initialize access token
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  // Initialize refresh token
  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [refreshToken]);

  // Initialize remember me setting
  useEffect(() => {
    localStorage.setItem('rememberMe', JSON.stringify(isRememberMe));
  }, [isRememberMe]);

  // Auto-login on app start if remember me is enabled
  useEffect(() => {
    const autoLogin = async () => {
      if (!user && isRememberMe && refreshToken) {
        const success = await refreshAccessToken();
        if (success && accessToken) {
          // Get user info from session status
          const isValid = await checkSessionStatus();
          if (!isValid) {
            logout();
          }
        }
      }
    };

    autoLogin();
  }, []); // Only run on mount

  const value = {
    user,
    accessToken,
    refreshToken,
    isDarkMode,
    isRememberMe,
    isLoading,
    toggleDarkMode,
    toggleRememberMe,
    login,
    logout,
    logoutAll,
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
