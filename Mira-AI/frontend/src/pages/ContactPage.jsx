import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Building2, Send, Clock, ShieldCheck, Server, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const REASONS = [
  { icon: Server,      title: 'On-prem & data sovereignty',   desc: 'Run the entire pipeline on dedicated infrastructure. Your code never leaves it.' },
  { icon: Building2,   title: 'Enterprise rollouts',          desc: 'Multi-team onboarding, custom SLAs, and volume pricing for large codebases.' },
  { icon: ShieldCheck, title: 'Security & compliance',        desc: 'OWASP, PCI DSS and ISO 27001 reporting tailored to your audit requirements.' },
];

export const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.message.trim().length < 10) {
      toast.error('Please tell us a bit more (at least 10 characters).');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/contact/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Could not send your message.');
      setSent(true);
      toast.success('Message sent!');
    } catch (err) {
      toast.error(err.message || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/70 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo dark />
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </nav>

      {/* Ambient orbs */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-primary-600/15 blur-3xl float-slow" />
        <div className="absolute bottom-[-15%] left-[5%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-3xl float-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12" style={{ animation: 'fadeUp 700ms ease both' }}>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              Let's talk about <span className="gradient-text-animated">your codebase</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Enterprise plans, on-prem deployments, or just a question about a migration.
              We reply within one business day.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Left: why teams reach out */}
            <div className="lg:col-span-2 space-y-4" style={{ animation: 'fadeUp 700ms ease 150ms both' }}>
              {REASONS.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.title} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </span>
                      <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{r.desc}</p>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
                <Clock className="w-3.5 h-3.5" /> Average response time: under 24 hours
              </div>
            </div>

            {/* Right: the form */}
            <div className="lg:col-span-3" style={{ animation: 'fadeUp 700ms ease 300ms both' }}>
              <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 p-8">
                {sent ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Message sent</h2>
                    <p className="text-gray-500 mb-8">Thanks {form.name.split(' ')[0]}! We'll get back to you within one business day.</p>
                    <Link to="/" className="btn-primary text-white font-semibold px-6 py-2.5 rounded-xl inline-block">
                      Back to home
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Your name *</label>
                        <input type="text" required minLength={2} value={form.name} onChange={set('name')}
                          placeholder="Jane Smith" className="input-field" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Work email *</label>
                        <input type="email" required value={form.email} onChange={set('email')}
                          placeholder="you@company.com" className="input-field" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                      <input type="text" value={form.company} onChange={set('company')}
                        placeholder="Acme Corp (optional)" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">How can we help? *</label>
                      <textarea required rows={5} value={form.message} onChange={set('message')}
                        placeholder="Tell us about your codebase: language, rough size, target version, on-prem requirements…"
                        className="input-field resize-y" />
                    </div>
                    <button type="submit" disabled={sending}
                      className="w-full btn-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                      {sending ? 'Sending…' : <><Send className="w-4 h-4" /> Send message</>}
                    </button>
                    <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Goes straight to the Mira AI team inbox
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
