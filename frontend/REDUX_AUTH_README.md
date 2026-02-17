# Redux Toolkit Authentication Implementation

## Overview
The frontend now uses Redux Toolkit for state management with full authentication support including JWT token handling and role-based access control.

## Features Implemented

### 1. **Redux Store Setup**
- Configured Redux Toolkit with auth slice
- Added to `src/store/index.js`
- Integrated with React app via Provider in `main.jsx`

### 2. **Authentication API Integration**

#### Login Endpoint
```javascript
POST /api/v1/accounts/login
Body: { email, password }
Response: { access_token, refresh_token, token_type, expires_in }
```

#### Signup Endpoint
```javascript
POST /api/v1/accounts/signup
Body: { email, username, password }
Response: User object with account details
```

### 3. **JWT Token Management**
- Access tokens stored in localStorage
- Refresh tokens stored in localStorage
- Automatic token refresh on 401 responses
- Token decoding to extract user role and ID using `jwt-decode`

### 4. **Role-Based Access Control**
The JWT token contains:
```json
{
  "sub": 1,           // User ID
  "role": "admin",    // User role (admin/user)
  "exp": 1769086409,  // Expiration timestamp
  "type": "access"    // Token type
}
```

Roles:
- **admin**: Full access to admin dashboard features
- **user**: Standard user access

### 5. **Redux State Structure**
```javascript
{
  auth: {
    user: { id, role },
    access_token: string,
    refresh_token: string,
    token_type: string,
    expires_in: number,
    isAuthenticated: boolean,
    loading: boolean,
    error: string | null
  }
}
```

## File Structure

```
src/
├── store/
│   ├── index.js                    # Redux store configuration
│   └── slices/
│       └── authSlice.js           # Authentication slice with thunks
├── utils/
│   └── api.js                     # Axios instance with interceptors
├── contexts/
│   └── AuthContext.jsx            # Auth context using Redux (for compatibility)
├── components/
│   └── ProtectedRoute.jsx         # Route guards with role support
└── pages/
    ├── LoginPage.jsx              # Login with Redux integration
    └── SignupPage.jsx             # Signup with Redux integration
```

## Usage Examples

### Accessing Auth State in Components
```javascript
import { useSelector } from 'react-redux';

function MyComponent() {
  const { user, isAuthenticated, loading } = useSelector(state => state.auth);
  
  return (
    <div>
      {user?.role === 'admin' && <AdminFeature />}
      {user?.role === 'user' && <UserFeature />}
    </div>
  );
}
```

### Dispatching Auth Actions
```javascript
import { useDispatch } from 'react-redux';
import { loginUser, logoutUser } from '../store/slices/authSlice';

function LoginComponent() {
  const dispatch = useDispatch();
  
  const handleLogin = async () => {
    await dispatch(loginUser({ email, password })).unwrap();
  };
  
  const handleLogout = () => {
    dispatch(logoutUser());
  };
}
```

### Protected Routes with Roles
```javascript
<ProtectedRoute requiredRole="admin">
  <AdminDashboard />
</ProtectedRoute>

<ProtectedRoute>
  <UserDashboard />
</ProtectedRoute>
```

### Conditional Rendering Based on Role
```javascript
{user?.role === 'admin' && (
  <Card>
    <h2>Admin-only Content</h2>
    {/* Admin features here */}
  </Card>
)}
```

## API Configuration

Set the API base URL in `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Available Redux Actions

### Async Thunks
- `loginUser({ email, password })` - Login and store tokens
- `signupUser({ email, username, password })` - Register and auto-login
- `logoutUser()` - Clear tokens and logout
- `checkAuthStatus()` - Check if user is authenticated on app load

### Sync Actions
- `clearError()` - Clear authentication errors
- `setCredentials({ user, access_token, refresh_token })` - Manually set auth state

## Token Refresh Flow

1. Request fails with 401 status
2. Interceptor catches the error
3. Attempts to refresh using refresh_token
4. If successful, retries original request with new token
5. If refresh fails, redirects to login

## Dashboard Differentiation

Currently both admin and user roles use the same dashboard route (`/dashboard`), but:
- Admin users see additional admin-only sections
- User role is displayed in the navbar
- Future enhancement: Separate admin routes can be added

### Example Admin Section in Dashboard
```javascript
{user?.role === 'admin' && (
  <Card>
    <h2>Admin Dashboard</h2>
    <div className="grid grid-cols-3 gap-4">
      <div>Total Users: N/A</div>
      <div>Total Projects: N/A</div>
      <div>System Status: Active</div>
    </div>
  </Card>
)}
```

## Security Notes

- Tokens are stored in localStorage (consider httpOnly cookies for production)
- Always use HTTPS in production
- Implement proper token expiration handling
- Consider implementing CSRF protection
- Validate all user inputs on both client and server

## Testing the Implementation

### Test Login
1. Start backend: `docker-compose up -d`
2. Start frontend: `npm run dev`
3. Navigate to http://localhost:5173/login
4. Login with admin credentials:
   - Email: `admin@miraai.ai`
   - Password: `AdminPass123`
5. Check Redux DevTools to see auth state
6. Verify role-based content appears

### Test Signup
1. Navigate to signup page
2. Fill in registration form
3. User will be auto-logged in after successful signup
4. Check token in localStorage and Redux state

## Dependencies Added

```json
{
  "@reduxjs/toolkit": "^latest",
  "react-redux": "^latest",
  "jwt-decode": "^latest",
  "axios": "^latest"
}
```

## Future Enhancements

- [ ] Add user profile management
- [ ] Implement remember me functionality
- [ ] Add password reset flow
- [ ] Create separate admin routes/dashboard
- [ ] Add user management for admins
- [ ] Implement email verification flow
- [ ] Add OAuth/social login support
- [ ] Implement role permissions (beyond admin/user)
