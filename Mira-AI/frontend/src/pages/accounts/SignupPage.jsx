import { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { signupUser, clearError } from '../../store/slices/authSlice';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

const PasswordRule = ({ met, label }) => (
  <li className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-green-600' : 'text-gray-400'}`}>
    {met
      ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
      : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
    {label}
  </li>
);

export const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => () => { dispatch(clearError()); }, [dispatch]);

  const rules = {
    length:    password.length >= 8,
    upper:     /[A-Z]/.test(password),
    lower:     /[a-z]/.test(password),
    digit:     /\d/.test(password),
    special:   /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
  };
  const allRulesMet = Object.values(rules).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());

    if (!name || !email || !password || !confirmPassword) {
      setLocalError('Please fill in all fields');
      return;
    }
    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }
    if (!allRulesMet) {
      setLocalError('Password does not meet the requirements below');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await dispatch(signupUser({ email, name, password })).unwrap();
      toast.success('Account created! Please sign in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create account');
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
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Create your account</h1>
            <p className="text-gray-500 text-sm">Start modernizing legacy code with AI</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {displayError && (
              <Alert type="error" message={displayError} onClose={() => { setLocalError(''); dispatch(clearError()); }} className="mb-5" />
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="input-field"
                />
              </div>

              {/* Email */}
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

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    required
                    className="input-field pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password rules */}
                {(passwordFocused || password.length > 0) && (
                  <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <PasswordRule met={rules.length}  label="8+ characters" />
                    <PasswordRule met={rules.upper}   label="Uppercase letter" />
                    <PasswordRule met={rules.lower}   label="Lowercase letter" />
                    <PasswordRule met={rules.digit}   label="Number" />
                    <PasswordRule met={rules.special} label="Special character" />
                  </ul>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    required
                    className={`input-field pr-10 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-300 focus:ring-red-400'
                        : confirmPassword && confirmPassword === password
                        ? 'border-green-300 focus:ring-green-400'
                        : ''
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm((p) => !p)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" required
                  className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-primary-600 hover:underline">Terms of Service</a>{' '}
                  and{' '}
                  <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>
                </span>
              </label>

              <Button type="submit" fullWidth disabled={loading} className="mt-2">
                {loading ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
