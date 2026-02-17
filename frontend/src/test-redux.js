// Test Redux Store Setup
// Run this in browser console to test Redux integration

// 1. Check if Redux store is accessible
console.log('Redux Store:', window.store);

// 2. Get current auth state
console.log('Auth State:', window.store?.getState().auth);

// 3. Test login action (replace with real credentials)
/*
import { loginUser } from './store/slices/authSlice';

store.dispatch(loginUser({ 
  email: 'admin@miraai.ai', 
  password: 'AdminPass123' 
})).then(() => {
  console.log('Login successful!');
  console.log('User:', store.getState().auth.user);
  console.log('Role:', store.getState().auth.user?.role);
  });
*/

// 4. Check localStorage for tokens
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));

// 5. Decode JWT token (if jwt-decode is available)
/*
import { jwtDecode } from 'jwt-decode';
const token = localStorage.getItem('access_token');
if (token) {
  const decoded = jwtDecode(token);
  console.log('Decoded Token:', decoded);
  console.log('User ID:', decoded.sub);
  console.log('Role:', decoded.role);
  console.log('Expires:', new Date(decoded.exp * 1000));
}
*/
