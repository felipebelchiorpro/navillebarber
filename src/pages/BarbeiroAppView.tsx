import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Scissors,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  UserCheck,
  ChevronRight,
  Lock,
  LogOut,
  RefreshCw,
  Sparkles,
  Phone,
  ShieldCheck,
  User
} from 'lucide-react';
import { pb, Barbearia, Profissional, Agendamento } from '../lib/pocketbase';
import { BarbeiroPerfilView } from '../components/BarbeiroPerfilView';

export default function BarbeiroAppView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutletContext<{ barbearia?: Barbearia }>() || {};

  // Estado da Barbearia & Barbeiro Autenticado
  const [barbearia, setBarbearia] = useState<Barbearia | null>(outlet.barbearia || null);
  const [barbeiro, setBarbeiro] = useState<Profissional | null>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<'hoje' | 'concluidos'>('hoje');
  const [tabAtiva, setTabAtiva] = useState<'fila' | 'comissoes' | 'servicos' | 'perfil'>(
    location.pathname.includes('/perfil') ? 'perfil' : 'fila'
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Estados de Autenticação / Login do Barbeiro
  const [listaProfissionais, setListaProfissionais] = useState<Profissional[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [pinAcesso, setPinAcesso] = useState<string>('');
  const [telefoneAcesso, setTelefoneAcesso] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const storageKey = slug ? `naville_barbeiro_sessao_${slug}` : 'naville_barbeiro_sessao';

  const getTodayIso = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 1. Carrega barbearia pelo slug se não veio via outlet
  useEffect(() => {
    const carregarBarbearia = async () => {
      if (!slug) return;
      try {
        const cleanSlug = slug.trim().toLowerCase();
        const b = await pb.collection('barbearias').getFirstListItem<Barbearia>(`slug="${cleanSlug}"`);
        setBarbearia(b);
      } catch (e) {
        console.warn('Erro ao carregar barbearia pelo slug:', e);
      }
    };

    if (!barbearia) {
      carregarBarbearia();
    }
  }, [slug, barbearia]);

  // 2. Carrega lista de profissionais da barbearia para seleção de login
  useEffect(() => {
    const carregarProfissionais = async () => {
      if (!barbearia?.id) return;
      try {
        const profs = await pb.collection('profissionais').getFullList<Profissional>({
          filter: `barbearia_id = "${barbearia.id}" && ativo = true`,
          sort: 'nome'
        });
        setListaProfissionais(profs);
        if (profs.length > 0 && !selectedProfId) {
          setSelectedProfId(profs[0].id);
        }
      } catch (e) {
        console.warn('Erro ao carregar profissionais:', e);
      }
    };

    if (barbearia?.id) {
      carregarProfissionais();
    }
  }, [barbearia?.id]);

  // 3. Tenta recuperar sessão persistida do barbeiro no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setBarbeiro(parsed);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar sessão local do barbeiro:', e);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  // 4. Carrega agendamentos do dia do profissional logado
  const carregarAgendamentos = useCallback(async () => {
    if (!barbearia?.id || !barbeiro?.id) return;
    try {
      setRefreshing(true);
      const today = getTodayIso();
      const records = await pb.collection('agendamentos').getFullList<any>({
        filter: `barbearia_id = "${barbearia.id}" && (barbeiro_id = "${barbeiro.id}" || profissional = "${barbeiro.id}") && data = "${today}"`,
        sort: 'horario'
      });
      setAgendamentos(records);
    } catch (err) {
      console.error('Erro ao carregar agendamentos do barbeiro:', err);
    } finally {
      setRefreshing(false);
    }
  }, [barbearia?.id, barbeiro?.id]);

  useEffect(() => {
    if (barbearia?.id && barbeiro?.id) {
      carregarAgendamentos();

      // Assina alterações em tempo real no PocketBase
      try {
        pb.collection('agendamentos').subscribe('*', () => {
          carregarAgendamentos();
        });
      } catch (e) {
        console.warn('Realtime subscription not available:', e);
      }

      return () => {
        try {
          pb.collection('agendamentos').unsubscribe('*');
        } catch {}
      };
    }
  }, [barbearia?.id, barbeiro?.id, carregarAgendamentos]);

  // Login simples do profissional por PIN ou Telefone
  const handleLoginBarbeiro = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const prof = listaProfissionais.find(p => p.id === selectedProfId);
      if (!prof) {
        setAuthError('Selecione o profissional para acessar.');
        setAuthLoading(false);
        return;
      }

      // Validação por PIN (se cadastrado) ou fallback '1234'
      const pinCorreto = prof.pin_acesso || '1234';
      const cleanTelefone = telefoneAcesso.replace(/\D/g, '');
      const profTelefone = (prof.telefone || '').replace(/\D/g, '');

      const pinValido = pinAcesso.trim() === pinCorreto;
      const telefoneValido = cleanTelefone && profTelefone && profTelefone.includes(cleanTelefone);

      if (pinValido || telefoneValido) {
        setBarbeiro(prof);
        localStorage.setItem(storageKey, JSON.stringify(prof));
        setPinAcesso('');
        setTelefoneAcesso('');
      } else {
        setAuthError('PIN ou Telefone incorreto. Verifique com a gerência.');
      }
    } catch (err) {
      console.error('Erro ao autenticar profissional:', err);
      setAuthError('Falha de conexão. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogoutBarbeiro = () => {
    localStorage.removeItem(storageKey);
    setBarbeiro(null);
    setAgendamentos([]);
  };

  const handleBarbeiroUpdated = (novoBarbeiro: Profissional) => {
    setBarbeiro(novoBarbeiro);
    try {
      localStorage.setItem(storageKey, JSON.stringify(novoBarbeiro));
    } catch (e) {
      console.warn('Erro ao persistir sessão atualizada:', e);
    }
  };

  // KPIs diários calculados
  const totalCortesHoje = agendamentos.filter(a => a.status === 'concluido').length;
  const faturamentoTotalHoje = agendamentos
    .filter(a => a.status === 'concluido')
    .reduce((acc, curr) => acc + (curr.valor || curr.valor_total || 0), 0);
  
  // Comissão calculada (ex: 50% ou taxa definida no cadastro)
  const taxaComissao = (barbeiro?.porcentagem_comissao || barbeiro?.taxa_comissao || 50) / 100;
  const minhaComissaoHoje = faturamentoTotalHoje * taxaComissao;

  const handleMudarStatus = async (id: string, novoStatus: string) => {
    try {
      await pb.collection('agendamentos').update(id, { status: novoStatus });
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: novoStatus } : a));
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err);
    }
  };

  // Filtra agendamentos conforme seleção da aba
  const agendamentosFiltrados = agendamentos.filter(item => {
    if (filtro === 'concluidos') {
      return item.status === 'concluido';
    }
    // 'hoje' exibe a fila de atendimento (pendente e em_andamento)
    return item.status !== 'concluido' && item.status !== 'cancelado';
  });

  // TELA DE LOGIN / AUTENTICAÇÃO SIMPLES DO BARBEIRO
  if (!barbeiro) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center px-4 py-8 max-w-md mx-auto border-x border-white/[0.05] relative select-none">
        <div className="w-full max-w-sm bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl p-6 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold mb-3 shadow-lg shadow-orange-500/20">
              <Scissors size={22} />
            </div>
            <h1 className="text-base font-bold text-white tracking-wide uppercase">
              App do Barbeiro
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {barbearia?.nome ? `${barbearia.nome} • Acesso Profissional` : 'Acesse sua fila do dia'}
            </p>
          </div>

          <form onSubmit={handleLoginBarbeiro} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Identifique-se
              </label>
              <select
                value={selectedProfId}
                onChange={(e) => setSelectedProfId(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                required
              >
                {listaProfissionais.length === 0 ? (
                  <option value="">Carregando profissionais...</option>
                ) : (
                  listaProfissionais.map((p) => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                      {p.nome} {p.apelido ? `(${p.apelido})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                <span>PIN de 4 dígitos</span>
                <span className="text-[10px] text-zinc-500">Padrão: 1234</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={pinAcesso}
                  onChange={(e) => setPinAcesso(e.target.value)}
                  placeholder="••••"
                  className="w-full py-2 pl-3 pr-10 text-sm tracking-widest text-center font-mono bg-black/60 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                  autoFocus
                />
                <Lock size={14} className="absolute right-3 top-2.5 text-zinc-500" />
              </div>
            </div>

            {authError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium animate-in fade-in">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/30 cursor-pointer disabled:opacity-50"
            >
              {authLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              <span>Entrar na Minha Fila</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(slug ? `/b/${slug}` : '/')}
              className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-300 pt-2 transition-colors cursor-pointer"
            >
              Voltar para a Vitrine Pública
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL DO APP DO BARBEIRO
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col max-w-md mx-auto border-x border-white/[0.05] relative pb-20 select-none">
      
      {/* 1. TOPBAR DO PROFISSIONAL */}
      <header className="p-4 border-b border-white/[0.05] bg-white/[0.01] backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <button
          type="button"
          onClick={() => setTabAtiva('perfil')}
          className="flex items-center gap-3 text-left cursor-pointer hover:opacity-85 transition-opacity"
          title="Ver Meu Perfil e Chave Pix"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
            {barbeiro?.nome ? barbeiro.nome.substring(0, 2).toUpperCase() : 'BB'}
          </div>
          <div>
            <h1 className="text-xs font-bold text-white flex items-center gap-1.5">
              {barbeiro?.nome || 'Felipe Barbeiro'}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </h1>
            <p className="text-[10px] text-zinc-500 truncate max-w-[160px]">{barbearia?.nome || 'Naville Barber'}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
            Comissão: {barbeiro?.porcentagem_comissao || barbeiro?.taxa_comissao || 50}%
          </div>
          <button
            onClick={handleLogoutBarbeiro}
            title="Trocar Barbeiro"
            className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* RENDERIZAÇÃO CONDICIONAL CONFORME ABA SELECIONADA */}
      {tabAtiva === 'perfil' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <BarbeiroPerfilView
            barbeiro={barbeiro}
            onBarbeiroUpdated={handleBarbeiroUpdated}
            onClose={() => setTabAtiva('fila')}
          />
        </div>
      ) : (
        <>
          {/* 2. CARDS DE RESUMO (COMISSÃO & FATURAMENTO DO DIA) */}
          <div className="p-4 grid grid-cols-2 gap-3 shrink-0">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md flex flex-col justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="text-emerald-500" size={12} /> Minha Comissão
              </span>
              <div className="mt-2">
                <p className="text-lg font-bold text-emerald-400">R$ {minhaComissaoHoje.toFixed(2).replace('.', ',')}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Líquido a receber hoje</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md flex flex-col justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Scissors className="text-orange-500" size={12} /> Cortes Hoje
              </span>
              <div className="mt-2">
                <p className="text-lg font-bold text-white">{totalCortesHoje} <span className="text-xs font-normal text-zinc-500">atendimentos</span></p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Total: R$ {faturamentoTotalHoje.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          </div>

          {/* 3. FILTROS RÁPIDOS */}
          <div className="px-4 flex items-center justify-between gap-2 mb-3">
            <div className="flex gap-2">
              <button 
                onClick={() => setFiltro('hoje')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filtro === 'hoje' ? 'bg-orange-600 text-white shadow-[0_0_12px_rgba(234,88,12,0.3)]' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
              >
                Fila de Atendimento
              </button>
              <button 
                onClick={() => setFiltro('concluidos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filtro === 'concluidos' ? 'bg-orange-600 text-white shadow-[0_0_12px_rgba(234,88,12,0.3)]' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
              >
                Histórico Hoje
              </button>
            </div>

            <button
              onClick={carregarAgendamentos}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-orange-400 transition-colors cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-orange-400' : ''} />
            </button>
          </div>

          {/* 4. LISTA DE CLIENTES / AGENDA DO BARBEIRO */}
          <div className="flex-1 px-4 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar">
            {agendamentosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-2 border border-dashed border-white/5 rounded-2xl">
                <Clock className="opacity-40" size={24} />
                <p className="text-xs">
                  {filtro === 'concluidos' ? 'Nenhum atendimento concluído hoje ainda.' : 'Nenhum atendimento na sua fila no momento.'}
                </p>
              </div>
            ) : (
              agendamentosFiltrados.map((item) => {
                const valorItem = item.valor || item.valor_total || 0;
                const comissaoItem = item.comissao_valor || (valorItem * taxaComissao);
                const isClube = item.cliente_nome?.toLowerCase().includes('vip') || item.cliente_nome?.toLowerCase().includes('clube') || item.is_clube;

                return (
                  <div key={item.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{item.cliente_nome}</span>
                          {isClube && (
                            <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded font-bold uppercase">Clube</span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{item.servico_nome || 'Corte'} • {item.horario || '14:30'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white">R$ {valorItem.toFixed(2).replace('.', ',')}</span>
                        <p className="text-[9px] text-emerald-400 font-medium">Sua parte: R$ {comissaoItem.toFixed(2).replace('.', ',')}</p>
                      </div>
                    </div>

                    {/* Botões de Ação do Barbeiro */}
                    <div className="flex gap-2 pt-2 border-t border-white/[0.03]">
                      {(item.status === 'pendente' || item.status === 'confirmado') && (
                        <button 
                          onClick={() => handleMudarStatus(item.id, 'em_andamento')}
                          className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-white/5 cursor-pointer"
                        >
                          <Play className="text-orange-400" size={12} /> Iniciar Corte
                        </button>
                      )}
                      
                      {item.status === 'em_andamento' && (
                        <button 
                          onClick={() => handleMudarStatus(item.id, 'concluido')}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer"
                        >
                          <CheckCircle2 size={13} /> Concluir Atendimento
                        </button>
                      )}

                      {item.status === 'concluido' && (
                        <span className="w-full text-center py-1 text-[10px] text-zinc-500 font-semibold flex items-center justify-center gap-1">
                          <UserCheck className="text-emerald-500" size={12} /> Atendimento finalizado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* 5. BARRA DE NAVEGAÇÃO INFERIOR FIXA */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-white/[0.05] px-4 py-2 flex justify-around z-30">
        <button
          onClick={() => { setTabAtiva('fila'); setFiltro('hoje'); }}
          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${tabAtiva === 'fila' ? 'text-orange-400' : 'text-zinc-500 hover:text-white'}`}
        >
          <Calendar size={16} />
          <span className="text-[9px] font-bold">Minha Fila</span>
        </button>
        <button
          onClick={() => { setTabAtiva('comissoes'); setFiltro('concluidos'); }}
          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${tabAtiva === 'comissoes' ? 'text-orange-400' : 'text-zinc-500 hover:text-white'}`}
        >
          <DollarSign size={16} />
          <span className="text-[9px] font-bold">Comissões</span>
        </button>
        <button
          onClick={() => setTabAtiva('servicos')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${tabAtiva === 'servicos' ? 'text-orange-400' : 'text-zinc-500 hover:text-white'}`}
        >
          <Scissors size={16} />
          <span className="text-[9px] font-bold">Serviços</span>
        </button>
        <button
          onClick={() => setTabAtiva('perfil')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${tabAtiva === 'perfil' ? 'text-orange-400' : 'text-zinc-500 hover:text-white'}`}
        >
          <User size={16} />
          <span className="text-[9px] font-bold">Meu Perfil</span>
        </button>
      </nav>

    </div>
  );
}

