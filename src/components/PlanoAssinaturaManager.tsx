import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  DollarSign,
  FileText,
  Zap,
  ArrowUpRight,
  Sliders,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Plus
} from 'lucide-react';
import {
  Barbearia,
  Usuario,
  Fatura,
  faturasService,
  saasService,
  profissionaisService
} from '../services/pocketbase';
import { listarCobrancasClienteAsaas } from '../lib/asaas';

interface PlanoAssinaturaManagerProps {
  user: Usuario;
  barbearia: Barbearia;
  onBarbeariaUpdated: (barbearia: Barbearia) => void;
}

const PLANOS_INFO = {
  starter: {
    nome: 'Starter',
    valor: 97.00,
    limite: 2,
    beneficios: ['Até 2 Barbeiros', 'Agendamentos ilimitados', 'PDV Básico', 'Suporte padrão'],
    tag: 'Essencial'
  },
  pro: {
    nome: 'Pro',
    valor: 197.00,
    limite: 5,
    beneficios: ['Até 5 Barbeiros', 'Notificações WhatsApp', 'Clube de Assinaturas VIP', 'Relatórios Financeiros'],
    tag: 'Mais Popular'
  },
  enterprise: {
    nome: 'Enterprise',
    valor: 347.00,
    limite: 15,
    beneficios: ['Até 15 Barbeiros', 'Múltiplas Unidades', 'Automações Avançadas', 'Suporte Prioritário VIP'],
    tag: 'Máxima Escala'
  }
};

export const PlanoAssinaturaManager: React.FC<PlanoAssinaturaManagerProps> = ({
  user,
  barbearia,
  onBarbeariaUpdated,
}) => {
  const [currentBarb, setCurrentBarb] = useState<Barbearia>(barbearia);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loadingFaturas, setLoadingFaturas] = useState(true);
  const [barbeirosAtivosCount, setBarbeirosAtivosCount] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    setCurrentBarb(barbearia);
  }, [barbearia]);

  const planoKey = (currentBarb.plano_saas === 'basico' ? 'starter' : currentBarb.plano_saas) as 'starter' | 'pro' | 'enterprise';
  const planoAtual = PLANOS_INFO[planoKey] || PLANOS_INFO.pro;
  const limiteCadeiras = Math.max(
    1,
    Number(currentBarb.max_barbeiros) ||
    Number(currentBarb.limite_profissionais) ||
    (planoKey === 'starter' ? 2 : planoKey === 'pro' ? 5 : 15)
  );

  const carregarDados = async () => {
    try {
      setLoadingFaturas(true);
      const [faturasList, barbers] = await Promise.all([
        faturasService.list(currentBarb.id),
        profissionaisService.list(currentBarb.id),
      ]);

      const listaFinal = [...faturasList];

      // Se a barbearia estiver vinculada ao Asaas, sincroniza o status e comprovantes em tempo real
      if (currentBarb.asaas_id) {
        try {
          const cobrancasAsaas = await listarCobrancasClienteAsaas(currentBarb.asaas_id);
          for (const cob of cobrancasAsaas) {
            const link = cob.invoiceUrl || cob.bankSlipUrl || '';
            const faturaExistente = listaFinal.find(f => f.link_pagamento === link);
            const isPago = cob.status === 'RECEIVED' || cob.status === 'CONFIRMED' || cob.status === 'RECEIVED_IN_CASH';
            const isAtrasado = cob.status === 'OVERDUE';
            const statusAtualizado = isPago ? 'pago' : isAtrasado ? 'atrasado' : 'pendente';

            if (faturaExistente) {
              if (faturaExistente.status !== statusAtualizado) {
                await faturasService.update(faturaExistente.id, {
                  status: statusAtualizado,
                  comprovante: isPago ? link : faturaExistente.comprovante,
                  data_pagamento: cob.paymentDate || (isPago ? new Date().toISOString() : undefined),
                });
                faturaExistente.status = statusAtualizado;
                if (isPago) faturaExistente.comprovante = link;
              }
            } else {
              // Fatura emitida no Asaas mas ainda não inserida no PocketBase
              const nova = await faturasService.create({
                barbearia_id: currentBarb.id,
                descricao: cob.description || 'Fatura SaaS Naville Barber',
                valor: Number(cob.value),
                data_vencimento: cob.dueDate,
                status: statusAtualizado,
                metodo_pagamento: cob.billingType === 'BOLETO' ? 'boleto' : cob.billingType === 'CREDIT_CARD' ? 'cartao' : 'pix',
                link_pagamento: link,
                comprovante: isPago ? link : '',
                data_pagamento: cob.paymentDate,
              });
              listaFinal.unshift(nova);
            }
          }
        } catch (asaasErr) {
          console.warn('Aviso: Não foi possível sincronizar com Asaas no momento:', asaasErr);
        }
      }

      setFaturas(listaFinal);
      setBarbeirosAtivosCount(barbers.filter(b => b.ativo).length);
    } catch (err) {
      console.error('Erro ao carregar faturas/barbeiros:', err);
    } finally {
      setLoadingFaturas(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [currentBarb.id]);

  const showFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedbackMsg({ tipo, texto });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handlePagarFatura = async (faturaId: string) => {
    setActionLoading(true);
    try {
      const res = await faturasService.simularPagamento(faturaId, currentBarb.id);
      showFeedback('sucesso', 'Fatura quitada com sucesso! Acesso e vigência renovados.');
      setCurrentBarb(res.barbearia);
      onBarbeariaUpdated(res.barbearia);
      await carregarDados();
    } catch (err: any) {
      showFeedback('erro', err?.message || 'Falha ao liquidar fatura.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBloqueioAuto = async () => {
    setActionLoading(true);
    try {
      const novoValor = !(currentBarb.bloqueio_automatico ?? true);
      const atualizada = await saasService.alternarBloqueioAutomatico(currentBarb.id, novoValor);
      setCurrentBarb(atualizada);
      onBarbeariaUpdated(atualizada);
      showFeedback('sucesso', `Bloqueio automático ${novoValor ? 'ativado' : 'desativado'}.`);
    } catch (err: any) {
      showFeedback('erro', 'Erro ao alterar configuração de bloqueio.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTrocarPlano = async (novoPlano: 'starter' | 'pro' | 'enterprise') => {
    setActionLoading(true);
    try {
      const info = PLANOS_INFO[novoPlano];
      const atualizada = await saasService.updatePlanoConfig(currentBarb.id, {
        plano_saas: novoPlano,
        limite_profissionais: info.limite,
      });
      setCurrentBarb(atualizada);
      onBarbeariaUpdated(atualizada);
      showFeedback('sucesso', `Plano migrado para ${info.nome}! Limite atualizado para ${info.limite} cadeiras.`);
    } catch (err: any) {
      console.error('Erro ao migrar plano:', err);
      showFeedback('erro', `Erro ao atualizar plano: ${err?.message || 'Falha na requisição'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGerarNovaFatura = async () => {
    setActionLoading(true);
    try {
      await faturasService.gerarFaturaSimulada(currentBarb.id, planoKey, planoAtual.valor);
      showFeedback('sucesso', 'Nova fatura mensal gerada com sucesso.');
      await carregarDados();
    } catch (err: any) {
      showFeedback('erro', 'Erro ao gerar fatura simulada.');
    } finally {
      setActionLoading(false);
    }
  };

  // Funções de Teste do Kill Switch solicitadas no Checklist
  const handleSimularKillSwitchBloqueio = async () => {
    setActionLoading(true);
    try {
      const atualizada = await saasService.updateStatusAssinatura(currentBarb.id, 'bloqueado');
      showFeedback('sucesso', 'Barbearia colocada em status "bloqueado". O Kill Switch será acionado!');
      setCurrentBarb(atualizada);
      onBarbeariaUpdated(atualizada);
    } catch (err: any) {
      showFeedback('erro', 'Erro ao simular bloqueio.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimularExpiracaoVencimento = async () => {
    setActionLoading(true);
    try {
      // Data de ontem
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 2);
      const dataOntem = ontem.toISOString().split('T')[0];

      const atualizada = await saasService.updatePlanoConfig(currentBarb.id, {
        plano_saas: currentBarb.plano_saas,
        data_expiracao_plano: dataOntem,
      });
      showFeedback('sucesso', `Data de expiração alterada para ${dataOntem} (expirada).`);
      setCurrentBarb(atualizada);
      onBarbeariaUpdated(atualizada);
    } catch (err: any) {
      showFeedback('erro', 'Erro ao simular expiração.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestaurarStatusAtivo = async () => {
    setActionLoading(true);
    try {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 30);
      const dataFuturo = futuro.toISOString().split('T')[0];

      let atualizada = await saasService.updateStatusAssinatura(currentBarb.id, 'ativo');
      atualizada = await saasService.updatePlanoConfig(currentBarb.id, {
        plano_saas: currentBarb.plano_saas,
        data_expiracao_plano: dataFuturo,
      });
      showFeedback('sucesso', 'Acesso restaurado como ATIVO e vigência estendida.');
      setCurrentBarb(atualizada);
      onBarbeariaUpdated(atualizada);
    } catch (err: any) {
      showFeedback('erro', 'Erro ao restaurar status ativo.');
    } finally {
      setActionLoading(false);
    }
  };

  const percentCadeiras = Math.min(100, Math.round((barbeirosAtivosCount / limiteCadeiras) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Notificação / Feedback */}
      {feedbackMsg && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '0.75rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: feedbackMsg.tipo === 'sucesso' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedbackMsg.tipo === 'sucesso' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          color: feedbackMsg.tipo === 'sucesso' ? '#4ade80' : '#f87171'
        }}>
          {feedbackMsg.tipo === 'sucesso' ? (
            <CheckCircle2 style={{ width: '1.2rem', height: '1.2rem', flexShrink: 0 }} />
          ) : (
            <AlertTriangle style={{ width: '1.2rem', height: '1.2rem', flexShrink: 0 }} />
          )}
          <span>{feedbackMsg.texto}</span>
        </div>
      )}

      {/* Cards de Métricas Principais da Assinatura */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Card 1: Plano Atual */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plano B2B Atual
            </span>
            <span style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              {planoAtual.tag}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f3f4f6' }}>
              {planoAtual.nome}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
              • R$ {planoAtual.valor.toFixed(2)}/mês
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Status da Conta:{' '}
            <strong style={{
              color: currentBarb.status_assinatura === 'bloqueado' || currentBarb.status === 'bloqueado'
                ? '#ef4444'
                : '#22c55e',
              textTransform: 'uppercase'
            }}>
              {currentBarb.status_assinatura || currentBarb.status || 'ativo'}
            </strong>
          </div>
        </div>

        {/* Card 2: Limite de Profissionais / Cadeiras */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cadeiras / Barbeiros
            </span>
            <Users style={{ width: '1.1rem', height: '1.1rem', color: '#38bdf8' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8' }}>
              {barbeirosAtivosCount}
            </span>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              de {limiteCadeiras} permitidos
            </span>
          </div>

          {/* Barra de Progresso de Uso de Cadeiras */}
          <div>
            <div style={{
              height: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${percentCadeiras}%`,
                background: percentCadeiras >= 100 ? '#ef4444' : percentCadeiras > 80 ? '#f59e0b' : '#38bdf8',
                borderRadius: '9999px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
              <span>{percentCadeiras}% de ocupação</span>
              <span>{limiteCadeiras - barbeirosAtivosCount} vagas disponíveis</span>
            </div>
          </div>
        </div>

        {/* Card 3: Vigência & Vencimento */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Próximo Vencimento
            </span>
            <Calendar style={{ width: '1.1rem', height: '1.1rem', color: '#fbbf24' }} />
          </div>

          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f3f4f6' }}>
            {currentBarb.data_expiracao_plano || '2026-11-28'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Bloqueio automático:
            </span>
            <button
              onClick={handleToggleBloqueioAuto}
              disabled={actionLoading}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: currentBarb.bloqueio_automatico !== false ? '#22c55e' : 'var(--text-dim)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {currentBarb.bloqueio_automatico !== false ? (
                <>
                  <ToggleRight style={{ width: '1.5rem', height: '1.5rem', color: '#22c55e' }} />
                  <span>Ativo</span>
                </>
              ) : (
                <>
                  <ToggleLeft style={{ width: '1.5rem', height: '1.5rem', color: 'var(--text-dim)' }} />
                  <span>Inativo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Painel Especial de Teste do Kill Switch (Requisito do Checklist) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '1rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.5rem',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert style={{ width: '1.2rem', height: '1.2rem', color: '#ef4444' }} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#f87171' }}>
                Simulador de Kill Switch (Auditoria & Testes do Módulo 06)
              </h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Alterne o status local no PocketBase para comprovar a rota de bloqueio automático e a posterior reativação.
              </p>
            </div>
          </div>

          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
            Ambiente Local: 127.0.0.1:8090
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSimularKillSwitchBloqueio}
            disabled={actionLoading}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#f87171',
              borderRadius: '0.5rem',
              padding: '0.38rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <ShieldAlert style={{ width: '0.9rem', height: '0.9rem' }} />
            <span>Simular Bloqueio Imediato (Kill Switch)</span>
          </button>

          <button
            onClick={handleSimularExpiracaoVencimento}
            disabled={actionLoading}
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              borderRadius: '0.5rem',
              padding: '0.38rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <Clock style={{ width: '0.9rem', height: '0.9rem' }} />
            <span>Simular Vencimento Expirado (-2 dias)</span>
          </button>

          <button
            onClick={handleRestaurarStatusAtivo}
            disabled={actionLoading}
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#4ade80',
              borderRadius: '0.5rem',
              padding: '0.38rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle2 style={{ width: '0.9rem', height: '0.9rem' }} />
            <span>Restaurar Status Ativo (+30 dias)</span>
          </button>
        </div>
      </div>

      {/* Histórico de Faturas Geradas */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText style={{ width: '1.2rem', height: '1.2rem', color: '#fbbf24' }} />
              <span>Histórico de Faturas SaaS</span>
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Cobranças mensais de software emitidas para esta barbearia.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleGerarNovaFatura}
              disabled={actionLoading}
              className="gold-btn"
              style={{
                fontSize: '0.75rem',
                padding: '0.38rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Plus style={{ width: '0.9rem', height: '0.9rem' }} />
              <span>Gerar Fatura Simulação</span>
            </button>

            <button
              onClick={carregarDados}
              disabled={loadingFaturas}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                borderRadius: '0.5rem',
                padding: '0.38rem 0.65rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem'
              }}
            >
              <RefreshCw style={{ width: '0.85rem', height: '0.85rem', animation: loadingFaturas ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Lista de Faturas */}
        {loadingFaturas ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
            Carregando faturas do PocketBase...
          </div>
        ) : faturas.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '0.75rem',
            border: '1px dashed var(--border-subtle)'
          }}>
            <FileText style={{ width: '2.5rem', height: '2.5rem', color: 'var(--text-dim)', margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Nenhuma fatura encontrada.</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Clique em "Gerar Fatura Simulação" para criar o primeiro registro.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faturas.map((fat) => {
              const isPago = fat.status === 'pago';
              const isAtrasado = fat.status === 'atrasado';

              return (
                <div
                  key={fat.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      background: isPago ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isPago ? (
                        <CheckCircle2 style={{ width: '1.3rem', height: '1.3rem', color: '#4ade80' }} />
                      ) : (
                        <Clock style={{ width: '1.3rem', height: '1.3rem', color: '#fbbf24' }} />
                      )}
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f3f4f6' }}>
                        {fat.descricao || 'Mensalidade SaaS'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                        Vencimento: <strong style={{ color: isAtrasado ? '#f87171' : 'var(--text-muted)' }}>{fat.data_vencimento}</strong>
                        {' '}• Método: <span style={{ textTransform: 'uppercase' }}>{fat.metodo_pagamento}</span>
                        {fat.data_pagamento && (
                          <span> • Pago em: {fat.data_pagamento.substring(0, 10)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>
                        R$ {fat.valor.toFixed(2)}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: isPago
                          ? 'rgba(34, 197, 94, 0.2)'
                          : isAtrasado
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                        color: isPago ? '#4ade80' : isAtrasado ? '#f87171' : '#fbbf24',
                        border: `1px solid ${isPago ? 'rgba(34, 197, 94, 0.4)' : isAtrasado ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                      }}>
                        {fat.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isPago ? (
                        (fat.link_pagamento || fat.comprovante) ? (
                          <a
                            href={fat.comprovante || fat.link_pagamento}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              borderRadius: '0.5rem',
                              padding: '0.45rem 0.85rem',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            <ExternalLink style={{ width: '0.9rem', height: '0.9rem' }} />
                            <span>Ver Comprovante</span>
                          </a>
                        ) : null
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {fat.link_pagamento && (
                            <a
                              href={fat.link_pagamento}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '0.5rem',
                                padding: '0.45rem 0.95rem',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                              }}
                            >
                              <ExternalLink style={{ width: '0.9rem', height: '0.9rem' }} />
                              <span>Pagar Fatura (PIX, Boleto ou Cartão)</span>
                            </a>
                          )}
                          <button
                            onClick={() => handlePagarFatura(fat.id)}
                            disabled={actionLoading}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '0.5rem',
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Simulação manual de baixa para testes locais"
                          >
                            <CheckCircle2 style={{ width: '0.85rem', height: '0.85rem' }} />
                            <span>Simular Baixa</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Planos Disponíveis para Migração / Upgrade */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap style={{ width: '1.2rem', height: '1.2rem', color: '#38bdf8' }} />
            <span>Opções de Planos B2B</span>
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Escale as cadeiras e recursos contratados para a sua barbearia.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>
          {(Object.keys(PLANOS_INFO) as Array<'starter' | 'pro' | 'enterprise'>).map((key) => {
            const p = PLANOS_INFO[key];
            const isCurrent = planoKey === key;

            return (
              <div
                key={key}
                style={{
                  background: isCurrent ? 'rgba(217, 119, 6, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: isCurrent ? '2px solid #fbbf24' : '1px solid var(--border-subtle)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  position: 'relative'
                }}
              >
                {isCurrent && (
                  <span style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '15px',
                    background: '#fbbf24',
                    color: '#000',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    textTransform: 'uppercase'
                  }}>
                    Plano Ativo
                  </span>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f3f4f6' }}>
                      {p.nome}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {p.limite} cadeiras
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24' }}>
                      R$ {p.valor.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      / mês
                    </span>
                  </div>

                  <ul style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem'
                  }}>
                    {p.beneficios.map((b, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <CheckCircle2 style={{ width: '0.9rem', height: '0.9rem', color: '#22c55e', flexShrink: 0 }} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleTrocarPlano(key)}
                  disabled={isCurrent || actionLoading}
                  style={{
                    background: isCurrent ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${isCurrent ? 'transparent' : 'rgba(255, 255, 255, 0.15)'}`,
                    color: isCurrent ? 'var(--text-dim)' : '#f3f4f6',
                    padding: '0.65rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isCurrent || actionLoading ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  {isCurrent ? 'Plano Atual em Uso' : `Migrar para ${p.nome}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
