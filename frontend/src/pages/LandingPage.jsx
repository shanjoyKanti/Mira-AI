import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, CheckCircle2, Circle, ArrowRight, Zap, Shield, BarChart3, GitBranch, Code2, Lock, Bot, Clock } from 'lucide-react';
import { loginUser, signupUser, clearError } from '../store/slices/authSlice';
import { Alert } from '../components/ui/Alert';
import { BrandLogo } from '../components/ui/BrandLogo';
import toast from 'react-hot-toast';

const PasswordRule = ({ met, label }) => (
  <li className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-green-600' : 'text-gray-400'}`}>
    {met
      ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
      : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
    {label}
  </li>
);

const AuthPanel = () => {
  const [tab, setTab] = useState('login');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [localError, setLocalError] = useState('');

  const [login, setLogin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ name: '', email: '', password: '', confirm: '' });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(s => s.auth);

  const rules = {
    length:  signup.password.length >= 8,
    upper:   /[A-Z]/.test(signup.password),
    lower:   /[a-z]/.test(signup.password),
    digit:   /\d/.test(signup.password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(signup.password),
  };
  const allRulesMet = Object.values(rules).every(Boolean);

  const displayError = localError || (typeof error === 'string' ? error : null);

  const switchTab = (t) => { setTab(t); setLocalError(''); dispatch(clearError()); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());
    if (!login.email || !login.password) { setLocalError('Please fill in all fields'); return; }
    try {
      await dispatch(loginUser({ email: login.email, password: login.password })).unwrap();
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Login failed');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());
    if (!signup.name || !signup.email || !signup.password || !signup.confirm) { setLocalError('Please fill in all fields'); return; }
    if (!signup.email.includes('@')) { setLocalError('Enter a valid email address'); return; }
    if (!allRulesMet) { setLocalError('Password does not meet requirements below'); return; }
    if (signup.password !== signup.confirm) { setLocalError('Passwords do not match'); return; }
    try {
      await dispatch(signupUser({ email: signup.email, name: signup.name, password: signup.password })).unwrap();
      toast.success('Account created! Please sign in.');
      setTab('login');
      setSignup({ name: '', email: '', password: '', confirm: '' });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Signup failed');
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/30 border border-white/20 overflow-hidden w-full max-w-sm">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['login', 'signup'].map(t => (
          <button key={t} onClick={() => switchTab(t)}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${tab === t ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        ))}
      </div>

      <div className="p-6">
        {displayError && (
          <Alert type="error" message={displayError} onClose={() => { setLocalError(''); dispatch(clearError()); }} className="mb-4" />
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={login.email} onChange={e => setLogin(p => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com" autoComplete="email" required className="input-field" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-600">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={login.password}
                  onChange={e => setLogin(p => ({ ...p, password: e.target.value }))}
                  placeholder="Your password" autoComplete="current-password" required className="input-field pr-10" />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 mt-1 disabled:opacity-60">
              {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input type="text" value={signup.name} onChange={e => setSignup(p => ({ ...p, name: e.target.value }))}
                placeholder="Jane Smith" required className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={signup.email} onChange={e => setSignup(p => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com" autoComplete="email" required className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={signup.password}
                  onChange={e => setSignup(p => ({ ...p, password: e.target.value }))}
                  onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                  placeholder="Strong password" autoComplete="new-password" required className="input-field pr-10" />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {(pwFocused || signup.password.length > 0) && (
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <PasswordRule met={rules.length}  label="8+ chars" />
                  <PasswordRule met={rules.upper}   label="Uppercase" />
                  <PasswordRule met={rules.lower}   label="Lowercase" />
                  <PasswordRule met={rules.digit}   label="Number" />
                  <PasswordRule met={rules.special} label="Special char" />
                </ul>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={signup.confirm}
                  onChange={e => setSignup(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Re-enter password" autoComplete="new-password" required
                  className={`input-field pr-10 ${signup.confirm && signup.confirm !== signup.password ? 'border-red-300' : signup.confirm && signup.confirm === signup.password ? 'border-green-300' : ''}`} />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 mt-1 disabled:opacity-60">
              {loading ? 'Creating account…' : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/* ── Self-modernizing code demo ─────────────────────────────────────────
   Auto-loops forever: the AI "agent" walks the legacy file line by line,
   rewriting each one to modern syntax, then validates and starts over.  */
const CODE_LINES = [
  { old: '$q = mysql_query("SELECT * FROM users");',        neu: '$q = $pdo->query("SELECT * FROM users");' },
  { old: 'var $items = array();',                            neu: 'private array $items = [];' },
  { old: 'function get($id) {',                              neu: 'function get(int $id): ?User {' },
  { old: '  list($a, $b) = split(",", $row);',               neu: '  [$a, $b] = explode(",", $row);' },
  { old: '  $name = isset($u) ? $u : "guest";',              neu: '  $name = $u ?? "guest";' },
  { old: '  return create_function(\'$x\', \'return $x;\');', neu: '  return fn($x) => $x;' },
];
const PIPELINE = ['Detect', 'Analyze', 'Modernize', 'Validate'];

const CodeUpgradeDemo = () => {
  // phase: 0..CODE_LINES.length = lines upgraded so far; then "validated" pause
  const [upgraded, setUpgraded] = useState(0);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    let timer;
    if (!validated && upgraded < CODE_LINES.length) {
      timer = setTimeout(() => setUpgraded(u => u + 1), 1100);
    } else if (!validated) {
      timer = setTimeout(() => setValidated(true), 700);
    } else {
      timer = setTimeout(() => { setUpgraded(0); setValidated(false); }, 3200);
    }
    return () => clearTimeout(timer);
  }, [upgraded, validated]);

  const stage = validated ? 3 : upgraded === 0 ? 0 : upgraded < CODE_LINES.length ? 2 : 3;
  const pct = Math.round((upgraded / CODE_LINES.length) * 100);

  return (
    <div className="relative">
      {/* Glow behind the window */}
      <div className="absolute -inset-6 bg-gradient-to-r from-primary-500/25 via-violet-500/20 to-primary-500/25 blur-3xl rounded-full pointer-events-none" aria-hidden="true" />

      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/95 backdrop-blur shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400/80" />
            <span className="w-3 h-3 rounded-full bg-amber-400/80" />
            <span className="w-3 h-3 rounded-full bg-green-400/80" />
            <span className="ml-3 text-xs text-slate-400 font-mono">UserService.php</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">PHP 5.6</span>
            <ArrowRight className="w-3 h-3 text-primary-400" />
            <span className="text-primary-300 font-semibold">PHP 8.3</span>
          </div>
        </div>

        {/* Code body */}
        <div className="py-3">
          {CODE_LINES.map((l, i) => {
            const done = i < upgraded;
            const active = i === upgraded && !validated && upgraded < CODE_LINES.length;
            return (
              <div key={i} className={`code-demo-line ${active ? 'upgrading' : ''}`}>
                <span className="ln">{i + 1}</span>
                {done
                  ? <span className="code-new code-swap-enter">{l.neu}</span>
                  : <span className={active ? 'code-old' : 'code-dim'}>{l.old}</span>}
              </div>
            );
          })}
        </div>

        {/* Agent status bar */}
        <div className="px-4 py-3 bg-slate-800/60 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs">
              <Bot className={`w-4 h-4 ${validated ? 'text-green-400' : 'text-primary-400'}`} />
              {validated
                ? <span className="text-green-400 font-semibold font-mono">✓ Validated · 0 errors · PHP 8.3 ready</span>
                : <span className="text-slate-300 font-mono">Mira agent modernizing<span style={{ animation: 'blinkCaret 1s step-end infinite' }}>▌</span></span>}
            </div>
            <div className="flex gap-1.5">
              {PIPELINE.map((p, i) => (
                <span key={p} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors duration-500 ${
                  validated || i < stage ? 'bg-green-500/15 text-green-400'
                  : i === stage ? 'bg-primary-500/20 text-primary-300'
                  : 'bg-white/5 text-slate-500'}`}>
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500 transition-all duration-700"
              style={{ width: `${validated ? 100 : pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* Cursor-reactive particle constellation (canvas, no dependencies).
   Particles drift slowly; lines connect near neighbours and reach toward
   the cursor, which gently repels them - the 2026 SaaS-hero pattern. */
const ParticleField = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const mouse = { x: -9999, y: -9999 };
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { width, height } = canvas.parentElement.getBoundingClientRect();
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();

    const W = () => canvas.width / DPR;
    const H = () => canvas.height / DPR;
    const N = Math.min(70, Math.floor((W() * H()) / 22000));
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 1 + Math.random() * 1.6,
    }));

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    const step = () => {
      ctx.clearRect(0, 0, W(), H());
      for (const p of parts) {
        // gentle cursor repulsion
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) { // 120px radius
          const d = Math.sqrt(d2) || 1;
          p.vx += (dx / d) * 0.06;
          p.vy += (dy / d) * 0.06;
        }
        p.vx = Math.max(-0.6, Math.min(0.6, p.vx * 0.995));
        p.vy = Math.max(-0.6, Math.min(0.6, p.vy * 0.995));
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W()) p.vx *= -1;
        if (p.y < 0 || p.y > H()) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(125, 211, 252, 0.5)';
        ctx.fill();
      }
      // constellation lines
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 12100) { // 110px
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.14 * (1 - d2 / 12100)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        // line toward cursor
        const a = parts[i];
        const dx = a.x - mouse.x, dy = a.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 25600) { // 160px
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(167, 139, 250, ${0.25 * (1 - d2 / 25600)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    window.addEventListener('resize', resize);
    canvas.parentElement.addEventListener('mousemove', onMove);
    canvas.parentElement.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.parentElement?.removeEventListener('mousemove', onMove);
      canvas.parentElement?.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
};

/* Count-up number that starts when it scrolls into view */
const CountUp = ({ end, suffix = '', duration = 1400 }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / duration, 1);
        setVal(Math.round(end * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
};

/* Adds .reveal-visible to .reveal elements as they scroll into view */
const useScrollReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('reveal-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
};

const FEATURES = [
  { icon: Bot,       color: 'bg-primary-100 text-primary-600', title: 'Autonomous AI Agents',   desc: 'Specialized agents detect, plan, rewrite and validate your code file by file. No manual rewriting, no missed edge cases.' },
  { icon: Code2,     color: 'bg-blue-100 text-blue-600',       title: 'Multi-Language Support', desc: 'PHP, Python, JavaScript, Java, Go, Ruby and 20+ more languages, all supported out of the box.' },
  { icon: GitBranch, color: 'bg-green-100 text-green-600',     title: 'Version Ladder',         desc: 'Step-by-step version migration (e.g. PHP 7.0 → 7.4 → 8.0 → 8.3) with enforced upgrade paths.' },
  { icon: Shield,    color: 'bg-red-100 text-red-600',         title: 'Security Scanning',      desc: 'OWASP Top 10, PCI DSS, ISO 27001 compliance reports powered by SonarQube + LLM analysis.' },
  { icon: BarChart3, color: 'bg-orange-100 text-orange-600',   title: 'Code Quality Reports',   desc: 'Architecture analysis, dependency graphs, code quality metrics, and executive summaries.' },
  { icon: Lock,      color: 'bg-teal-100 text-teal-600',       title: 'Secure SSH Access',      desc: 'Your code stays on your servers. Mira connects via encrypted SSH, and nothing is copied to us.' },
];

const STEPS = [
  { n: '1', title: 'Connect your server',    desc: 'Add SSH credentials for your VM. Your code never leaves your server.' },
  { n: '2', title: 'Create a project',       desc: 'Set project name, language, and target version.' },
  { n: '3', title: 'Agents run the pipeline', desc: '4 automated steps: detect, analyze, modernize, validate.' },
  { n: '4', title: 'Download results',       desc: 'Modernized code on your server + security & quality reports.' },
];

export const LandingPage = () => {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/70 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo dark />
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="text-sm font-semibold text-white btn-primary px-4 py-2 rounded-xl">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero (dark, immersive) ─────────────────────────────────────── */}
      <section className="relative pt-16 min-h-screen overflow-hidden bg-slate-950 flex items-center">
        {/* Ambient gradient orbs */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-primary-600/20 blur-3xl float-slow" />
          <div className="absolute bottom-[-15%] right-[5%] w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-3xl float-slow" style={{ animationDelay: '1.6s' }} />
          <div className="absolute top-[35%] right-[30%] w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-3xl float-slow" style={{ animationDelay: '3s' }} />
        </div>

        {/* Cursor-reactive constellation */}
        <ParticleField />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-14">
            {/* Left: copy */}
            <div style={{ animation: 'fadeUp 800ms ease both' }}>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-primary-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Zap className="w-3.5 h-3.5" /> Autonomous AI Code Modernization
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Modernize years of legacy code
                <span className="block gradient-text-animated">in hours, not months</span>
              </h1>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-lg">
                Outdated PHP, Java or Python is a security risk, a hiring problem and a monthly tax.
                Mira's autonomous agents upgrade and validate every file of your codebase in hours,
                on your own server, at a fraction of the cost of a rewrite team.
              </p>

              {/* USP: manual rewrite vs Mira agents */}
              <div className="relative grid grid-cols-2 gap-3 mb-4 max-w-lg">
                {/* Manual: the pain */}
                <div className="rounded-2xl border border-red-500/25 bg-red-500/5 backdrop-blur px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-red-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400/80">Manual rewrite</span>
                  </div>
                  <p className="text-3xl font-extrabold text-red-300 mb-1 line-through decoration-red-500/60 decoration-2">3–9 months</p>
                  <p className="text-xs leading-snug text-slate-400">A dev team, error-prone,<br />blocks your roadmap</p>
                </div>

                {/* VS badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className="w-10 h-10 rounded-full bg-slate-900 border border-white/20 text-white text-xs font-extrabold flex items-center justify-center shadow-xl"
                    style={{ animation: 'pulseSoft 2.5s ease infinite' }}>
                    VS
                  </span>
                </div>

                {/* Mira: the win */}
                <div className="relative rounded-2xl border border-primary-400/40 bg-gradient-to-br from-primary-500/15 to-violet-500/15 backdrop-blur px-5 py-4 shadow-lg shadow-primary-500/10">
                  <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-primary-500 to-violet-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow">
                    ~50× FASTER
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-5 h-5 text-green-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-green-400/90">Mira AI agents</span>
                  </div>
                  <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-400 mb-1">Hours</p>
                  <p className="text-xs leading-snug text-slate-300">Automated, compiler-validated,<br />resumable at any point</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-8 max-w-lg">
                The same migration, side by side. Your team ships features while the agents handle the upgrade.
              </p>

              {/* Count-up stats */}
              <div className="flex flex-wrap gap-8">
                {[
                  { label: 'Languages supported', end: 25, suffix: '+' },
                  { label: 'Frameworks', end: 50, suffix: '+' },
                  { label: 'Security standards', end: 3, suffix: '' },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-3xl font-extrabold text-white"><CountUp end={s.end} suffix={s.suffix} /></p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: auth panel */}
            <div className="flex flex-col items-center lg:items-end gap-4" style={{ animation: 'fadeUp 800ms ease 200ms both' }}>
              <AuthPanel />
              <p className="text-xs text-slate-500 text-center">
                No credit card required · Your code stays on your servers
              </p>
            </div>
          </div>

          {/* Centerpiece: self-modernizing code (auto-plays on load) */}
          <div className="max-w-3xl mx-auto" style={{ animation: 'fadeUp 900ms ease 400ms both' }}>
            <CodeUpgradeDemo />
            <p className="text-center text-xs text-slate-500 mt-4 font-mono">
              Live preview of the agent loop: this is what Step 3 does to every file in your project.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Why teams switch to Mira</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Replace months of rewrite budget with an automated pipeline: analysis, migration,
              security and compliance in one platform.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="reveal p-6 rounded-2xl border border-gray-200 bg-white hover:border-primary-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  style={{ '--reveal-delay': `${(i % 3) * 120}ms` }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">From legacy to modern in 4 steps</h2>
            <p className="text-lg text-gray-500">
              No consultants, no code freeze, no risk: your code never leaves your server,
              and every change is compiler-validated before it lands.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div aria-hidden="true" className="hidden lg:block absolute top-7 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary-200 via-violet-200 to-primary-200" />
            {STEPS.map((s, i) => (
              <div key={i} className="text-center reveal relative" style={{ '--reveal-delay': `${i * 150}ms` }}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 text-white text-xl font-extrabold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200 relative z-10"
                  style={{ animation: 'pulseSoft 3s ease infinite', animationDelay: `${i * 0.6}s` }}>
                  {s.n}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Start free, pay only when you modernize. A migration costs less than a week
              of one developer's time and finishes in hours.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                tagline: 'See the value before you spend a cent.',
                features: ['Full project analysis', 'Architecture & quality reports', 'Migration plan preview', 'Community support'],
                cta: 'Start Free',
                to: '/signup',
                highlight: false,
              },
              {
                name: 'Pro',
                price: 'Pay as you modernize',
                period: 'per project',
                tagline: 'The full agent pipeline, cloud speed.',
                features: ['Everything in Free', 'AI code modernization (all 4 steps)', 'Cloud API inference (fastest)', 'Security & compliance reports', 'Priority support'],
                cta: 'Get Started',
                to: '/signup',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: 'annual',
                tagline: 'On-prem inference, total data sovereignty.',
                features: ['Everything in Pro', 'On-prem hosted LLM option', 'Code never leaves your infrastructure', 'Dedicated support & SLA'],
                cta: 'Talk to Us',
                to: '/contact',
                highlight: false,
              },
            ].map((p, i) => (
              <div key={p.name}
                className={`reveal relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                  p.highlight
                    ? 'border-2 border-primary-500 bg-gradient-to-b from-primary-50/60 to-white shadow-xl shadow-primary-100 md:-translate-y-2'
                    : 'border border-gray-200 bg-white hover:shadow-lg'
                }`}
                style={{ '--reveal-delay': `${i * 140}ms` }}>
                {p.highlight && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{p.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{p.tagline}</p>
                <div className="mb-6">
                  <span className={`font-extrabold ${p.price.length > 8 ? 'text-2xl' : 'text-4xl'} ${p.highlight ? 'bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent' : 'text-gray-900'}`}>{p.price}</span>
                  <span className="text-sm text-gray-400 ml-2">{p.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.highlight ? 'text-primary-600' : 'text-green-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={p.to}
                  className={`text-center font-semibold py-2.5 rounded-xl transition-all duration-200 ${
                    p.highlight ? 'btn-primary text-white hover:scale-[1.02]' : 'border border-gray-300 text-gray-700 hover:border-primary-400 hover:text-primary-600'
                  }`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-10 reveal">
            🔒 Secure online payments via <span className="font-semibold text-gray-500">Stripe</span> coming soon ·
            Every plan starts with a free analysis, no credit card required.
          </p>
        </div>
      </section>

      {/* ── CTA (dark, cohesive with hero + footer) ────────────────────── */}
      <section className="relative py-24 bg-slate-950 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] left-[20%] w-[500px] h-[400px] rounded-full bg-primary-600/15 blur-3xl float-slow" />
          <div className="absolute bottom-[-40%] right-[15%] w-[500px] h-[400px] rounded-full bg-violet-600/15 blur-3xl float-slow" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative max-w-3xl mx-auto text-center px-4 reveal">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your first project could be <span className="gradient-text-animated">modern by tomorrow</span>
          </h2>
          <p className="text-lg text-slate-400 mb-10">
            Run your first analysis free today. See exactly what the agents would upgrade
            before you commit to anything.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup"
              className="btn-primary text-white font-bold px-8 py-3.5 rounded-xl hover:scale-105 transition-all duration-200">
              Get Started Free
            </Link>
            <Link to="/login"
              className="border border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 hover:border-white/40 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-3"><BrandLogo dark markClass="w-7 h-7 text-xs" textClass="text-lg" /></div>
              <p className="text-gray-400 text-sm">AI-powered code modernization platform for teams and enterprises.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/signup" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><a href="/docs" className="hover:text-white transition-colors">API Docs</a></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Supported</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>PHP · Python · JavaScript</li>
                <li>Java · Go · Ruby · Rust</li>
                <li>C# · TypeScript · and more</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Security</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>OWASP Top 10</li>
                <li>PCI DSS Compliance</li>
                <li>ISO 27001</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            &copy; 2026 Mira AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
