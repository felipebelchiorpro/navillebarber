import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Scissors,
  ArrowUpRight,
  Receipt,
  Coins,
  RefreshCw,
  Wallet,
  Clock,
  Filter,
  Check,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';
import {
  Barbearia,
  Profissional,
  VendaBalcao,
  Agendamento,
  vendasBalcaoService,
  agendamentosService
} from '../services/pocketbase';

interface RelatoriosManagerProps {
  barbearia: Barbearia;
  profissionaisList: Profissional[];
}

type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'todos';

interface ComissaoProfissional {
  profissional: Profissional;
  taxaPercentual: number;
  totalAtendimentos: number;
  totalServicos: number;
  totalProdutos: number;
  valorComissao: number;
  saldoBarbearia: number;
  pago: boolean;
}

export const RelatoriosManager: React.FC<RelatoriosManagerProps> = ({
  barbearia,
  profissionaisList
}) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [vendas, setVendas] = useState<VendaBalcao[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado local para controle de pagamentos de comissão
  const [repassesPagos, setRepassesPagos] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`naville_repasses_${barbearia.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Carregar dados de vendas e agendamentos
  const carregarDadosFinanceiros = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [vendasList, agendamentosList] = await Promise.all([
        vendasBalcaoService.list(barbearia.id),
        agendamentosService.list(barbearia.id)
      ]);

      setVendas(vendasList);
      setAgendamentos(agendamentosList);
    } catch (err: any) {
      console.error('Erro ao carregar dados financeiros:', err);
      setErrorMsg('Falha ao carregar registros financeiros do PocketBase.');
    } finally {
      setLoading(false);
    }
  }, [barbearia.id]);

  useEffect(() => {
    carregarDadosFinanceiros();
  }, [carregarDadosFinanceiros]);

  const toggleRepassePago = (barbeiroId: string) => {
    setRepassesPagos(prev => {
      const updated = { ...prev, [barbeiroId]: !prev[barbeiroId] };
      try {
        localStorage.setItem(`naville_repasses_${barbearia.id}`, JSON.stringify(updated));
      } catch (e) {
        console.warn('Erro ao salvar repasse no storage:', e);
      }
      return updated;
    });
  };

  // Filtragem de dados pelo período selecionado
  const vendasFiltradas = useMemo(() => {
    const now = new Date();
    const hojeStr = now.toISOString().split('T')[0];

    return vendas.filter(v => {
      if (v.status_pagamento === 'cancelado') return false;
      if (periodo === 'todos') return true;

      const dataVenda = (v.created || '').split('T')[0] || (v.created || '').slice(0, 10);
      if (!dataVenda) return true;

      if (periodo === 'hoje') {
        return dataVenda === hojeStr;
      }

      if (periodo === 'semana') {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        const d7Str = d7.toISOString().split('T')[0];
        return dataVenda >= d7Str;
      }

      if (periodo === 'mes') {
        const anoAtual = now.getFullYear();
        const mesAtual = String(now.getMonth() + 1).padStart(2, '0');
        const prefixoMes = `${anoAtual}-${mesAtual}`;
        return dataVenda.startsWith(prefixoMes);
      }

      return true;
    });
  }, [vendas, periodo]);

  // Totalizadores Financeiros Principais (KPIs)
  const {
    faturamentoBruto,
    totalServicosBruto,
    totalProdutosBruto,
    totalDescontos,
    ticketMedio,
    totalComandas
  } = useMemo(() => {
    let bruto = 0;
    let servicos = 0;
    let produtos = 0;
    let descontos = 0;

    vendasFiltradas.forEach(v => {
      bruto += Number(v.valor_total) || 0;
      servicos += Number(v.subtotal_servicos) || 0;
      produtos += Number(v.subtotal_produtos) || 0;
      descontos += Number(v.desconto) || 0;
    });

    const comandas = vendasFiltradas.length;
    const ticket = comandas > 0 ? bruto / comandas : 0;

    return {
      faturamentoBruto: bruto,
      totalServicosBruto: servicos,
      totalProdutosBruto: produtos,
      totalDescontos: descontos,
      ticketMedio: ticket,
      totalComandas: comandas
    };
  }, [vendasFiltradas]);

  // Divisão das Métricas por Forma de Pagamento
  const metricasPagamento = useMemo(() => {
    const totais: Record<string, { valor: number; qtd: number }> = {
      pix: { valor: 0, qtd: 0 },
      cartao_credito: { valor: 0, qtd: 0 },
      cartao_debito: { valor: 0, qtd: 0 },
      dinheiro: { valor: 0, qtd: 0 },
      outros: { valor: 0, qtd: 0 }
    };

    vendasFiltradas.forEach(v => {
      const forma = v.forma_pagamento || 'pix';
      const val = Number(v.valor_total) || 0;

      if (totais[forma]) {
        totais[forma].valor += val;
        totais[forma].qtd += 1;
      } else {
        totais.outros.valor += val;
        totais.outros.qtd += 1;
      }
    });

    const labels: Record<string, { label: string; cor: string }> = {
      pix: { label: 'PIX Instantâneo', cor: '#10b981' },
      cartao_credito: { label: 'Cartão de Crédito', cor: '#3b82f6' },
      cartao_debito: { label: 'Cartão de Débito', cor: '#8b5cf6' },
      dinheiro: { label: 'Dinheiro Físico', cor: '#fbbf24' },
      outros: { label: 'Outros / Misto', cor: '#64748b' }
    };

    return Object.entries(totais).map(([key, data]) => {
      const percentual = faturamentoBruto > 0 ? (data.valor / faturamentoBruto) * 100 : 0;
      return {
        key,
        label: labels[key]?.label || key,
        cor: labels[key]?.cor || '#64748b',
        valor: data.valor,
        qtd: data.qtd,
        percentual
      };
    });
  }, [vendasFiltradas, faturamentoBruto]);

  // Cálculo Detalhado de Comissões por Profissional
  const extratoComissoes = useMemo((): ComissaoProfissional[] => {
    return profissionaisList.map(prof => {
      const taxa = prof.taxa_comissao > 1 ? prof.taxa_comissao / 100 : prof.taxa_comissao || 0.5;
      let totalAtendimentos = 0;
      let totalServicos = 0;
      let totalProdutos = 0;

      vendasFiltradas.forEach(venda => {
        // Verifica se a venda pertence ao profissional ou tem serviços atribuídos a ele
        const pertenceDireto = venda.barbeiro_id === prof.id;
        let teveServicoDoProfissional = false;

        if (Array.isArray(venda.itens_servicos)) {
          venda.itens_servicos.forEach(item => {
            const itemBarbeiro = item.barbeiro_id || venda.barbeiro_id;
            if (itemBarbeiro === prof.id) {
              totalServicos += Number(item.preco) || 0;
              teveServicoDoProfissional = true;
            }
          });
        }

        // Se a venda tem barbeiro atribuído mas itens_servicos é vazio ou não discriminado
        if (pertenceDireto && (!venda.itens_servicos || venda.itens_servicos.length === 0)) {
          totalServicos += Number(venda.subtotal_servicos) || 0;
          if (Number(venda.subtotal_servicos) > 0) {
            teveServicoDoProfissional = true;
          }
        }

        if (pertenceDireto && Number(venda.subtotal_produtos) > 0) {
          totalProdutos += Number(venda.subtotal_produtos) || 0;
        }

        if (teveServicoDoProfissional || (pertenceDireto && (venda.subtotal_servicos > 0 || venda.subtotal_produtos > 0))) {
          totalAtendimentos += 1;
        }
      });

      const valorComissao = totalServicos * taxa;
      const saldoBarbearia = totalServicos - valorComissao + totalProdutos;

      return {
        profissional: prof,
        taxaPercentual: taxa * 100,
        totalAtendimentos,
        totalServicos,
        totalProdutos,
        valorComissao,
        saldoBarbearia,
        pago: !!repassesPagos[prof.id]
      };
    });
  }, [profissionaisList, vendasFiltradas, repassesPagos]);

  // Total geral de comissões calculadas
  const totalComissoesGeral = useMemo(() => {
    return extratoComissoes.reduce((acc, curr) => acc + curr.valorComissao, 0);
  }, [extratoComissoes]);

  const faturamentoLiquidoBarbearia = useMemo(() => {
    return Math.max(0, faturamentoBruto - totalComissoesGeral);
  }, [faturamentoBruto, totalComissoesGeral]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
      
      {/* Cabeçalho da Aba & Seletor de Período */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0.75rem',
        padding: '0.85rem 1.15rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
            <span className="gold-badge" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
              <TrendingUp style={{ width: '0.7rem', height: '0.7rem' }} />
              Inteligência Financeira & BI
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Consolidado de Vendas e Comissões
            </span>
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
            Relatórios Financeiros & Repasses
          </h2>
        </div>

        {/* Botões de Filtro de Período */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.25rem', borderRadius: '0.65rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'semana', label: '7 Dias' },
            { id: 'mes', label: 'Este Mês' },
            { id: 'todos', label: 'Todo Histórico' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setPeriodo(opt.id as PeriodoFiltro)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.45rem',
                border: 'none',
                background: periodo === opt.id ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'transparent',
                color: periodo === opt.id ? '#000000' : 'var(--text-muted)',
                fontWeight: periodo === opt.id ? 800 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {opt.label}
            </button>
          ))}

          <button
            onClick={carregarDadosFinanceiros}
            title="Recarregar Dados"
            style={{
              padding: '0.35rem',
              borderRadius: '0.45rem',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} style={{ width: '0.8rem', height: '0.8rem' }} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.65rem',
          padding: '0.65rem 1rem',
          color: '#f87171',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle style={{ width: '0.95rem', height: '0.95rem' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid de KPIs Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        
        {/* Faturamento Bruto */}
        <div className="glass-panel" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Faturamento Bruto
            </span>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.45rem', background: 'rgba(251, 191, 36, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <DollarSign style={{ width: '0.95rem', height: '0.95rem' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
            R$ {faturamentoBruto.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            Serviços: R$ {totalServicosBruto.toFixed(2)} • Produtos: R$ {totalProdutosBruto.toFixed(2)}
          </div>
        </div>

        {/* Faturamento Líquido Barbearia */}
        <div className="glass-panel" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Líquido Barbearia
            </span>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.45rem', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Wallet style={{ width: '0.95rem', height: '0.95rem' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
            R$ {faturamentoLiquidoBarbearia.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            Saldo retido após comissões devidas
          </div>
        </div>

        {/* Total de Comissões a Repassar */}
        <div className="glass-panel" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Comissões a Pagar
            </span>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.45rem', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Coins style={{ width: '0.95rem', height: '0.95rem' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
            R$ {totalComissoesGeral.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {extratoComissoes.length} barbeiros com comissões ativas
          </div>
        </div>

        {/* Ticket Médio & Comandas */}
        <div className="glass-panel" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ticket Médio
            </span>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.45rem', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Receipt style={{ width: '0.95rem', height: '0.95rem' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
            R$ {ticketMedio.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {totalComandas} atendimentos registrados
          </div>
        </div>
      </div>

      {/* Seção 1: Repartição por Forma de Pagamento */}
      <div className="glass-panel" style={{ padding: '0.95rem 1.15rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <CreditCard style={{ width: '1rem', height: '1rem', color: '#fbbf24' }} />
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>
              Repartição por Forma de Pagamento
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              Entradas registradas nas comandas fechadas no período
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
          {metricasPagamento.map(met => (
            <div
              key={met.key}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '0.65rem',
                padding: '0.7rem 0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {met.label}
                </span>
                <span style={{ fontSize: '0.68rem', color: met.cor, fontWeight: 700 }}>
                  {met.percentual.toFixed(1)}%
                </span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>
                R$ {met.valor.toFixed(2)}
              </div>

              <div style={{
                height: '3px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '0.3rem'
              }}>
                <div style={{
                  height: '100%',
                  width: `${met.percentual}%`,
                  background: met.cor,
                  borderRadius: '2px',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                {met.qtd} {met.qtd === 1 ? 'transação' : 'transações'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção 2: Tabela de Extrato de Comissões por Barbeiro */}
      <div className="glass-panel" style={{ padding: '0.95rem 1.15rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scissors style={{ width: '1rem', height: '1rem', color: '#fbbf24' }} />
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>
                Extrato de Comissões por Profissional
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                Cálculo automático baseado na taxa configurada no Módulo 02
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Total Devido aos Barbeiros: <strong style={{ color: '#f59e0b' }}>R$ {totalComissoesGeral.toFixed(2)}</strong>
          </div>
        </div>

        {extratoComissoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Nenhum barbeiro ativo cadastrado para cálculo de comissões.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Profissional</th>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Comissão (%)</th>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Atendimentos</th>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Serviços Gerados</th>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Produtos</th>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Comissão a Pagar</th>
                  <th style={{ padding: '0.55rem 0.75rem' }}>Saldo Barbearia</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status Repasse</th>
                </tr>
              </thead>
              <tbody>
                {extratoComissoes.map(ext => (
                  <tr
                    key={ext.profissional.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: ext.pago ? 'rgba(16, 185, 129, 0.03)' : 'transparent'
                    }}
                  >
                    {/* Profissional */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.75rem'
                        }}>
                          {ext.profissional.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff' }}>
                            {ext.profissional.nome}
                          </div>
                          {ext.profissional.apelido && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              "{ext.profissional.apelido}"
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Taxa % */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span className="gold-badge" style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem' }}>
                        {ext.taxaPercentual.toFixed(0)}%
                      </span>
                    </td>

                    {/* Atendimentos */}
                    <td style={{ padding: '0.5rem 0.75rem', color: '#ffffff', fontWeight: 600 }}>
                      {ext.totalAtendimentos}
                    </td>

                    {/* Serviços Gerados */}
                    <td style={{ padding: '0.5rem 0.75rem', color: '#ffffff', fontWeight: 600 }}>
                      R$ {ext.totalServicos.toFixed(2)}
                    </td>

                    {/* Produtos */}
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-dim)' }}>
                      R$ {ext.totalProdutos.toFixed(2)}
                    </td>

                    {/* Comissão a Pagar */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <strong style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
                        R$ {ext.valorComissao.toFixed(2)}
                      </strong>
                    </td>

                    {/* Saldo Barbearia */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>
                        R$ {ext.saldoBarbearia.toFixed(2)}
                      </strong>
                    </td>

                    {/* Status Repasse / Ação */}
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleRepassePago(ext.profissional.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: ext.pago ? '#10b981' : 'rgba(245, 158, 11, 0.4)',
                          background: ext.pago ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                          color: ext.pago ? '#10b981' : '#f59e0b',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {ext.pago ? (
                          <>
                            <CheckCircle2 style={{ width: '0.85rem', height: '0.85rem' }} />
                            Repasse Pago
                          </>
                        ) : (
                          <>
                            <Coins style={{ width: '0.85rem', height: '0.85rem' }} />
                            Marcar Pago
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seção 3: Histórico Recente de Comandas do Período */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Receipt style={{ width: '1.15rem', height: '1.15rem', color: '#38bdf8' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Comandas e Vendas Registradas ({vendasFiltradas.length})
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Extrato detalhado das vendas computadas no painel
              </span>
            </div>
          </div>
        </div>

        {vendasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
            Nenhuma comanda ou venda registrada no período selecionado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {vendasFiltradas.slice(0, 10).map(v => (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '0.65rem',
                  padding: '0.75rem 1rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                    {v.cliente_nome || 'Cliente Balcão'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{v.created ? new Date(v.created).toLocaleDateString('pt-BR') : 'Hoje'}</span>
                    <span>•</span>
                    <span style={{ textTransform: 'uppercase', color: '#38bdf8', fontWeight: 600 }}>
                      {v.forma_pagamento}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                    R$ {Number(v.valor_total).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                    {v.status_pagamento.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
