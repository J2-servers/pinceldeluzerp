import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, User, Zap, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { hasAnyUser, bootstrapAdmin } from '@/lib/auth/authService';
import { useSession } from '@/lib/auth/useAuth';

/**
 * Tela de login neumórfica. Se não houver nenhum usuário, mostra o
 * fluxo de criação do primeiro administrador (bootstrap).
 */
export default function LoginScreen() {
  const { login, refresh } = useSession();
  const [mode, setMode] = useState(null); // 'login' | 'bootstrap'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    hasAnyUser()
      .then((exists) => { if (alive) setMode(exists ? 'login' : 'bootstrap'); })
      .catch(() => { if (alive) setMode('login'); });
    return () => { alive = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'bootstrap') {
        await bootstrapAdmin(form);
        refresh();
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  const isBootstrap = mode === 'bootstrap';
  const field = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card w-full max-w-md p-8"
        style={{ borderRadius: 'var(--r-3xl)' }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-7">
          <div
            className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', boxShadow: '6px 6px 14px rgba(0,0,0,0.20), -3px -3px 10px var(--nm-light)' }}
          >
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Pincel de Luz ERP</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {mode === null ? 'Carregando…'
              : isBootstrap ? 'Crie o administrador para começar'
              : 'Entre com suas credenciais'}
          </p>
        </div>

        {mode === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {isBootstrap && (
              <Field icon={User} label="Nome completo" autoFocus
                value={form.name} onChange={field('name')} placeholder="Seu nome" />
            )}
            <Field icon={Mail} label="E-mail" type="email" autoFocus={!isBootstrap}
              value={form.email} onChange={field('email')} placeholder="voce@empresa.com" />

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={field('password')}
                  placeholder={isBootstrap ? 'Mínimo 6 caracteres' : '••••••••'}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-[14px] outline-none"
                  style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', border: '1px solid var(--border-inner)', color: 'var(--text-primary)' }}
                />
                <button type="button" onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPw ? <EyeOff className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /> : <Eye className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded-xl" style={{ background: 'var(--red-muted)', color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-[14px] font-bold text-sm flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: '#fff', boxShadow: '4px 4px 10px rgba(0,0,0,0.18), -2px -2px 6px var(--nm-light)', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isBootstrap ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isBootstrap ? 'Criar administrador' : 'Entrar'}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] mt-6" style={{ color: 'var(--text-tertiary)' }}>
          Sistema local · dados protegidos neste computador
        </p>
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, placeholder, type = 'text', autoFocus }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-3 py-2.5 text-sm rounded-[14px] outline-none"
          style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', border: '1px solid var(--border-inner)', color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  );
}
