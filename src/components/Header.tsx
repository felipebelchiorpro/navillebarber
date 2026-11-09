import React from 'react';
import { Scissors, LogOut, Store, ShieldCheck, UserCheck, ExternalLink } from 'lucide-react';
import { Barbearia, Usuario } from '../services/pocketbase';
import { NavilleLogo } from './NavilleLogo';

interface HeaderProps {
  user: Usuario | null;
  barbearia: Barbearia | null;
  onLogout: () => void;
  onOpenVitrine?: (slug: string) => void;
  onOpenSuperAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, barbearia, onLogout, onOpenVitrine, onOpenSuperAdmin }) => {
  return (
    <header className="glass-panel" style={{ borderRadius: '0', borderLeft: 'none', borderRight: 'none', borderTop: 'none', position: 'sticky', top: 0, zIndex: 50, padding: '0.85rem 1.5rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.5rem',
            background: 'linear-gradient(135deg, #d97706, #78350f)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            padding: '0.45rem'
          }}>
            <NavilleLogo className="w-full h-full text-white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }} className="gold-gradient-text">
                NAVILLE
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                BARBER
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              Core Multi-Tenant Engine • Módulo 01
            </div>
          </div>
        </div>

        {/* Active Tenant Context (Barbearia Ativa) */}
        {barbearia && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '0.45rem 0.95rem'
          }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.4rem',
              background: 'rgba(217, 119, 6, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <Store style={{ width: '1.1rem', height: '1.1rem' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                  {barbearia.nome}
                </span>
                <span className="gold-badge" style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}>
                  {barbearia.plano_saas.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  {barbearia.status.toUpperCase()}
                </span>
                <span>•</span>
                <a
                  href={`/b/${barbearia.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenVitrine) {
                      onOpenVitrine(barbearia.slug);
                    } else {
                      window.history.pushState({}, '', `/b/${barbearia.slug}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  title="Abrir Vitrine Pública de Agendamento"
                  style={{
                    fontFamily: 'monospace',
                    color: '#38bdf8',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    cursor: 'pointer',
                    borderBottom: '1px dashed rgba(56, 189, 248, 0.4)'
                  }}
                >
                  /b/{barbearia.slug}
                  <ExternalLink style={{ width: '0.75rem', height: '0.75rem' }} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* User Context & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '0.65rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{
                width: '1.9rem',
                height: '1.9rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldCheck style={{ width: '0.8rem', height: '0.8rem', color: '#fbbf24' }} />
                  {user.papel}
                </div>
              </div>
            </div>
          )}

          {user?.papel === 'superadmin' && (
            <button
              onClick={() => {
                if (onOpenSuperAdmin) {
                  onOpenSuperAdmin();
                } else {
                  window.history.pushState({}, '', '/admin');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.55rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Abrir Painel SuperAdmin Global"
            >
              <ShieldCheck style={{ width: '0.95rem', height: '0.95rem' }} />
              <span>Painel SuperAdmin</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="btn-secondary"
            title="Encerrar sessão"
            style={{ padding: '0.55rem 0.9rem', fontSize: '0.85rem' }}
          >
            <LogOut style={{ width: '0.95rem', height: '0.95rem', color: '#f87171' }} />
            <span>Sair</span>
          </button>
        </div>

      </div>
    </header>
  );
};
