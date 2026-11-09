import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { authService, Barbearia, Usuario } from '../services/pocketbase';
import { NavilleLogo } from './NavilleLogo';

interface LoginFormProps {
  onSuccess: (user: Usuario, barbearia: Barbearia | null) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Por favor preencha email e senha.');
      return;
    }

    try {
      setLoading(true);
      const { user, barbearia } = await authService.login(email.trim(), password);
      onSuccess(user, barbearia);
    } catch (err: any) {
      console.error('Falha de autenticação:', err);
      const msg = err?.data?.message || err?.message || 'Credenciais inválidas. Verifique seu email e senha.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillTestCredentials = () => {
    setEmail('dono@zerograu.com');
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 100px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem 2rem' }}>
        
        {/* Header Visual */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '3.75rem',
            height: '3.75rem',
            margin: '0 auto 1.25rem',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #d97706, #78350f)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(217, 119, 6, 0.35)',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            padding: '0.65rem'
          }}>
            <NavilleLogo className="w-full h-full text-white" />
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
            Acesso ao <span className="gold-gradient-text">Naville Barber</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Ambiente Local • Módulo 01 Core & Multi-Tenant
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.65rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#fca5a5',
            fontSize: '0.85rem'
          }}>
            <AlertCircle style={{ width: '1.1rem', height: '1.1rem', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
              E-mail do Utilizador
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', width: '1.1rem', height: '1.1rem', color: 'var(--text-dim)' }} />
              <input
                type="email"
                className="input-field"
                placeholder="ex: dono@zerograu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.65rem' }}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
              Senha de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', width: '1.1rem', height: '1.1rem', color: 'var(--text-dim)' }} />
              <input
                type="password"
                className="input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.65rem' }}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}
          >
            {loading ? (
              <span>Autenticando sessão...</span>
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight style={{ width: '1.1rem', height: '1.1rem' }} />
              </>
            )}
          </button>
        </form>

        {/* Quick Test Seed Fill Helper */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'center' }}>
            Credenciais do Módulo 01 (Seed Local)
          </div>

          <button
            type="button"
            onClick={handleFillTestCredentials}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '0.65rem' }}
          >
            <Sparkles style={{ width: '0.95rem', height: '0.95rem', color: '#fbbf24' }} />
            <span>Usar Utilizador Dono: <strong>dono@zerograu.com</strong></span>
          </button>

          <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center' }}>
            Vinculado à barbearia <strong>Zero Grau</strong> (slug: <code>zero-grau</code>)
          </div>
        </div>

      </div>
    </div>
  );
};
