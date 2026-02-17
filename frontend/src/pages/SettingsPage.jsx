import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Loading } from '../components/ui/Loading';
import { Alert } from '../components/ui/Alert';
import { apiService } from '../utils/api';
import toast from 'react-hot-toast';
import {
  Save, Trash2, Check, AlertCircle, Lock, Server,
  FileText, Eye, EyeOff, User, KeyRound, Shield,
} from 'lucide-react';

const SectionHeader = ({ icon: Icon, color, title, subtitle }) => (
  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
    <div className={`p-2 rounded-xl ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

export const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── SSH credentials state ─────────────────────────────────────────────────
  const [sshLoading, setSshLoading] = useState(false);
  const [sshTesting, setSshTesting] = useState(false);
  const [sshTestResult, setSshTestResult] = useState(null);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [useKeyAuth, setUseKeyAuth] = useState(false);
  const [sshForm, setSshForm] = useState({
    hostname: '', port: 22, username: '', password: '',
    private_key: '', source_path: '', project_name: '',
  });

  // ── Password change state ─────────────────────────────────────────────────
  const [pwLoading, setPwLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwError, setPwError] = useState('');

  const pwRules = {
    length:  pwForm.new_password.length >= 8,
    upper:   /[A-Z]/.test(pwForm.new_password),
    lower:   /[a-z]/.test(pwForm.new_password),
    digit:   /\d/.test(pwForm.new_password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwForm.new_password),
  };
  const allPwRulesMet = Object.values(pwRules).every(Boolean);

  useEffect(() => { loadSSHCredentials(); }, []);

  const loadSSHCredentials = async () => {
    try {
      const res = await apiService.getSSHCredentials();
      if (res.data) {
        setHasSavedCredentials(true);
        setSshForm(prev => ({
          ...prev,
          hostname: res.data.ssh_hostname || '',
          port: res.data.ssh_port || 22,
          username: res.data.ssh_username || '',
          source_path: res.data.ssh_source_path || '',
          project_name: res.data.project_name || '',
        }));
      }
    } catch {}
  };

  const handleSshChange = (e) => {
    const { name, value } = e.target;
    setSshForm(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value) || 22 : value }));
  };

  const handleTestSSH = async () => {
    if (!sshForm.hostname || !sshForm.username) {
      toast.error('Please enter hostname and username'); return;
    }
    const auth = useKeyAuth ? sshForm.private_key : sshForm.password;
    if (!auth) { toast.error(`Please provide ${useKeyAuth ? 'private key' : 'password'}`); return; }

    setSshTesting(true);
    setSshTestResult(null);
    try {
      const payload = { hostname: sshForm.hostname, port: sshForm.port, username: sshForm.username, source_path: sshForm.source_path };
      if (useKeyAuth) payload.private_key = sshForm.private_key;
      else payload.password = sshForm.password;
      const res = await apiService.testSSHConnection(payload);
      setSshTestResult({ success: true, message: res.data.message || 'Connection successful!' });
      toast.success('SSH connection successful!');
    } catch (err) {
      const msg = err.response?.data?.detail || 'SSH connection failed';
      setSshTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally { setSshTesting(false); }
  };

  const handleSaveSSH = async () => {
    if (!sshForm.hostname || !sshForm.username || !sshForm.source_path) {
      toast.error('Hostname, username and source path are required'); return;
    }
    if (!useKeyAuth && !sshForm.password) {
      toast.error('Please enter password or switch to key-based auth'); return;
    }
    if (useKeyAuth && !sshForm.private_key) {
      toast.error('Please paste your private key'); return;
    }
    setSshLoading(true);
    try {
      const payload = {
        hostname: sshForm.hostname, port: sshForm.port, username: sshForm.username,
        source_path: sshForm.source_path, project_name: sshForm.project_name || 'default',
      };
      if (useKeyAuth) payload.private_key = sshForm.private_key;
      else payload.password = sshForm.password;
      await apiService.saveSSHCredentials(payload);
      setHasSavedCredentials(true);
      toast.success('SSH credentials saved securely!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save credentials');
    } finally { setSshLoading(false); }
  };

  const handleDeleteSSH = async () => {
    if (!window.confirm('Delete saved SSH credentials?')) return;
    setSshLoading(true);
    try {
      await apiService.deleteSSHCredentials();
      setHasSavedCredentials(false);
      setSshForm({ hostname: '', port: 22, username: '', password: '', private_key: '', source_path: '', project_name: '' });
      setSshTestResult(null);
      toast.success('SSH credentials deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete credentials');
    } finally { setSshLoading(false); }
  };

  // ── Password change ───────────────────────────────────────────────────────
  const handlePwChange = (e) => {
    setPwError('');
    setPwForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pwForm.old_password) { setPwError('Please enter your current password'); return; }
    if (!allPwRulesMet) { setPwError('New password does not meet requirements'); return; }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('New passwords do not match'); return; }
    if (pwForm.old_password === pwForm.new_password) { setPwError('New password must differ from current password'); return; }

    setPwLoading(true);
    try {
      await apiService.changePassword(pwForm.old_password, pwForm.new_password);
      toast.success('Password changed successfully!');
      setPwForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map(d => d.msg || String(d)).join('; ')
        : (typeof detail === 'string' ? detail : 'Failed to change password');
      setPwError(msg);
    } finally { setPwLoading(false); }
  };

  const PwRule = ({ met, label }) => (
    <li className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${met ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
        {met && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
      </span>
      {label}
    </li>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your account, SSH credentials and security</p>
        </div>

        {/* ── Account Info ─────────────────────────────────────────────────── */}
        <Card className="space-y-5">
          <SectionHeader icon={User} color="bg-blue-100 text-blue-600" title="Account" subtitle="Your profile information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-400 uppercase font-medium mb-1">Username</p>
              <p className="font-semibold text-gray-900">{user?.username || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-400 uppercase font-medium mb-1">Email</p>
              <p className="font-semibold text-gray-900">{user?.email || '-'}</p>
            </div>
            {user?.role && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-400 uppercase font-medium mb-1">Role</p>
                <p className="font-semibold text-gray-900 capitalize">{user.role}</p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Change Password ───────────────────────────────────────────────── */}
        <Card className="space-y-5">
          <SectionHeader icon={KeyRound} color="bg-purple-100 text-purple-600" title="Change Password" subtitle="Update your account password" />

          {pwError && <Alert type="error" message={pwError} onClose={() => setPwError('')} />}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  name="old_password"
                  value={pwForm.old_password}
                  onChange={handlePwChange}
                  placeholder="Your current password"
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowOld(p => !p)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  name="new_password"
                  value={pwForm.new_password}
                  onChange={handlePwChange}
                  placeholder="New strong password"
                  className="input-field pr-10"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew(p => !p)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.new_password.length > 0 && (
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <PwRule met={pwRules.length}  label="8+ characters" />
                  <PwRule met={pwRules.upper}   label="Uppercase letter" />
                  <PwRule met={pwRules.lower}   label="Lowercase letter" />
                  <PwRule met={pwRules.digit}   label="Number" />
                  <PwRule met={pwRules.special} label="Special character" />
                </ul>
              )}
            </div>

            {/* Confirm new password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm_password"
                  value={pwForm.confirm_password}
                  onChange={handlePwChange}
                  placeholder="Re-enter new password"
                  className={`input-field pr-10 ${
                    pwForm.confirm_password && pwForm.confirm_password !== pwForm.new_password
                      ? 'border-red-300 focus:ring-red-400'
                      : pwForm.confirm_password && pwForm.confirm_password === pwForm.new_password
                      ? 'border-green-300 focus:ring-green-400'
                      : ''
                  }`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.confirm_password && pwForm.confirm_password !== pwForm.new_password && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button type="submit" disabled={pwLoading} className="w-full sm:w-auto">
              {pwLoading ? <><Loading size="sm" className="mr-2" />Changing…</> : <><Shield className="w-4 h-4 mr-2" />Change Password</>}
            </Button>
          </form>
        </Card>

        {/* ── SSH Credentials ───────────────────────────────────────────────── */}
        <Card className="space-y-5">
          <SectionHeader icon={Lock} color="bg-green-100 text-green-600" title="SSH Credentials"
            subtitle={hasSavedCredentials ? 'Credentials saved and encrypted' : 'Connect to your remote server'} />

          {hasSavedCredentials && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              SSH credentials are saved and encrypted
            </div>
          )}

          {sshTestResult && (
            <Alert type={sshTestResult.success ? 'success' : 'error'} message={sshTestResult.message}
              onClose={() => setSshTestResult(null)} />
          )}

          <div className="space-y-4">
            {/* Auth toggle */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" checked={useKeyAuth} onChange={e => setUseKeyAuth(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Use Private Key Authentication</span>
            </label>

            {/* Host / Port / Username */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Server className="w-3.5 h-3.5 inline mr-1" />Hostname *
                </label>
                <Input type="text" name="hostname" placeholder="192.168.1.100"
                  value={sshForm.hostname} onChange={handleSshChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port *</label>
                <Input type="number" name="port" placeholder="22"
                  value={sshForm.port} onChange={handleSshChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <Input type="text" name="username" placeholder="deploy"
                  value={sshForm.username} onChange={handleSshChange} />
              </div>
            </div>

            {/* Source path / Project name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Path *</label>
                <Input type="text" name="source_path" placeholder="/var/www/myapp"
                  value={sshForm.source_path} onChange={handleSshChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <Input type="text" name="project_name" placeholder="myapp"
                  value={sshForm.project_name} onChange={handleSshChange} />
              </div>
            </div>

            {/* Password or key */}
            {useKeyAuth ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-3.5 h-3.5 inline mr-1" />Private Key (PEM) *
                </label>
                <TextArea name="private_key" rows={7}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEpAIBAAKCAQEA..."
                  value={sshForm.private_key} onChange={handleSshChange} />
                <p className="text-xs text-gray-400 mt-1">Encrypted before storage.</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <Input type="password" name="password" placeholder="SSH password"
                  value={sshForm.password} onChange={handleSshChange} />
                <p className="text-xs text-gray-400 mt-1">Encrypted before storage.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
            <Button onClick={handleTestSSH} variant="outline" disabled={sshTesting || sshLoading}>
              {sshTesting ? <Loading size="sm" className="mr-2" /> : null}
              Test Connection
            </Button>
            <Button onClick={handleSaveSSH} disabled={sshLoading || sshTesting}>
              {sshLoading ? <Loading size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Credentials
            </Button>
            {hasSavedCredentials && (
              <Button onClick={handleDeleteSSH} variant="danger" disabled={sshLoading}>
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            )}
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
};
