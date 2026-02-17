import { createContext, useContext, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { checkAuthStatus, logoutUser } from '../store/slices/authSlice';
import { projectsApi } from '../store/slices/projectsApiSlice';
import { persistor } from '../store/index';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, isAuthenticated } = useSelector((state) => state.auth);

  // Check auth status on mount
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // Proactively check token expiry every 60 seconds while user is active
  useEffect(() => {
    const checkExpiry = () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const { exp } = jwtDecode(token);
        const now = Date.now() / 1000;
        if (exp < now) {
          // Token expired - checkAuthStatus will try to refresh or force logout
          dispatch(checkAuthStatus());
        }
      } catch {
        // Malformed token - treat as expired
        dispatch(checkAuthStatus());
      }
    };

    const interval = setInterval(checkExpiry, 60_000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
    // Clear the RTK-Query cache so the next user can't see the previous user's
    // cached projects/stats/usage (the cache is in-memory and not covered by
    // persistor.purge()).
    dispatch(projectsApi.util.resetApiState());
    await persistor.purge();
    navigate('/login');
  }, [dispatch, navigate]);

  const value = {
    user,
    loading,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

