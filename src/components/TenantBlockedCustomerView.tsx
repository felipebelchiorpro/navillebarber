import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  QrCode,
  Copy,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Lock,
  ExternalLink,
  DollarSign,
  HelpCircle,
  Building2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Barbearia, Usuario, Fatura, faturasService, saasService } from '../services/pocketbase';

interface TenantBlockedCustomerViewProps {
  user: Usuario;
  barbearia: Barbearia;
  faturaPendente?: Fatura | null;
  motivoBloqueio?: string;
  onRegularizado: (updatedBarbearia: Barbearia) => void;
}

export const TenantBlockedCustomerView: React.FC<TenantBlockedCustomerViewProps> = ({
  user,
  barbearia,
  faturaPendente: initialFatura,
  motivoBloqueio,
  onRegularizado,
}) => {
  const [fatura, setFatura] = useState<Fatura | null>(initialFatura || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [sucessoRegularizacao, setSucessoRegularizacao] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const valorFatura = fatura ? fatura.valor : 197.00;
  const pixCopiaECola = `00020126580014BR.GOV.BCB.PIX0136naville-saas-faturas@navillebarber.com520400005303986540${valorFatura.toFixed(2)}5802BR5918Naville Barber B2B6009Sao Paulo62070503***6304`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCopiaECola);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleSimularPagamento = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      let faturaId = fatura?.id;

      // Se não havia fatura no PocketBase, cria uma para registrar o pagamento
      if (!faturaId) {
        const novaFat = await faturasService.gerarFaturaSimulada(
          barbearia.id,
          (barbearia.plano_saas as any) || 'pro',
          valorFatura
        );
        faturaId = novaFat.id;
      }

      // Executa quitação simulada e liberação do Kill Switch
      const resultado = await faturasService.simularPagamento(faturaId, barbearia.id);
      setFatura(resultado.fatura);
      setSucessoRegularizacao(true);

      // Aguarda 1.2s para feedback visual e restaura o acesso
      setTimeout(() => {
        onRegularizado(resultado.barbearia);
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao processar pagamento simulado:', err);
      setErrorMsg(err?.message || 'Falha ao processar simulação de pagamento.');
      setIsProcessing(false);
    }
  };

  const handleBypassSuperadmin = async () => {
    if (user.papel !== 'superadmin') return;
    setIsProcessing(true);
    try {
      const atualizada = await saasService.updateStatusAssinatura(barbearia.id, 'ativo');
      onRegularizado(atualizada);
    } catch (err: any) {
      console.error('Erro ao desbloquear manualmente:', err);
      setErrorMsg(err?.message || 'Erro ao desbloquear barbearia.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'radial-gradient(ellipse at 50% 20%, rgba(220, 38, 38, 0.12) 0%, rgba(10, 10, 12, 0.95) 75%)',
    }}>
      <div style={{
        maxWidth: '720px',
        width: '100%',
        background: 'rgba(18, 18, 22, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '1.25rem',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(239, 68, 68, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow de aviso no topo */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444, #f59e0b, #ef4444)'
        }} />

        {/* Cabeçalho do Bloqueio */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
          <div style={{
            width: '3.75rem',
            height: '3.75rem',
            borderRadius: '1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert style={{ width: '2rem', height: '2rem', color: '#ef4444' }} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                border: '1px solid rgba(239, 68, 68, 0.4)'
              }}>
                Acesso Suspenso • Kill Switch
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                {barbearia.nome}
              </span>
            </div>

            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.02em', margin: 0 }}>
              Painel Temporariamente Bloqueado
            </h1>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.45rem', lineHeight: 1.5 }}>
              {motivoBloqueio || 'Identificamos pendência de faturamento na assinatura do seu plano SaaS da Barbearia.'}
              {' '}As operações de Agenda, PDV e configurações foram suspensas até a regularização.
            </p>
          </div>
        </div>

        {/* Card da Fatura Pendente */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '1rem',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fatura de Assinatura
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3f4f6' }}>
                {fatura?.descricao || `Mensalidade Plano ${(barbearia.plano_saas || 'Pro').toUpperCase()}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Vencimento: <strong style={{ color: '#f87171' }}>{fatura?.data_vencimento || barbearia.data_expiracao_plano || 'Imediato'}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Valor Total
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em' }}>
                R$ {valorFatura.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

          {/* Área de Regularização via PIX */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Mock QR Code PIX */}
            <div style={{
              width: '130px',
              height: '130px',
              background: '#ffffff',
              borderRadius: '0.75rem',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              position: 'relative'
            }}>
              <QrCode style={{ width: '100%', height: '100%', color: '#0f172a' }} />
              <div style={{
                position: 'absolute',
                background: '#fbbf24',
                color: '#000',
                fontSize: '0.55rem',
                fontWeight: 900,
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                bottom: '4px'
              }}>
                PIX LOCAL
              </div>
            </div>

            {/* Informações PIX e Código Copia e Cola */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
                Pague via PIX para liberação imediata:
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                padding: '0.6rem 0.85rem',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
                wordBreak: 'break-all',
                maxHeight: '48px',
                overflow: 'hidden'
              }}>
                {pixCopiaECola}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopyPix}
                  type="button"
                  style={{
                    background: copiedPix ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: copiedPix ? '#4ade80' : '#f3f4f6',
                    border: `1px solid ${copiedPix ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '0.5rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {copiedPix ? <CheckCircle2 style={{ width: '0.95rem', height: '0.95rem' }} /> : <Copy style={{ width: '0.95rem', height: '0.95rem' }} />}
                  <span>{copiedPix ? 'PIX Copiado!' : 'Copiar Código PIX'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangle style={{ width: '1.1rem', height: '1.1rem', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sucesso na Regularização */}
        {sucessoRegularizacao && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            color: '#4ade80',
            padding: '1rem',
            borderRadius: '0.75rem',
            textAlign: 'center',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem'
          }}>
            <CheckCircle2 style={{ width: '1.3rem', height: '1.3rem' }} />
            <span>Pagamento confirmado! Reativando painel da barbearia...</span>
          </div>
        )}

        {/* Ações de Desbloqueio e Simulação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <button
            onClick={handleSimularPagamento}
            disabled={isProcessing || sucessoRegularizacao}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000',
              fontWeight: 700,
              fontSize: '1rem',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '1rem 1.5rem',
              cursor: isProcessing || sucessoRegularizacao ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              boxShadow: '0 8px 20px rgba(217, 119, 6, 0.35)',
              transition: 'all 0.2s',
              opacity: isProcessing || sucessoRegularizacao ? 0.75 : 1
            }}
          >
            {isProcessing ? (
              <RefreshCw style={{ width: '1.2rem', height: '1.2rem', animation: 'spin 1s linear infinite' }} />
            ) : (
              <CheckCircle2 style={{ width: '1.2rem', height: '1.2rem' }} />
            )}
            <span>
              {isProcessing
                ? 'Validando Quitação...'
                : 'Confirmar Pagamento Simulado & Reativar Painel'}
            </span>
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Ambiente de Demonstração Local • Validação Instantânea sem Gateway Externo
            </span>

            {user.papel === 'superadmin' && (
              <button
                onClick={handleBypassSuperadmin}
                disabled={isProcessing}
                style={{
                  background: 'none',
                  border: '1px dashed #38bdf8',
                  color: '#38bdf8',
                  borderRadius: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <ShieldCheck style={{ width: '0.85rem', height: '0.85rem' }} />
                <span>SuperAdmin Bypass (Desbloquear Direto)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
