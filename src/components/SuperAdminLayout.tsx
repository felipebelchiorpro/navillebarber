import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, CreditCard, ArrowLeft, Terminal, GitFork } from 'lucide-react';

export default function SuperAdminLayout() {
  const location = useLocation();

  const isGlobal = location.pathname === '/admin' || location.pathname === '/admin/';
  const isLojas = location.pathname.startsWith('/admin/barbearias');
  const isFinanceiro = location.pathname.startsWith('/admin/financeiro');
  const isSplit = location.pathname.startsWith('/admin/split') || location.pathname.startsWith('/superadmin/split');
  const isLogs = location.pathname.startsWith('/admin/logs') || location.pathname.startsWith('/superadmin/logs');

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar do Super Admin */}
      <aside className="w-72 h-full flex flex-col p-6 border-r border-white/[0.05] bg-[#050505] z-20 shrink-0 select-none">
        <div className="mb-10 px-4">
          <h1 className="text-xl font-bold text-white tracking-wide">
            NAVILLE <span className="text-emerald-500">ADMIN</span>
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Master Control</p>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <Link
            to="/admin"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold text-xs transition-all ${
              isGlobal
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <LayoutDashboard size={16} /> Visão Global
          </Link>

          <Link
            to="/admin/barbearias"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium text-xs transition-all ${
              isLojas
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Store size={16} /> Lojas Clientes
          </Link>

          <Link
            to="/admin/split"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium text-xs transition-all ${
              isSplit
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <GitFork size={16} /> Split & Subcontas
          </Link>

          <Link
            to="/admin/financeiro"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium text-xs transition-all ${
              isFinanceiro
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <CreditCard size={16} /> Faturamento SaaS
          </Link>

          <Link
            to="/admin/logs"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium text-xs transition-all ${
              isLogs
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Terminal size={16} /> Auditoria & Logs
          </Link>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="mt-auto pt-4 border-t border-white/[0.05] flex flex-col gap-1.5">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.04] text-xs font-medium transition-all"
            title="Voltar ao Painel da Barbearia"
          >
            <ArrowLeft size={15} /> Voltar ao Painel Tenant
          </Link>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}

export { SuperAdminLayout };

