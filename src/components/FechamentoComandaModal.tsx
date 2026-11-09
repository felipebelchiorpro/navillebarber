import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Scissors,
  DollarSign,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
  Receipt,
  AlertTriangle,
  User,
  Phone,
  Printer,
  Crown
} from 'lucide-react';
import {
  Agendamento,
  Servico,
  Profissional,
  Produto,
  ItemServicoVenda,
  ItemProdutoVenda,
  VendaBalcao,
  vendasBalcaoService,
  authService,
  Cliente,
  PlanoAssinatura,
  ValidacaoVipResult,
  validarElegibilidadeVip,
  clientesService,
  planosService,
} from '../services/pocketbase';

export interface ItemServicoComanda extends ItemServicoVenda {
  precoOriginal?: number;
  cobertoVip?: boolean;
}

interface FechamentoComandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barbeariaId: string;
  agendamento?: Agendamento | null;
  servicesList: Servico[];
  profissionaisList: Profissional[];
  produtosList: Produto[];
}

export const FechamentoComandaModal: React.FC<FechamentoComandaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  barbeariaId,
  agendamento,
  servicesList,
  profissionaisList,
  produtosList,
}) => {
  // Dados do cliente e profissional
  const [clienteNome, setClienteNome] = useState<string>(agendamento?.cliente_nome || '');
  const [clienteTelefone, setClienteTelefone] = useState<string>(agendamento?.cliente_telefone || '');
  const [barbeiroId, setBarbeiroId] = useState<string>(agendamento?.barbeiro_id || (profissionaisList[0]?.id || ''));

  // Estados de Assinatura VIP
  const [clienteVip, setClienteVip] = useState<Cliente | null>(null);
  const [planoVip, setPlanoVip] = useState<PlanoAssinatura | null>(null);
  const [vipResult, setVipResult] = useState<ValidacaoVipResult | null>(null);
  const [searchingVip, setSearchingVip] = useState<boolean>(false);

  // Itens de serviços na comanda
  const [selectedServices, setSelectedServices] = useState<ItemServicoComanda[]>([]);

  // Itens de produtos na comanda: { id, nome, preco_unitario, quantidade, subtotal }
  const [selectedProducts, setSelectedProducts] = useState<ItemProdutoVenda[]>([]);

  // Sincroniza estados quando o modal abre ou o agendamento muda
  useEffect(() => {
    if (!isOpen) return;

    if (agendamento) {
      setClienteNome(agendamento.cliente_nome || '');
      setClienteTelefone(agendamento.cliente_telefone || '');
      setBarbeiroId(agendamento.barbeiro_id || (profissionaisList[0]?.id || ''));

      if (agendamento.servicos_ids && agendamento.servicos_ids.length > 0) {
        const srvs = agendamento.servicos_ids.map((sId) => {
          const found = servicesList.find((s) => s.id === sId);
          return {
            id: sId,
            nome: found ? found.nome : 'Serviço Personalizado',
            preco: found ? found.preco : 0,
            barbeiro_id: agendamento.barbeiro_id,
          };
        });
        setSelectedServices(srvs);
      } else {
        setSelectedServices([]);
      }
    } else {
      // Venda avulsa de balcão direta
      setClienteNome('');
      setClienteTelefone('');
      setBarbeiroId(profissionaisList[0]?.id || '');
      setSelectedServices([]);
    }

    setSelectedProducts([]);
    setDesconto(0);
    setAcrescimo(0);
    setObservacoes('');
    setValorRecebidoDinheiro('');
    setMistoValores({
      pix: '',
      dinheiro: '',
      cartao_credito: '',
      cartao_debito: '',
      outros: '',
    });
    setVendaFinalizada(null);
  }, [isOpen, agendamento, servicesList, profissionaisList]);

  // Consulta cliente por telefone e valida regras do Clube VIP
  useEffect(() => {
    const rawDigits = clienteTelefone.replace(/\D/g, '');
    if (rawDigits.length < 8) {
      setClienteVip(null);
      setPlanoVip(null);
      setVipResult(null);
      return;
    }

    let isSubscribed = true;
    setSearchingVip(true);

    clientesService
      .getByTelefone(barbeariaId, clienteTelefone)
      .then(async (found) => {
        if (!isSubscribed) return;
        setSearchingVip(false);
        if (found) {
          setClienteVip(found);
          if (!clienteNome || clienteNome.trim() === '') {
            setClienteNome(found.nome);
          }
          let plano: PlanoAssinatura | null = null;
          if (found.expand?.plano_assinatura_id) {
            plano = found.expand.plano_assinatura_id;
          } else if (found.plano_assinatura_id) {
            try {
              plano = await planosService.getOne(found.plano_assinatura_id);
            } catch {}
          }
          setPlanoVip(plano);

          const res = validarElegibilidadeVip(found, plano, {
            dataIso: agendamento?.data,
            barbeiroId: barbeiroId,
          });
          setVipResult(res);
        } else {
          setClienteVip(null);
          setPlanoVip(null);
          setVipResult(null);
        }
      })
      .catch(() => {
        if (isSubscribed) setSearchingVip(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [clienteTelefone, barbeiroId, barbeariaId, agendamento?.data]);

  // Recalcula o abatimento dos serviços para R$ 0,00 quando a elegibilidade VIP mudar
  useEffect(() => {
    setSelectedServices((prev) => {
      return prev.map((item) => {
        const srvMaster = servicesList.find((s) => s.id === item.id);
        const precoOriginal =
          item.precoOriginal !== undefined
            ? item.precoOriginal
            : srvMaster
            ? srvMaster.preco
            : item.preco;

        const isEligibleService = Boolean(
          vipResult?.elegivel &&
            ((vipResult.servicosCobertos && vipResult.servicosCobertos.includes(item.id)) ||
              (vipResult.permiteBarba &&
                (srvMaster?.categoria === 'barba' || item.nome.toLowerCase().includes('barba'))))
        );

        if (isEligibleService) {
          return {
            ...item,
            precoOriginal,
            preco: 0,
            cobertoVip: true,
          };
        } else {
          return {
            ...item,
            preco: precoOriginal,
            precoOriginal,
            cobertoVip: false,
          };
        }
      });
    });
  }, [vipResult, servicesList]);

  // Financeiro
  const [desconto, setDesconto] = useState<number>(0);
  const [acrescimo, setAcrescimo] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<VendaBalcao['forma_pagamento']>('pix');
  const [valorRecebidoDinheiro, setValorRecebidoDinheiro] = useState<string>('');
  const [mistoValores, setMistoValores] = useState<{
    pix: string;
    dinheiro: string;
    cartao_credito: string;
    cartao_debito: string;
    outros: string;
  }>({
    pix: '',
    dinheiro: '',
    cartao_credito: '',
    cartao_debito: '',
    outros: '',
  });
  const [observacoes, setObservacoes] = useState<string>('');

  // Estados de processo
  const [loading, setLoading] = useState<boolean>(false);
  const [vendaFinalizada, setVendaFinalizada] = useState<VendaBalcao | null>(null);

  // Cálculos de totais
  const subtotalServicos = useMemo(() => {
    return selectedServices.reduce((acc, curr) => acc + (curr.preco || 0), 0);
  }, [selectedServices]);

  const subtotalProdutos = useMemo(() => {
    return selectedProducts.reduce((acc, curr) => acc + curr.subtotal, 0);
  }, [selectedProducts]);

  const valorTotal = useMemo(() => {
    const raw = subtotalServicos + subtotalProdutos - (Number(desconto) || 0) + (Number(acrescimo) || 0);
    return Math.max(0, raw);
  }, [subtotalServicos, subtotalProdutos, desconto, acrescimo]);

  // Cálculo de Troco para Dinheiro em Tempo Real
  const trocoInfo = useMemo(() => {
    if (formaPagamento !== 'dinheiro') return null;
    const trimmed = valorRecebidoDinheiro.trim().replace(',', '.');
    if (!trimmed) return null;
    const recebido = parseFloat(trimmed);
    if (isNaN(recebido)) return null;
    const troco = recebido - valorTotal;
    const suficiente = troco >= -0.001;
    return {
      recebido,
      troco: Math.max(0, troco),
      suficiente,
      falta: suficiente ? 0 : Math.abs(troco),
    };
  }, [formaPagamento, valorRecebidoDinheiro, valorTotal]);

  // Cálculo da Composição do Pagamento Misto
  const mistoResumo = useMemo(() => {
    if (formaPagamento !== 'misto') return null;

    const vPix = parseFloat(mistoValores.pix.trim().replace(',', '.')) || 0;
    const vDinheiro = parseFloat(mistoValores.dinheiro.trim().replace(',', '.')) || 0;
    const vCredito = parseFloat(mistoValores.cartao_credito.trim().replace(',', '.')) || 0;
    const vDebito = parseFloat(mistoValores.cartao_debito.trim().replace(',', '.')) || 0;
    const vOutros = parseFloat(mistoValores.outros.trim().replace(',', '.')) || 0;

    const totalInformado = vPix + vDinheiro + vCredito + vDebito + vOutros;
    const diferenca = valorTotal - totalInformado;
    const estaCorreto = Math.abs(diferenca) <= 0.01 && totalInformado > 0;
    const falta = diferenca > 0.01 ? diferenca : 0;
    const sobra = diferenca < -0.01 ? Math.abs(diferenca) : 0;

    return {
      totalInformado,
      diferenca,
      estaCorreto,
      falta,
      sobra,
      vPix,
      vDinheiro,
      vCredito,
      vDebito,
      vOutros,
    };
  }, [formaPagamento, mistoValores, valorTotal]);

  // Preenche o valor restante automaticamente no método clicado
  const handleAutoFillMisto = (metodo: 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'outros') => {
    if (!mistoResumo) return;
    const valorAtual = parseFloat(mistoValores[metodo].trim().replace(',', '.')) || 0;
    const novoValor = Math.max(0, valorAtual + mistoResumo.falta);
    setMistoValores((prev) => ({
      ...prev,
      [metodo]: novoValor > 0 ? novoValor.toFixed(2) : '',
    }));
  };

  if (!isOpen) return null;

  // Ações de Adicionar Produto à Comanda
  const handleAddProduct = (prod: Produto) => {
    if (prod.estoque_atual <= 0) {
      alert(`O produto "${prod.nome}" está sem estoque no momento!`);
      return;
    }

    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.id === prod.id);
      if (existing) {
        if (existing.quantidade >= prod.estoque_atual) {
          alert(`Limite de estoque disponível atingido (${prod.estoque_atual} un) para "${prod.nome}".`);
          return prev;
        }
        return prev.map((p) =>
          p.id === prod.id
            ? { ...p, quantidade: p.quantidade + 1, subtotal: (p.quantidade + 1) * p.preco_unitario }
            : p
        );
      } else {
        return [
          ...prev,
          {
            id: prod.id,
            nome: prod.nome,
            preco_unitario: prod.preco_venda,
            quantidade: 1,
            subtotal: prod.preco_venda,
          },
        ];
      }
    });
  };

  const handleUpdateProductQuantity = (prodId: string, delta: number) => {
    const prodMaster = produtosList.find((p) => p.id === prodId);
    setSelectedProducts((prev) => {
      return prev
        .map((p) => {
          if (p.id === prodId) {
            const novaQtd = p.quantidade + delta;
            if (novaQtd <= 0) return null;
            if (prodMaster && novaQtd > prodMaster.estoque_atual) {
              alert(`Estoque máximo atingido (${prodMaster.estoque_atual} un).`);
              return p;
            }
            return {
              ...p,
              quantidade: novaQtd,
              subtotal: novaQtd * p.preco_unitario,
            };
          }
          return p;
        })
        .filter(Boolean) as ItemProdutoVenda[];
    });
  };

  const handleRemoveProduct = (prodId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== prodId));
  };

  // Finalizar Fecho de Comanda
  const handleFinalizarFechamento = async () => {
    if (!clienteNome.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    if (selectedServices.length === 0 && selectedProducts.length === 0) {
      alert('A comanda precisa conter ao menos 1 serviço ou produto.');
      return;
    }

    const tenantBarbeariaId = barbeariaId || authService.getCurrentUser()?.barbearia_id || '';
    if (!tenantBarbeariaId) {
      alert('Erro: Barbearia ativa não identificada. Por favor, recarregue a página.');
      return;
    }

    const nomeFinal = clienteNome.trim() || 'Cliente Balcão';

    if (formaPagamento === 'dinheiro' && trocoInfo && !trocoInfo.suficiente) {
      if (!window.confirm(`Atenção: O valor recebido em dinheiro (R$ ${trocoInfo.recebido.toFixed(2)}) é menor que o total da comanda (R$ ${valorTotal.toFixed(2)}). Deseja registrar a venda mesmo assim?`)) {
        return;
      }
    }

    if (formaPagamento === 'misto') {
      if (!mistoResumo || !mistoResumo.estaCorreto) {
        if (mistoResumo?.falta && mistoResumo.falta > 0.01) {
          alert(`Atenção: A soma dos métodos no pagamento misto (R$ ${mistoResumo.totalInformado.toFixed(2)}) ainda não cobre o total da comanda (R$ ${valorTotal.toFixed(2)}). Faltam R$ ${mistoResumo.falta.toFixed(2)}.`);
          return;
        }
        if (mistoResumo?.sobra && mistoResumo.sobra > 0.01) {
          alert(`Atenção: A soma dos métodos no pagamento misto (R$ ${mistoResumo.totalInformado.toFixed(2)}) ultrapassa o total da comanda em R$ ${mistoResumo.sobra.toFixed(2)}.`);
          return;
        }
      }
    }

    // Composição de observações incluindo detalhes do pagamento misto
    let observacaoFinal = observacoes.trim();
    if (formaPagamento === 'misto' && mistoResumo) {
      const partes: string[] = [];
      if (mistoResumo.vPix > 0) partes.push(`Pix: R$ ${mistoResumo.vPix.toFixed(2)}`);
      if (mistoResumo.vDinheiro > 0) partes.push(`Dinheiro: R$ ${mistoResumo.vDinheiro.toFixed(2)}`);
      if (mistoResumo.vDebito > 0) partes.push(`Débito: R$ ${mistoResumo.vDebito.toFixed(2)}`);
      if (mistoResumo.vCredito > 0) partes.push(`Crédito: R$ ${mistoResumo.vCredito.toFixed(2)}`);
      if (mistoResumo.vOutros > 0) partes.push(`Outros: R$ ${mistoResumo.vOutros.toFixed(2)}`);

      const splitTxt = `[Pagamento Misto: ${partes.join(' + ')}]`;
      observacaoFinal = observacaoFinal ? `${observacaoFinal} | ${splitTxt}` : splitTxt;
    }

    try {
      setLoading(true);

      const venda = await vendasBalcaoService.fecharComanda({
        barbearia_id: tenantBarbeariaId,
        agendamento_id: agendamento?.id && agendamento.id.trim() ? agendamento.id.trim() : undefined,
        barbeiro_id: barbeiroId && barbeiroId.trim() ? barbeiroId.trim() : undefined,
        cliente_nome: nomeFinal,
        cliente_telefone: clienteTelefone.trim() || undefined,
        itens_servicos: selectedServices || [],
        itens_produtos: selectedProducts || [],
        subtotal_servicos: subtotalServicos || 0,
        subtotal_produtos: subtotalProdutos || 0,
        desconto: Number(desconto) || 0,
        acrescimo: Number(acrescimo) || 0,
        valor_total: valorTotal || 0,
        forma_pagamento: formaPagamento,
        status_pagamento: 'pago',
        observacoes: observacaoFinal || undefined,
      });

      setVendaFinalizada(venda);

      // Incrementa cortes_utilizados_mes na coleção 'clientes' se houver serviço coberto pelo plano VIP
      const teveCorteVip = selectedServices.some((s) => s.cobertoVip);
      if (clienteVip) {
        try {
          await clientesService.registrarAtendimento(clienteVip.id, valorTotal || 0, teveCorteVip);
        } catch (err) {
          console.warn('Falha ao atualizar métricas do cliente VIP:', err);
        }
      } else if (clienteTelefone.replace(/\D/g, '').length >= 8) {
        // Registra o cliente avulso para manter o histórico de visitas e faturamento
        try {
          await clientesService.create({
            barbearia_id: tenantBarbeariaId,
            nome: nomeFinal,
            telefone: clienteTelefone.trim(),
            total_visitas: 1,
            total_gasto: valorTotal || 0,
            status_assinatura: 'sem_plano',
            cortes_utilizados_mes: 0,
          });
        } catch (err) {
          console.warn('Falha ao registrar cliente avulso:', err);
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Erro detalhado ao finalizar comanda:', err);
      const msgErro =
        err?.data?.message ||
        err?.message ||
        'Falha ao registrar comanda no PocketBase. Verifique os dados ou conexão.';
      alert(`Erro ao fechar comanda: ${msgErro}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '1.25rem',
          border: '1px solid rgba(217, 119, 6, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        {/* Recibo de Sucesso */}
        {vendaFinalizada ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', overflowY: 'auto' }}>
            <div
              style={{
                width: '4.5rem',
                height: '4.5rem',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                border: '2px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              <CheckCircle2 style={{ width: '2.5rem', height: '2.5rem' }} />
            </div>

            <span className="gold-badge" style={{ marginBottom: '0.75rem' }}>
              <Receipt style={{ width: '0.85rem', height: '0.85rem' }} />
              Comanda #{vendaFinalizada.id.slice(-6).toUpperCase()} Fechada
            </span>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>
              Atendimento Concluído & Comanda Paga!
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
              O agendamento foi marcado como concluído, os produtos tiveram o estoque físico abatido e a receita foi computada no PDV.
            </p>

            {/* Caixa do Recibo */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: '0.85rem',
                padding: '1.5rem',
                maxWidth: '460px',
                margin: '0 auto 2rem',
                textAlign: 'left',
                fontSize: '0.88rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Cliente:</span>
                <strong>{vendaFinalizada.cliente_nome}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Pagamento:</span>
                <span style={{ textTransform: 'uppercase', color: '#fbbf24', fontWeight: 600 }}>
                  {vendaFinalizada.forma_pagamento}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Serviços ({vendaFinalizada.itens_servicos?.length || 0}):</span>
                <span>R$ {vendaFinalizada.subtotal_servicos.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Produtos ({vendaFinalizada.itens_produtos?.length || 0}):</span>
                <span>R$ {vendaFinalizada.subtotal_produtos.toFixed(2)}</span>
              </div>

              {(vendaFinalizada.desconto > 0 || vendaFinalizada.acrescimo > 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>
                  <span>Ajustes (Desc/Acrésc):</span>
                  <span>- R$ {vendaFinalizada.desconto.toFixed(2)} / + R$ {vendaFinalizada.acrescimo.toFixed(2)}</span>
                </div>
              )}

              {vendaFinalizada.forma_pagamento === 'dinheiro' && trocoInfo && trocoInfo.recebido > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#34d399', fontSize: '0.84rem' }}>
                  <span>Dinheiro Recebido:</span>
                  <span>R$ {trocoInfo.recebido.toFixed(2)} (Troco: R$ {trocoInfo.troco.toFixed(2)})</span>
                </div>
              )}

              {vendaFinalizada.forma_pagamento === 'misto' && mistoResumo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.25)', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>Composição do Pagamento Misto:</span>
                  <div style={{ fontSize: '0.8rem', color: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {mistoResumo.vPix > 0 && <span>Pix: R$ {mistoResumo.vPix.toFixed(2)}</span>}
                    {mistoResumo.vDinheiro > 0 && <span>Dinheiro: R$ {mistoResumo.vDinheiro.toFixed(2)}</span>}
                    {mistoResumo.vDebito > 0 && <span>Débito: R$ {mistoResumo.vDebito.toFixed(2)}</span>}
                    {mistoResumo.vCredito > 0 && <span>Crédito: R$ {mistoResumo.vCredito.toFixed(2)}</span>}
                    {mistoResumo.vOutros > 0 && <span>Outros: R$ {mistoResumo.vOutros.toFixed(2)}</span>}
                  </div>
                </div>
              )}

              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total Pago:</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
                  R$ {vendaFinalizada.valor_total.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Printer style={{ width: '1rem', height: '1rem' }} />
                Imprimir Cupom
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Sparkles style={{ width: '1rem', height: '1rem' }} />
                Concluir & Retornar à Agenda
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header do Modal */}
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(217, 119, 6, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.65rem',
                    borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.25) 100%)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                  }}
                >
                  <Receipt style={{ width: '1.4rem', height: '1.4rem' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                    Fecho de Comanda & PDV Balcão
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                    {agendamento ? 'Finalização de atendimento agendado' : 'Venda avulsa de balcão'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.45rem',
                  borderRadius: '0.45rem',
                }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
                gap: '1.5rem',
              }}
            >
              {/* Coluna Esquerda: Cliente, Serviços e Produtos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Dados do Atendimento */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.85rem',
                    padding: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    Dados do Cliente & Profissional
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        Nome do Cliente *
                      </label>
                      <input
                        type="text"
                        value={clienteNome}
                        onChange={(e) => setClienteNome(e.target.value)}
                        placeholder="Ex: Carlos Eduardo"
                        className="form-input"
                        style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        Telefone (Chave VIP)
                      </label>
                      <input
                        type="text"
                        value={clienteTelefone}
                        onChange={(e) => setClienteTelefone(e.target.value)}
                        placeholder="Ex: 11999998888"
                        className="form-input"
                        style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Barbeiro Responsável (Comissão & Elegibilidade VIP)
                    </label>
                    <select
                      value={barbeiroId}
                      onChange={(e) => setBarbeiroId(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
                    >
                      <option value="">Venda Direta / Sem Comissão de Barbeiro</option>
                      {profissionaisList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} (Comissão: {((p.taxa_comissao || 0) * 100).toFixed(0)}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Banner de Status do Clube VIP */}
                  {searchingVip ? (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Sparkles style={{ width: '0.85rem', height: '0.85rem', color: '#fbbf24' }} />
                      Identificando cliente na base VIP...
                    </div>
                  ) : clienteVip && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {vipResult?.isVip ? (
                        vipResult.elegivel ? (
                          <div
                            style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.15) 100%)',
                              border: '1px solid rgba(245, 158, 11, 0.45)',
                              borderRadius: '0.65rem',
                              padding: '0.75rem 0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ padding: '0.45rem', borderRadius: '0.45rem', background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }}>
                              <Crown style={{ width: '1.2rem', height: '1.2rem' }} />
                            </div>
                            <div style={{ fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span>Assinante VIP Ativo: {planoVip?.nome}</span>
                                <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Elegível Hoje</span>
                              </div>
                              <div style={{ color: 'var(--text-main)', marginTop: '0.2rem', fontSize: '0.78rem' }}>
                                Cortes no mês: <strong style={{ color: '#38bdf8' }}>{clienteVip.cortes_utilizados_mes || 0}</strong> {planoVip?.limite_cortes_mes === 0 ? '(Ilimitado)' : `/ ${planoVip?.limite_cortes_mes}`} • Vencimento: <strong>{clienteVip.data_vencimento || 'Ativo'}</strong>
                              </div>
                              <div style={{ color: '#34d399', fontWeight: 600, fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                ✓ Serviços cobertos abatidos automaticamente para R$ 0,00!
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '0.65rem',
                              padding: '0.75rem 0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ padding: '0.45rem', borderRadius: '0.45rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                              <AlertTriangle style={{ width: '1.2rem', height: '1.2rem' }} />
                            </div>
                            <div style={{ fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 700, color: '#f87171' }}>
                                Assinante VIP: {planoVip?.nome || 'Plano Vinculado'} (Não Elegível Hoje)
                              </div>
                              <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem', fontSize: '0.78rem' }}>
                                {vipResult?.motivoIneligibilidade}
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '0.55rem',
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <User style={{ width: '0.9rem', height: '0.9rem', color: 'var(--text-dim)' }} />
                          <span>Cliente cadastrado: <strong>{clienteVip.nome}</strong> (Cliente Avulso • {clienteVip.total_visitas || 0} visitas)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Serviços na Comanda */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.85rem',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      <Scissors style={{ width: '0.9rem', height: '0.9rem' }} />
                      Serviços Executados ({selectedServices.length})
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                      Subtotal: R$ {subtotalServicos.toFixed(2)}
                    </span>
                  </div>

                  {selectedServices.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      Nenhum serviço inserido. Selecione abaixo caso deseje adicionar.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {selectedServices.map((srv, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: srv.cobertoVip ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            border: srv.cobertoVip ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.45rem',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600 }}>{srv.nome}</span>
                            {srv.cobertoVip && (
                              <span
                                className="gold-badge"
                                style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem' }}
                              >
                                <Crown style={{ width: '0.65rem', height: '0.65rem' }} /> Coberto VIP (100% OFF)
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {srv.cobertoVip ? (
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', fontSize: '0.75rem', marginRight: '0.4rem' }}>
                                  R$ {(srv.precoOriginal ?? srv.preco).toFixed(2)}
                                </span>
                                <span style={{ fontWeight: 800, color: '#10b981' }}>
                                  R$ 0,00
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                R$ {srv.preco.toFixed(2)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedServices((prev) => prev.filter((_, idx) => idx !== index));
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '0.2rem',
                              }}
                              title="Remover serviço"
                            >
                              <X style={{ width: '0.85rem', height: '0.85rem' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionar Serviço Rápido */}
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.45rem' }}>
                    <select
                      id="select-add-servico"
                      className="form-input"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem', flex: 1 }}
                      defaultValue=""
                      onChange={(e) => {
                        const sId = e.target.value;
                        if (!sId) return;
                        const found = servicesList.find((s) => s.id === sId);
                        if (found) {
                          const isCovered = Boolean(
                            vipResult?.elegivel &&
                              ((vipResult.servicosCobertos && vipResult.servicosCobertos.includes(found.id)) ||
                                (vipResult.permiteBarba &&
                                  (found.categoria === 'barba' || found.nome.toLowerCase().includes('barba'))))
                          );
                          setSelectedServices((prev) => [
                            ...prev,
                            {
                              id: found.id,
                              nome: found.nome,
                              preco: isCovered ? 0 : found.preco,
                              precoOriginal: found.preco,
                              cobertoVip: isCovered,
                              barbeiro_id: barbeiroId,
                            },
                          ]);
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="" disabled>
                        + Adicionar outro serviço ao atendimento...
                      </option>
                      {servicesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome} — R$ {s.preco.toFixed(2)} ({s.duracao_minutos} min)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Produtos Adicionados à Comanda */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.85rem',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      <ShoppingBag style={{ width: '0.9rem', height: '0.9rem' }} />
                      Produtos na Comanda ({selectedProducts.length})
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>
                      Subtotal: R$ {subtotalProdutos.toFixed(2)}
                    </span>
                  </div>

                  {selectedProducts.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      Nenhum produto adicionado à comanda. Clique nos produtos ao lado para incluir pomadas, cervejas, etc.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedProducts.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{item.nome}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              R$ {item.preco_unitario.toFixed(2)} / un
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateProductQuantity(item.id, -1)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  padding: '0.25rem 0.45rem',
                                  cursor: 'pointer',
                                }}
                              >
                                <Minus style={{ width: '0.75rem', height: '0.75rem' }} />
                              </button>
                              <span style={{ fontWeight: 700, padding: '0 0.35rem', fontSize: '0.82rem' }}>
                                {item.quantidade}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateProductQuantity(item.id, 1)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  padding: '0.25rem 0.45rem',
                                  cursor: 'pointer',
                                }}
                              >
                                <Plus style={{ width: '0.75rem', height: '0.75rem' }} />
                              </button>
                            </div>

                            <span style={{ fontWeight: 700, minWidth: '4.5rem', textAlign: 'right', color: '#fbbf24' }}>
                              R$ {item.subtotal.toFixed(2)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(item.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '0.25rem',
                              }}
                            >
                              <Trash2 style={{ width: '0.85rem', height: '0.85rem' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna Direita: Catálogo Rápido de Produtos & Fechamento Financeiro */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Catálogo Rápido de Produtos */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.85rem',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '260px',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Catálogo de Produtos (Clique para Adicionar)
                  </div>

                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.25rem' }}>
                    {produtosList.length === 0 ? (
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        Nenhum produto cadastrado no estoque.
                      </div>
                    ) : (
                      produtosList.map((prod) => {
                        const esgotado = prod.estoque_atual <= 0;
                        const baixo = prod.estoque_atual <= prod.estoque_minimo;
                        return (
                          <button
                            key={prod.id}
                            type="button"
                            disabled={esgotado}
                            onClick={() => handleAddProduct(prod)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: esgotado ? 'rgba(255,255,255,0.01)' : 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-subtle)',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.5rem',
                              cursor: esgotado ? 'not-allowed' : 'pointer',
                              opacity: esgotado ? 0.45 : 1,
                              textAlign: 'left',
                              color: 'var(--text-main)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{prod.nome}</div>
                              <div style={{ fontSize: '0.72rem', color: esgotado ? '#f87171' : baixo ? '#fbbf24' : 'var(--text-dim)' }}>
                                Estoque: {prod.estoque_atual} un {esgotado ? '(Esgotado)' : baixo ? '(Baixo)' : ''}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                                R$ {prod.preco_venda.toFixed(2)}
                              </span>
                              <div
                                style={{
                                  background: 'rgba(217, 119, 6, 0.2)',
                                  color: '#fbbf24',
                                  borderRadius: '0.35rem',
                                  padding: '0.2rem',
                                  display: 'flex',
                                }}
                              >
                                <Plus style={{ width: '0.85rem', height: '0.85rem' }} />
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '0.85rem',
                    padding: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                    Forma de Pagamento
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
                    {[
                      { key: 'pix', label: 'Pix', icon: QrCode },
                      { key: 'cartao_credito', label: 'Crédito', icon: CreditCard },
                      { key: 'cartao_debito', label: 'Débito', icon: CreditCard },
                      { key: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                      { key: 'misto', label: 'Misto', icon: DollarSign },
                      { key: 'outros', label: 'Outros', icon: Sparkles },
                    ].map((f) => {
                      const IconComponent = f.icon;
                      const selected = formaPagamento === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setFormaPagamento(f.key as any)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            padding: '0.5rem 0.25rem',
                            borderRadius: '0.5rem',
                            border: `1px solid ${selected ? '#fbbf24' : 'var(--border-subtle)'}`,
                            background: selected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            color: selected ? '#fbbf24' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.76rem',
                            fontWeight: selected ? 700 : 500,
                          }}
                        >
                          <IconComponent style={{ width: '1rem', height: '1rem' }} />
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bloco de Troco para Pagamento em Dinheiro */}
                  {formaPagamento === 'dinheiro' && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        padding: '0.85rem',
                        borderRadius: '0.65rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label
                          htmlFor="valor-recebido-dinheiro"
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#fbbf24',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Banknote style={{ width: '0.95rem', height: '0.95rem' }} />
                          Valor Recebido em Dinheiro (R$)
                        </label>
                        {/* Botão de Atalho para Valor Exato */}
                        <button
                          type="button"
                          onClick={() => setValorRecebidoDinheiro(valorTotal.toFixed(2))}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: 'var(--text-muted)',
                            borderRadius: '0.35rem',
                            padding: '0.2rem 0.45rem',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                          }}
                        >
                          Valor Exato
                        </button>
                      </div>

                      <input
                        id="valor-recebido-dinheiro"
                        type="number"
                        step="0.50"
                        min="0"
                        value={valorRecebidoDinheiro}
                        onChange={(e) => setValorRecebidoDinheiro(e.target.value)}
                        placeholder={`Ex: ${(Math.ceil(valorTotal / 10) * 10 || 50).toFixed(2)}`}
                        className="form-input"
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          padding: '0.5rem 0.75rem',
                          color: '#fff',
                        }}
                      />

                      {/* Feedback de Troco ou Alerta Visual de Valor Insuficiente em Tempo Real */}
                      {trocoInfo && (
                        <div
                          style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            background: trocoInfo.suficiente
                              ? 'rgba(16, 185, 129, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                            border: `1px solid ${
                              trocoInfo.suficiente
                                ? 'rgba(16, 185, 129, 0.35)'
                                : 'rgba(239, 68, 68, 0.35)'
                            }`,
                            color: trocoInfo.suficiente ? '#34d399' : '#f87171',
                          }}
                        >
                          {trocoInfo.suficiente ? (
                            <>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <CheckCircle2 style={{ width: '1rem', height: '1rem' }} />
                                Troco a Devolver:
                              </span>
                              <span style={{ fontSize: '1.15rem' }}>
                                R$ {trocoInfo.troco.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <AlertTriangle style={{ width: '1rem', height: '1rem' }} />
                                Valor Insuficiente:
                              </span>
                              <span>Faltam R$ {trocoInfo.falta.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bloco de Composição para Pagamento Misto */}
                  {formaPagamento === 'misto' && mistoResumo && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        padding: '0.85rem',
                        borderRadius: '0.65rem',
                        background: 'rgba(245, 158, 11, 0.04)',
                        border: `1px solid ${mistoResumo.estaCorreto ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.35)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24' }}>
                          <DollarSign style={{ width: '0.95rem', height: '0.95rem' }} />
                          Composição do Pagamento Misto
                        </div>

                        {/* Status de Distribuição */}
                        {mistoResumo.estaCorreto ? (
                          <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 style={{ width: '0.8rem', height: '0.8rem' }} /> 100% Distribuído
                          </span>
                        ) : mistoResumo.falta > 0.01 ? (
                          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>
                            Faltam R$ {mistoResumo.falta.toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>
                            Excede R$ {mistoResumo.sobra.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Lista de Métodos de Pagamento para Divisão */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {[
                          { key: 'pix', label: 'Pix', icon: QrCode },
                          { key: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                          { key: 'cartao_debito', label: 'Débito', icon: CreditCard },
                          { key: 'cartao_credito', label: 'Crédito', icon: CreditCard },
                          { key: 'outros', label: 'Outros', icon: Sparkles },
                        ].map((m) => {
                          const IconComp = m.icon;
                          const valStr = mistoValores[m.key as keyof typeof mistoValores];
                          const hasVal = parseFloat(valStr) > 0;

                          return (
                            <div
                              key={m.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                background: hasVal ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                border: hasVal ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-subtle)',
                                borderRadius: '0.5rem',
                                padding: '0.35rem 0.6rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100px', flexShrink: 0 }}>
                                <IconComp style={{ width: '0.85rem', height: '0.85rem', color: hasVal ? '#fbbf24' : 'var(--text-dim)' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: hasVal ? '#fff' : 'var(--text-muted)' }}>
                                  {m.label}
                                </span>
                              </div>

                              <div style={{ position: 'relative', flex: 1 }}>
                                <span style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                  R$
                                </span>
                                <input
                                  type="number"
                                  step="0.50"
                                  min="0"
                                  placeholder="0.00"
                                  value={valStr}
                                  onChange={(e) =>
                                    setMistoValores((prev) => ({
                                      ...prev,
                                      [m.key]: e.target.value,
                                    }))
                                  }
                                  className="form-input"
                                  style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    padding: '0.3rem 0.5rem 0.3rem 1.8rem',
                                    width: '100%',
                                    color: hasVal ? '#fbbf24' : '#fff',
                                  }}
                                />
                              </div>

                              {/* Botão de Atalho para Inserir o Restante */}
                              {mistoResumo.falta > 0.01 && (
                                <button
                                  type="button"
                                  onClick={() => handleAutoFillMisto(m.key as any)}
                                  title={`Completar R$ ${mistoResumo.falta.toFixed(2)} em ${m.label}`}
                                  style={{
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    color: '#fbbf24',
                                    borderRadius: '0.35rem',
                                    padding: '0.25rem 0.45rem',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  + R$ {mistoResumo.falta.toFixed(2)}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Resumo da Soma */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          fontSize: '0.76rem',
                        }}
                      >
                        <span style={{ color: 'var(--text-dim)' }}>Soma dos Métodos:</span>
                        <span style={{ fontWeight: 800, color: mistoResumo.estaCorreto ? '#34d399' : '#fbbf24' }}>
                          R$ {mistoResumo.totalInformado.toFixed(2)} / R$ {valorTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumo Financeiro & Totais */}
                <div
                  style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(217, 119, 6, 0.05) 100%)',
                    border: '1px solid rgba(217, 119, 6, 0.35)',
                    borderRadius: '0.85rem',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>
                        Desconto (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={desconto || ''}
                        onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="form-input"
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.65rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>
                        Acréscimo / Gorjeta (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={acrescimo || ''}
                        onChange={(e) => setAcrescimo(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="form-input"
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.65rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                    <span>Serviços + Produtos:</span>
                    <span>R$ {(subtotalServicos + subtotalProdutos).toFixed(2)}</span>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      paddingTop: '0.75rem',
                      marginTop: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                        Total a Receber
                      </div>
                      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em' }}>
                        R$ {valorTotal.toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleFinalizarFechamento}
                      className="btn-primary"
                      style={{
                        padding: '0.75rem 1.25rem',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
                      }}
                    >
                      {loading ? (
                        'Fechando...'
                      ) : (
                        <>
                          <CheckCircle2 style={{ width: '1.1rem', height: '1.1rem' }} />
                          Finalizar Fecho
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
