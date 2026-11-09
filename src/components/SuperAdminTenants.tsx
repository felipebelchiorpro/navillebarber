import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  MessageCircle,
  Store,
  Crown,
  Settings,
  CheckCircle2,
  Lock,
  Unlock,
  ExternalLink,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { pb, Barbearia, barbeariasService } from '../services/pocketbase';

export default function SuperAdminTenants() {
  const navigate = useNavigate();
  const [barbearias, setBarbearias] = useState<Barbearia[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Barbearia | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modal para criar nova barbearia
  const [modalCriarOpen, setModalCriarOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoSlug, setNovoSlug] = useState('');
  const [novoProprietario, setNovoProprietario] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoPlano, setNovoPlano] = useState<'starter' | 'pro' | 'enterprise'>('starter');
  const [criando, setCriando] = useState(false);

  async function fetchTenants() {
    try {
      setLoading(true);
      const records = await pb.collection('barbearias').getFullList<Barbearia>({
        sort: '-created'
      });
      setBarbearias(records);
      if (records.length > 0) {
        setSelectedTenant(prev => {
          if (!prev) return records[0];
          const found = records.find(b => b.id === prev.id);
          return found || records[0];
        });
      }
    } catch (error) {
      console.error('Erro ao carregar barbearias:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleToggleBloqueio = async () => {
    if (!selectedTenant) return;
    try {
      setUpdating(true);
      const novoStatus = selectedTenant.status === 'bloqueado' ? 'ativo' : 'bloqueado';
      const updated = await barbeariasService.updateStatus(selectedTenant.id, novoStatus, novoStatus);
      setSelectedTenant(updated);
      setBarbearias(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    } catch (err) {
      console.error('Erro ao alternar status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCriarBarbearia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoSlug.trim()) return;

    try {
      setCriando(true);
      const nova = await barbeariasService.create({
        nome: novoNome.trim(),
        slug: novoSlug.trim().toLowerCase(),
        nome_proprietario: novoProprietario.trim() || 'Proprietário',
        telefone_proprietario: novoTelefone.trim() || '',
        status: 'ativo',
        status_assinatura: 'ativo',
        plano_saas: novoPlano,
        e_vitalicio: false,
        max_barbeiros: novoPlano === 'starter' ? 2 : novoPlano === 'pro' ? 5 : 15,
        valor_adicional_barbeiro: 25.0,
        bloqueio_automatico: false,
        e_publico: true,
      });

      setBarbearias(prev => [nova, ...prev]);
      setSelectedTenant(nova);
      setModalCriarOpen(false);
      setNovoNome('');
      setNovoSlug('');
      setNovoProprietario('');
      setNovoTelefone('');
    } catch (err) {
      console.error('Erro ao cadastrar barbearia:', err);
    } finally {
      setCriando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-emerald-500 text-sm">
        Carregando Lojas Clientes (Tempo Real)...
      </div>
    );
  }

  const totalBarbearias = barbearias.length;
  const ativas = barbearias.filter(b => (b.status as string) === 'ativa' || b.status === 'ativo').length;
  const mrrSimulado = ativas * 99.90;

  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-500 h-full w-full">
      <header className="flex items-center justify-between shrink-0 mb-1">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Store className="text-emerald-500" size={16} />
            Gestão de Lojas Clientes (Tenants)
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Configuração de acessos, cotas de cadeiras, planos e governança individual.
          </p>
        </div>
        <button
          onClick={() => setModalCriarOpen(true)}
          className="bg-white text-black px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus size={14} /> Nova Barbearia
        </button>
      </header>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
        <div className="p-3 rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-sm flex flex-col justify-between h-20">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase">Receita Recorrente (MRR)</h3>
          <p className="text-xl font-bold text-white">R$ {mrrSimulado.toFixed(2).replace('.', ',')}</p>
        </div>

        <div className="p-3 rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-sm flex flex-col justify-between h-20">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase">Rede de Barbearias</h3>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500"></span> {ativas} ativas
            </span>
          </div>
          <p className="text-xl font-bold text-white">{totalBarbearias}</p>
        </div>

        <div className="p-3 rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-sm flex flex-col justify-between h-20">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase">Faturamento SaaS</h3>
          <p className="text-xl font-bold text-white">
            R$ 0,00 <span className="text-[10px] text-zinc-500 font-normal">gateway</span>
          </p>
        </div>

        <div className="p-3 rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-sm flex flex-col justify-between h-20">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase">Motor WhatsApp</h3>
          <p className="text-xl font-bold text-white flex items-baseline gap-1">
            {ativas} <span className="text-[10px] text-emerald-500 font-normal">conectadas</span>
          </p>
        </div>
      </div>

      {/* Área Dividida */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-4 flex flex-col rounded-xl backdrop-blur-md bg-white/[0.02] border border-white/[0.05] overflow-hidden">
          <div className="p-2.5 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1.5">
              <Store size={12} /> Estabelecimentos
            </h3>
            <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-500 font-mono">
              {totalBarbearias}
            </span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
            {barbearias.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Nenhuma barbearia encontrada.</p>
            ) : (
              barbearias.map(b => (
                <div
                  key={b.id}
                  onClick={() => setSelectedTenant(b)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                    selectedTenant?.id === b.id
                      ? 'bg-white/[0.05] border-emerald-500/30'
                      : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center font-bold text-white text-[10px]">
                      {b.nome ? b.nome.substring(0, 2).toUpperCase() : 'BB'}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white truncate max-w-[120px]">
                        {b.nome || 'Sem Nome'}
                      </p>
                      <p className="text-[9px] text-zinc-500">/b/{b.slug}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border ${
                      (b.status as string) === 'ativa' || b.status === 'ativo'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {b.status || 'Pendente'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedTenant ? (
          <div className="col-span-8 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 pb-4">
            <div className="flex items-start justify-between bg-white/[0.01] p-4 rounded-xl border border-white/[0.05]">
              <div>
                <div className="flex gap-2 mb-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Visão Corporativa</span>
                  <span className="text-[9px] font-bold text-emerald-500 uppercase border border-emerald-500/20 px-1 rounded">
                    {selectedTenant.plano_saas || (selectedTenant as any).plano || 'Starter'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedTenant.nome || 'Barbearia Sem Nome'}
                </h2>
                <p className="text-[10px] text-zinc-400 mt-1">
                  ID: {selectedTenant.id} • Criado em: {selectedTenant.created ? new Date(selectedTenant.created).toLocaleDateString() : 'Recente'}
                </p>
              </div>

              <a
                href={`/b/${selectedTenant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[11px] transition-colors"
              >
                <span>Ver Vitrine</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[9px] font-bold text-zinc-500 uppercase">Faturamento Mensal SaaS</span>
                <p className="text-lg font-bold text-white mt-1">
                  {selectedTenant.e_vitalicio ? 'R$ 0,00 (Isento)' : 'R$ 99,90'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[9px] font-bold text-zinc-500 uppercase">Status Operacional</span>
                <p
                  className={`text-sm font-bold mt-2 uppercase ${
                    (selectedTenant.status as string) === 'ativo' || (selectedTenant.status as string) === 'ativa'
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  }`}
                >
                  {selectedTenant.status || 'Desconhecido'}
                </p>
              </div>

              <div
                onClick={handleToggleBloqueio}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.04] transition-colors"
              >
                {selectedTenant.status === 'bloqueado' ? (
                  <>
                    <Unlock className="text-emerald-400 mb-1" size={14} />
                    <span className="text-[10px] font-bold text-emerald-400">Desbloquear Acesso</span>
                  </>
                ) : (
                  <>
                    <Lock className="text-red-400 mb-1" size={14} />
                    <span className="text-[10px] font-bold text-red-400">Bloquear Acesso</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="col-span-8 flex flex-col items-center justify-center rounded-xl bg-white/[0.01] border border-white/[0.05] text-zinc-500 text-xs">
            <Store className="opacity-30 mb-2" size={24} />
            Selecione uma barbearia na lista para ver os detalhes.
          </div>
        )}
      </div>

      {/* Modal Nova Barbearia */}
      {modalCriarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0d131f] border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-2xl relative text-zinc-100">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white">Nova Barbearia</h3>
              <button onClick={() => setModalCriarOpen(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCriarBarbearia} className="flex flex-col gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-300 mb-1 uppercase">Nome *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Barbearia Belchior"
                  value={novoNome}
                  onChange={e => {
                    setNovoNome(e.target.value);
                    setNovoSlug(
                      e.target.value
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '')
                    );
                  }}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-300 mb-1 uppercase">Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="zero-grau"
                  value={novoSlug}
                  onChange={e => setNovoSlug(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-1 text-xs text-emerald-400 font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08] mt-1">
                <button
                  type="button"
                  onClick={() => setModalCriarOpen(false)}
                  className="px-2.5 py-1 rounded text-zinc-400 hover:text-white text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criando}
                  className="bg-emerald-600 text-white px-3 py-1 rounded font-semibold hover:bg-emerald-500 text-xs"
                >
                  {criando ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { SuperAdminTenants };

