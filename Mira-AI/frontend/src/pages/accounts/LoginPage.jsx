import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { loginUser, clearError } from '../../store/slices/authSlice';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) navigate('/dashboard');
  }, [isAuthenticated, user, navigate]);

  useEffect(() => () => { dispatch(clearError()); }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());

    if (!email || !password) { setLocalError('Please fill in all fields'); return; }
    if (!email.includes('@')) { setLocalError('Please enter a valid email address'); return; }

    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();
      toast.success(`Welcome back!`);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Login failed');
    }
  };

  const displayError = localError || (typeof error === 'string' ? error : null);

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-md">

          {/* Logo / heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 mb-4 shadow-lg">
              <span className="text-2xl text-white font-bold">M</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to continue to Mira AI</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {displayError && (
              <Alert type="error" message={displayError} onClose={() => { setLocalError(''); dispatch(clearError()); }} className="mb-5" />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="input-field pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" fullWidth disabled={loading} className="mt-2">
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="text-primary-600 hover:underline font-medium">Sign up free</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

// Dev: Arafat Uddin - 2026-04-12
