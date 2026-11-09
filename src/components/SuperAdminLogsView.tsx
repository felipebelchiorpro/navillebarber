import React, { useEffect, useState } from 'react';
import { Terminal, Search, AlertCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import { pb } from '../lib/pocketbase';

export default function SuperAdminLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    // 1. Busca os últimos 50 logs históricos
    async function fetchLogs() {
      try {
        const records = await pb.collection('logs').getList(1, 50, { sort: '-created' });
        setLogs(records.items);
      } catch (error) {
        console.error("Coleção de logs ainda não existe ou sem permissão.", error);
      }
    }
    fetchLogs();

    // 2. Inscreve em TEMPO REAL para qualquer novo log disparado pelo sistema
    pb.collection('logs').subscribe('*', function (e) {
      if (e.action === 'create') {
        setLogs((prev) => [e.record, ...prev].slice(0, 100)); // Adiciona no topo, mantém max 100 na tela
      }
    });

    return () => {
      pb.collection('logs').unsubscribe('*'); // Limpa memória ao sair
    };
  }, []);

  // Helper visual para o tipo de log
  const getLogLevelUI = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return { icon: <AlertCircle size={12} />, color: 'text-red-400 bg-red-400/10 border-red-400/20' };
      case 'warning':
        return { icon: <AlertTriangle size={12} />, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
      default:
        return { icon: <Info size={12} />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
    }
  };

  const logsFiltrados = logs.filter((log) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      (log.id || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.tenant_slug || '').toLowerCase().includes(q) ||
      (log.message || '').toLowerCase().includes(q) ||
      (log.level || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3 h-full w-full animate-in fade-in duration-500">
      {/* HEADER */}
      <header className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="text-emerald-500" size={16} />
            Auditoria & Logs
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Rastreamento em tempo real de eventos, chamados e falhas (Live Terminal).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador Live */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Live</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar ID, ação ou tenant..."
              className="bg-white/[0.03] border border-white/10 rounded-md pl-7 pr-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none w-64 placeholder-zinc-500"
            />
          </div>
        </div>
      </header>

      {/* ÁREA DE LOGS (Tabela Terminal) */}
      <div className="flex-1 flex flex-col rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden min-h-0">
        {/* Cabeçalho das Colunas */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.01]">
          <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase">Data / Hora</div>
          <div className="col-span-1 text-[10px] font-bold text-zinc-500 uppercase text-center">Nível</div>
          <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase">Origem (Tenant)</div>
          <div className="col-span-2 text-[10px] font-bold text-zinc-500 uppercase">Ação Disparada</div>
          <div className="col-span-5 text-[10px] font-bold text-zinc-500 uppercase">Mensagem do Sistema</div>
        </div>

        {/* Lista Rolável Monoespaçada */}
        <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs">
          {logsFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 py-12">
              <Clock className="opacity-30" size={24} />
              <p className="font-sans text-xs">
                {logs.length === 0 ? 'Aguardando eventos do sistema...' : 'Nenhum log corresponde ao filtro.'}
              </p>
            </div>
          ) : (
            logsFiltrados.map((log) => {
              const ui = getLogLevelUI(log.level);
              return (
                <div
                  key={log.id}
                  className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors items-start"
                >
                  <div className="col-span-2 text-zinc-500 whitespace-nowrap">
                    {new Date(log.created).toLocaleString()}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wider ${ui.color}`}
                    >
                      {ui.icon} {log.level || 'info'}
                    </span>
                  </div>
                  <div className="col-span-2 text-emerald-400 truncate font-bold">
                    {log.tenant_slug || 'sistema_global'}
                  </div>
                  <div className="col-span-2 text-zinc-300 truncate">
                    {log.action || 'indefinida'}
                  </div>
                  <div className="col-span-5 text-zinc-400 break-words">
                    {log.message || 'Sem detalhes fornecidos.'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export { SuperAdminLogsView };

