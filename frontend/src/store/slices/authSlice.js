import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import api from '../../utils/api';

// Thunks for async actions
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/accounts/login', { email, password });
      
      const { access_token, refresh_token, token_type, expires_in, user } = response.data;

      // Decode token to get user info and role
      const decodedToken = jwtDecode(access_token);
      
      // Store tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      return {
        access_token,
        refresh_token,
        token_type,
        expires_in,
        user: {
          id: decodedToken.sub,
          role: decodedToken.role,
          email: user.email,
          username: user.username,
          
        },
      };
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : (typeof detail === 'string' ? detail : 'Login failed. Please check your credentials.');
      return rejectWithValue(msg);
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signup',
  async ({ email, name, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/accounts/signup', {
        email,
        password,
        username: name.trim() || undefined,
      });

      return response.data;
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : (typeof detail === 'string' ? detail : 'Signup failed. Please try again.');
      return rejectWithValue(msg);
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  // Clear ALL auth data from localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('persist:root');
  return null;
});

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        return rejectWithValue('No token found');
      }

      // Decode token to check expiration and get user info
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decodedToken.exp < currentTime) {
        // Token expired, try to refresh
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          // No refresh token - wipe storage and force redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          localStorage.removeItem('persist:root');
          window.location.href = '/login';
          return rejectWithValue('Token expired and no refresh token available');
        }

        try {
          const response = await api.post('/accounts/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          const newDecodedToken = jwtDecode(access_token);

          const storedUser2 = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
          return {
            access_token,
            user: {
              id: newDecodedToken.sub,
              role: newDecodedToken.role,
              email: storedUser2.email || newDecodedToken.email || '',
              username: storedUser2.username || newDecodedToken.username || '',
            },
          };
        } catch {
          // Refresh token expired or invalid - wipe storage and force redirect
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('persist:root');
          window.location.href = '/login';
          return rejectWithValue('Token refresh failed');
        }
      }

      // Merge JWT claims with persisted user info (email, username) from localStorage
      const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
      return {
        access_token: token,
        user: {
          id: decodedToken.sub,
          role: decodedToken.role,
          email: storedUser.email || decodedToken.email || '',
          username: storedUser.username || decodedToken.username || '',
        },
      };
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('persist:root');
      return rejectWithValue('Authentication check failed');
    }
  }
);

const initialState = {
  user: null,
  access_token: null,
  refresh_token: null,
  token_type: null,
  expires_in: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.access_token = action.payload.access_token;
      state.refresh_token = action.payload.refresh_token;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.access_token = action.payload.access_token;
        state.refresh_token = action.payload.refresh_token;
        state.token_type = action.payload.token_type;
        state.expires_in = action.payload.expires_in;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Signup
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.access_token = null;
        state.refresh_token = null;
        state.token_type = null;
        state.expires_in = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Check Auth Status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.access_token = action.payload.access_token;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.access_token = null;
        state.refresh_token = null;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
