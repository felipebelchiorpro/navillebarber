import React, { useEffect, useState } from 'react';
import { TrendingUp, BarChart3, Activity, Plus, X } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { evolutionApi } from '../services/evolutionApi';

export default function SuperAdminDashboard() {
  const [barbearias, setBarbearias] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Obrigatórios (Mínimo viável)
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [plano, setPlano] = useState('Starter');

  // Opcionais (Legal & Contato)
  const [proprietario, setProprietario] = useState('');
  const [telefone, setTelefone] = useState('');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const records = await pb.collection('barbearias').getFullList({ sort: '-created' });
        setBarbearias(records);
      } catch (err) {
        console.error('Erro ao carregar estatísticas:', err);
      }
    }
    fetchStats();
  }, []);

  // Auto-gera o slug mas permite edição livre depois
  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNome(val);
    setSlug(val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'));
  };

  const handleCriarBarbearia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pKey = plano.toLowerCase();
      const isStarter = pKey === 'starter';
      const isEliteOrEnterprise = pKey === 'elite' || pKey === 'enterprise';
      const maxCadeirasPadrao = isStarter ? 1 : pKey === 'pro' ? 5 : pKey === 'elite' ? 15 : 99;

      const novaBarbearia = await pb.collection('barbearias').create({
        nome,
        slug, // Salva exatamente o que estiver no campo
        plano,
        plano_saas: pKey,
        max_barbeiros: maxCadeirasPadrao,
        limite_profissionais: maxCadeirasPadrao,
        proprietario,
        nome_proprietario: proprietario || nome,
        telefone,
        telefone_proprietario: telefone || '',
        documento,
        email,
        status: 'ativa',
        // Módulos por Plano (WhatsApp em todos; Clube VIP a partir do Pro; Split somente Elite/Enterprise)
        modulo_whatsapp: true,
        vip_club_ativo: !isStarter,
        modulo_clube_vip: !isStarter,
        split_ativo: isEliteOrEnterprise,
        modulo_split_asaas: isEliteOrEnterprise,
        split_carencia_tipo: 'dias',
        split_dias_gratis: 30,
        split_data_ativacao: new Date().toISOString(),
        split_franquia_transacoes_mensal: 30,
        split_contador_mes_atual: 0,
        split_taxa_transacao: 0.35,
        split_mensalidade_modulo: 30.00,
        valor_modulo_split: 30.00,
        split_taxa_tipo: 'fixa',
        split_taxa_valor: 1.50,
        asaas_wallet_id: '',
        asaas_account_id: '',
        pix_tipo_chave: 'cnpj',
        pix_chave_repasse: '',
        banco_nome: 'Nubank',
      });
      evolutionApi.seedTenant(novaBarbearia.id).catch(() => {});
      setBarbearias([novaBarbearia, ...barbearias]);
      setIsModalOpen(false);
      // Limpa os campos
      setNome('');
      setSlug('');
      setProprietario('');
      setTelefone('');
      setDocumento('');
      setEmail('');
    } catch (error: any) {
      console.error(error);
      const detalhe = error?.response?.message || error?.message || '';
      alert(`Erro ao criar barbearia. ${detalhe ? `(${detalhe}) ` : ''}Verifique se o slug já está em uso.`);
    }
  };

  const totalAtivas = barbearias.filter(b => b.status === 'ativo' || b.status === 'ativa').length;
  const mrrTotal = barbearias.reduce((acc, b) => {
    if (b.status !== 'ativo' && b.status !== 'ativa') return acc;
    if (b.e_vitalicio) return acc;
    const p = (b.plano_saas || b.plano || '').toLowerCase();
    const valor = p === 'elite' || p === 'enterprise' ? 160.00 : p === 'pro' ? 99.90 : 69.90;
    return acc + valor;
  }, 0);

  const arpu = totalAtivas > 0 ? mrrTotal / totalAtivas : 0;
  const totalCanceladas = barbearias.filter(b => b.status === 'cancelada' || b.status === 'bloqueada').length;
  const churnRate = barbearias.length > 0 ? ((totalCanceladas / barbearias.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500 h-full w-full">
      <header className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-emerald-500" size={16} />
            Visão Global do SaaS
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Métricas de crescimento, faturamento e saúde da rede Naville.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
        >
          <Plus size={16} />
          <span>Nova Barbearia</span>
        </button>
      </header>

      {/* 4 KPIs Principais */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] h-20 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">MRR Total</span>
          <p className="text-xl font-bold text-white">
            R$ {mrrTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] h-20 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Ticket Médio (ARPU)</span>
          <p className="text-xl font-bold text-white">
            R$ {arpu.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] h-20 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Barbearias Ativas</span>
          <p className="text-xl font-bold text-white">{totalAtivas}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] h-20 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Taxa de Churn</span>
          <p className="text-xl font-bold text-zinc-400 flex items-center gap-1">
            <TrendingUp className="rotate-180 text-zinc-500" size={12} /> {churnRate}%
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="col-span-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col">
          <h3 className="text-xs font-bold text-white uppercase mb-4 flex items-center gap-2">
            <Activity className="text-emerald-500" size={14} /> Crescimento de Receita (6 meses)
          </h3>
          <div className="flex-1 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-zinc-600 text-xs bg-white/[0.01]">
            [Componente de Gráfico de Linha (Recharts) Entrará Aqui]
          </div>
        </div>
        <div className="col-span-1 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col">
          <h3 className="text-xs font-bold text-white uppercase mb-4">Distribuição de Planos</h3>
          <div className="flex-1 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-zinc-600 text-xs bg-white/[0.01]">
            [Gráfico de Rosca: Starter vs Pro vs Elite]
          </div>
        </div>
      </div>

      {/* MODAL DE NOVA BARBEARIA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="text-emerald-500" size={16} /> Cadastrar Novo Tenant
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Criação rápida. Preencha os dados oficiais depois, se preferir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCriarBarbearia} className="p-5 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BLOCO 1: SISTEMA (Recomendados) */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider border-b border-white/5 pb-1">
                    1. Dados do Sistema
                  </h4>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                      Nome da Barbearia *
                    </label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={handleNomeChange}
                      placeholder="Ex: Barbearia Zero Grau"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                      URL do Sistema (Slug) *
                    </label>
                    <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg overflow-hidden focus-within:border-emerald-500 transition-colors">
                      <span className="text-[10px] text-zinc-500 pl-3 py-1.5 bg-white/[0.02] border-r border-white/5">
                        /b/
                      </span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="zero-grau"
                        className="flex-1 bg-transparent px-3 py-1.5 text-xs text-emerald-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                      Plano Contratado *
                    </label>
                    <select
                      value={plano}
                      onChange={(e) => setPlano(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition-colors cursor-pointer appearance-none"
                    >
                      <option value="Starter" className="bg-zinc-900">Starter - 1 Cadeira (R$ 69,90)</option>
                      <option value="Pro" className="bg-zinc-900">Pro - Clube VIP (R$ 99,90)</option>
                      <option value="Elite" className="bg-zinc-900">Elite - Split + VIP (R$ 160,00)</option>
                      <option value="Enterprise" className="bg-zinc-900">Enterprise - Personalizado (Sob Consulta)</option>
                    </select>
                  </div>
                </div>

                {/* BLOCO 2: LEGAL & CONTATO (Opcionais) */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/5 pb-1">
                    2. Dados Oficiais (Opcional)
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                        Proprietário
                      </label>
                      <input
                        type="text"
                        value={proprietario}
                        onChange={(e) => setProprietario(e.target.value)}
                        placeholder="Nome do dono"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                        CPF / CNPJ
                      </label>
                      <input
                        type="text"
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value)}
                        placeholder="Apenas números"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                      WhatsApp (Para relatórios da IA)
                    </label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                      E-mail Comercial
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contato@barbearia.com"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex gap-2.5 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  Criar Instância
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { SuperAdminDashboard };
