import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'

// User interface
export interface User {
  email: string;
  department: 'Tax' | 'IT' | 'Audit';
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  login: (email: string, department: string, isAdmin: boolean, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  logoutAll: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  checkSessionStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Temporary test users for development/testing
const testUsers = {
  admin: {
    email: 'admin.test@bdo.co.zw',
    department: 'IT' as const,
    isAdmin: true
  },
  user: {
    email: 'john.doe@bdo.co.zw',
    department: 'Tax' as const,
    isAdmin: false
  }
};

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
  }, [accessToken]);

  const logoutAll = useCallback(async () => {
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
  }, [accessToken]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  const login = useCallback((email: string, department: string, isAdmin: boolean, newAccessToken: string, newRefreshToken: string) => {
    const userData = {
      email,
      department: department as 'Tax' | 'IT' | 'Audit',
      isAdmin
    };
    setUser(userData);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
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

  // Auto-refresh token before expiration
  useEffect(() => {
    if (accessToken && refreshToken) {
      // Calculate time until token expires (15 minutes = 900000ms)
      // Refresh 2 minutes before expiration to be safe
      const refreshTime = 13 * 60 * 1000; // 13 minutes

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
  }, [accessToken, refreshToken, refreshAccessToken, logout]);

  // Check session status periodically
  useEffect(() => {
    if (user && accessToken) {
      const statusCheckInterval = setInterval(async () => {
        try {
          const isValid = await checkSessionStatus();
          if (!isValid) {
            logout();
          }
        } catch (error) {
          console.error('Session status check failed:', error);
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(statusCheckInterval);
    }
  }, [user, accessToken, checkSessionStatus, logout]);

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
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [refreshToken]);

  const value = {
    user,
    accessToken,
    refreshToken,
    isDarkMode,
    toggleDarkMode,
    login,
    logout,
    logoutAll,
    refreshAccessToken,
    checkSessionStatus
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
