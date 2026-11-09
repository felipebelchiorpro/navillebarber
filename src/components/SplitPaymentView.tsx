import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitFork, 
  DollarSign, 
  ShieldCheck, 
  Percent, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  Info,
  X,
  RefreshCw,
  Edit3,
  Save,
  Store,
  Wallet,
  Check,
  ExternalLink,
  Copy,
  Plus,
  Search,
  ChevronDown,
  QrCode,
  SmartphoneNfc,
  CreditCard,
  Cpu,
  Landmark,
  Zap,
  Radio,
  Calendar,
  Gift,
  Trash2,
  Send,
  Monitor
} from 'lucide-react';
import { pb, Barbearia, Profissional, TerminalPagamento } from '../services/pocketbase';
import { criarSubcontaAsaas, provisionarSubcontaBarbearia, calcularTaxaNavilleSplit } from '../lib/asaas';

interface SplitPaymentViewProps {
  tenant?: Barbearia | any;
  onUpdateTenant?: (updated: any) => void;
  onClose?: () => void;
}

export default function SplitPaymentView({ tenant: initialTenant, onUpdateTenant, onClose }: SplitPaymentViewProps) {
  // Lista de lojas para seleção caso seja aberto globalmente
  const [tenants, setTenants] = useState<Barbearia[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Barbearia | any | null>(initialTenant || null);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Configuração de Taxa da Naville & Split
  const [tipoTaxa, setTipoTaxa] = useState<'fixa' | 'percentual'>(
    initialTenant?.split_taxa_tipo || 'fixa'
  );
  const [taxaValor, setTaxaValor] = useState<number>(
    initialTenant?.split_taxa_valor ?? 1.50
  );
  const [splitAtivo, setSplitAtivo] = useState<boolean>(
    initialTenant?.modulo_split_asaas ?? true
  );
  const [asaasWalletId, setAsaasWalletId] = useState<string>(
    initialTenant?.asaas_wallet_id || ''
  );

  // Feedback de salvamento
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulação de Cálculo Interativo
  const [valorSimulado, setValorSimulado] = useState<number>(70.00);
  const [comissaoSimulada, setComissaoSimulada] = useState<number>(50);

  // Profissionais reais do tenant
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(false);
  const [buscaProf, setBuscaProf] = useState('');

  // Modal para Criar / Sincronizar Subconta no Asaas
  const [modalSubcontaOpen, setModalSubcontaOpen] = useState(false);
  const [selectedProf, setSelectedProf] = useState<Profissional | null>(null);
  const [subNome, setSubNome] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subCpf, setSubCpf] = useState('');
  const [subTelefone, setSubTelefone] = useState('');
  const [subComissao, setSubComissao] = useState<number>(50);
  const [subPix, setSubPix] = useState('');
  const [gerandoSubconta, setGerandoSubconta] = useState(false);
  const [subcontaFeedback, setSubcontaFeedback] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  // Modal para Convidar / Novo Barbeiro
  const [modalNovoBarbeiroOpen, setModalNovoBarbeiroOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoCpf, setNovoCpf] = useState('');
  const [novaComissao, setNovaComissao] = useState<number>(50);
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  // Estados de Repasse Bancário (Conta do Proprietário)
  const [pixTipoChave, setPixTipoChave] = useState<'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'>(
    initialTenant?.pix_tipo_chave || 'cnpj'
  );
  const [pixChaveRepasse, setPixChaveRepasse] = useState<string>(
    initialTenant?.pix_chave_repasse || ''
  );
  const [bancoNome, setBancoNome] = useState<string>(
    initialTenant?.banco_nome || 'Nubank'
  );
  const [frequenciaLiquidacao, setFrequenciaLiquidacao] = useState<string>('d0_instantaneo');
  const [savingRepasse, setSavingRepasse] = useState(false);
  const [repasseSuccess, setRepasseSuccess] = useState(false);

  // Toast Flutuante de Feedback Visual
  const [toast, setToast] = useState<{
    id: string;
    tipo: 'sucesso' | 'erro' | 'info';
    titulo?: string;
    mensagem: string;
  } | null>(null);

  const dispararToast = (tipo: 'sucesso' | 'erro' | 'info', mensagem: string, titulo?: string) => {
    setToast({
      id: Math.random().toString(),
      tipo,
      titulo,
      mensagem,
    });
    setTimeout(() => {
      setToast((prev) => (prev?.mensagem === mensagem ? null : prev));
    }, 6000);
  };

  // Estados de Hardware & Canais de Captura
  const [canalCaptura, setCanalCaptura] = useState<'display_pix' | 'tap_phone' | 'smart_pos'>(
    initialTenant?.canal_captura_principal || 'display_pix'
  );
  const [solicitouMaquininha, setSolicitouMaquininha] = useState<boolean>(
    initialTenant?.solicitou_maquininha ?? false
  );
  const [maquininhaModelo, setMaquininhaModelo] = useState<string>(
    initialTenant?.maquininha_modelo || 'Nenhuma'
  );
  const [modalMaquininhaOpen, setModalMaquininhaOpen] = useState(false);
  const [modeloEscolhidoModal, setModeloEscolhidoModal] = useState<string>('Smart Asaas');
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);
  const [solicitacaoSucesso, setSolicitacaoSucesso] = useState(false);

  // Estados de Governança e Isenção de Split (Naville Take-Rate)
  const [splitCarenciaTipo, setSplitCarenciaTipo] = useState<'dias' | 'transacoes' | 'isento_vitalicio'>(
    initialTenant?.split_carencia_tipo || 'dias'
  );
  const [splitDiasGratis, setSplitDiasGratis] = useState<number>(
    initialTenant?.split_dias_gratis ?? 30
  );
  const [splitDataAtivacao, setSplitDataAtivacao] = useState<string>(
    initialTenant?.split_data_ativacao || new Date().toISOString()
  );
  const [splitFranquiaMensal, setSplitFranquiaMensal] = useState<number>(
    initialTenant?.split_franquia_transacoes_mensal ?? 30
  );
  const [splitContadorMes, setSplitContadorMes] = useState<number>(
    initialTenant?.split_contador_mes_atual ?? 0
  );
  const [splitTaxaTransacao, setSplitTaxaTransacao] = useState<number>(
    initialTenant?.split_taxa_transacao ?? 0.35
  );
  const [splitMensalidadeModulo, setSplitMensalidadeModulo] = useState<number>(
    initialTenant?.split_mensalidade_modulo ?? 30.00
  );

  // Estados dos Terminais de Pagamento (Smart Link / TEF Web & PWA Maquininha)
  const [terminais, setTerminais] = useState<TerminalPagamento[]>([]);
  const [loadingTerminais, setLoadingTerminais] = useState(false);
  const [modalNovoTerminalOpen, setModalNovoTerminalOpen] = useState(false);
  const [novoTerminalIdentificador, setNovoTerminalIdentificador] = useState('Balcão Principal');
  const [novoTerminalTipo, setNovoTerminalTipo] = useState<'tef_smartlink' | 'pwa_maquininha'>('tef_smartlink');
  const [salvandoTerminal, setSalvandoTerminal] = useState(false);
  const [modalPwaOpen, setModalPwaOpen] = useState(false);
  const [terminalSelecionadoPwa, setTerminalSelecionadoPwa] = useState<TerminalPagamento | null>(null);
  const [disparandoTerminalId, setDisparandoTerminalId] = useState<string | null>(null);
  const [terminalFeedback, setTerminalFeedback] = useState<string>('');

  // Efeito para carregar barbearias se initialTenant não for passado
  useEffect(() => {
    if (!initialTenant) {
      setLoadingTenants(true);
      pb.collection('barbearias')
        .getFullList<Barbearia>({ sort: '-created' })
        .then((list) => {
          setTenants(list);
          if (list.length > 0) {
            setSelectedTenant(list[0]);
          }
        })
        .catch((err) => console.error('Erro ao listar barbearias para split:', err))
        .finally(() => setLoadingTenants(false));
    } else {
      setSelectedTenant(initialTenant);
    }
  }, [initialTenant]);

  // Atualiza estados locais quando tenant selecionado muda
  useEffect(() => {
    if (selectedTenant) {
      setTipoTaxa(selectedTenant.split_taxa_tipo || 'fixa');
      setTaxaValor(selectedTenant.split_taxa_valor ?? 1.50);
      setSplitAtivo(selectedTenant.split_ativo ?? selectedTenant.modulo_split_asaas ?? true);
      setAsaasWalletId(selectedTenant.asaas_wallet_id || '');
      setPixTipoChave(selectedTenant.pix_tipo_chave || 'cnpj');
      setPixChaveRepasse(selectedTenant.pix_chave_repasse || '');
      setBancoNome(selectedTenant.banco_nome || 'Nubank');
      setCanalCaptura(selectedTenant.canal_captura_principal || 'display_pix');
      setSolicitouMaquininha(selectedTenant.solicitou_maquininha ?? false);
      setMaquininhaModelo(selectedTenant.maquininha_modelo || 'Nenhuma');
      
      // Carência & Governança
      setSplitCarenciaTipo(selectedTenant.split_carencia_tipo || 'dias');
      setSplitDiasGratis(selectedTenant.split_dias_gratis ?? 30);
      setSplitDataAtivacao(selectedTenant.split_data_ativacao || new Date().toISOString());
      setSplitFranquiaMensal(selectedTenant.split_franquia_transacoes_mensal ?? 30);
      setSplitContadorMes(selectedTenant.split_contador_mes_atual ?? 0);
      setSplitTaxaTransacao(selectedTenant.split_taxa_transacao ?? 0.35);
      setSplitMensalidadeModulo(selectedTenant.split_mensalidade_modulo ?? 30.00);

      carregarProfissionais(selectedTenant.id);
      carregarTerminais(selectedTenant.id);
    }
  }, [selectedTenant?.id]);

  // Carrega terminais vinculados à barbearia
  const carregarTerminais = async (tenantId: string) => {
    try {
      setLoadingTerminais(true);
      const records = await pb.collection('terminais_pagamento').getFullList<TerminalPagamento>({
        filter: `barbearia = "${tenantId}"`,
        sort: '-created',
      });
      setTerminais(records);
    } catch (err) {
      console.error('Erro ao buscar terminais:', err);
    } finally {
      setLoadingTerminais(false);
    }
  };

  // Realtime para terminais de pagamento
  useEffect(() => {
    if (!selectedTenant?.id) return;
    let unsub: (() => void) | undefined;

    pb.collection('terminais_pagamento')
      .subscribe('*', (e) => {
        carregarTerminais(selectedTenant.id);
      })
      .then((u) => {
        unsub = u;
      })
      .catch((err) => {
        console.warn('Realtime subscribe terminais warning:', err);
      });

    return () => {
      if (unsub) unsub();
      else pb.collection('terminais_pagamento').unsubscribe('*').catch(() => {});
    };
  }, [selectedTenant?.id]);

  // Carrega profissionais vinculados ao tenant
  const carregarProfissionais = async (tenantId: string) => {
    try {
      setLoadingProfs(true);
      const records = await pb.collection('profissionais').getFullList<Profissional>({
        filter: `barbearia_id = "${tenantId}"`,
        sort: '-created',
      });
      setProfissionais(records);
    } catch (err) {
      console.error('Erro ao buscar profissionais:', err);
    } finally {
      setLoadingProfs(false);
    }
  };

  // Cálculo da Taxa Naville via Motor Oficial
  const taxaNavilleUnitaria = useMemo(() => {
    if (!splitAtivo) return 0;
    return calcularTaxaNavilleSplit({
      split_carencia_tipo: splitCarenciaTipo,
      split_data_ativacao: splitDataAtivacao,
      split_dias_gratis: splitDiasGratis,
      split_franquia_transacoes_mensal: splitFranquiaMensal,
      split_contador_mes_atual: splitContadorMes,
      split_taxa_transacao: splitTaxaTransacao,
    });
  }, [
    splitAtivo,
    splitCarenciaTipo,
    splitDataAtivacao,
    splitDiasGratis,
    splitFranquiaMensal,
    splitContadorMes,
    splitTaxaTransacao,
  ]);

  // Informações calculadas de dias restantes / franquia
  const statusCarencia = useMemo(() => {
    if (splitCarenciaTipo === 'isento_vitalicio') {
      return {
        isento: true,
        label: 'Isenção Vitalícia',
        detalhe: 'Tarifa zero Naville perpétua (R$ 0,00/operação)',
        tipo: 'vitalicio',
      };
    }

    if (splitCarenciaTipo === 'dias' && splitDataAtivacao) {
      const dataAtiv = new Date(splitDataAtivacao);
      const hoje = new Date();
      const diffDias = Math.floor((hoje.getTime() - dataAtiv.getTime()) / (1000 * 60 * 60 * 24));
      const limite = splitDiasGratis || 30;
      const restam = Math.max(0, limite - diffDias);
      const isento = diffDias <= limite;

      return {
        isento,
        label: isento ? `Carência Ativa (${restam} dias restantes)` : 'Carência em Dias Encerrada',
        detalhe: isento 
          ? `Operação sem taxa Naville pelos próximos ${restam} dias` 
          : `Prazo de ${limite} dias esgotado • R$ ${splitTaxaTransacao.toFixed(2)} por operação`,
        tipo: 'dias',
        restam,
        diffDias,
      };
    }

    if (splitCarenciaTipo === 'transacoes') {
      const feitas = splitContadorMes || 0;
      const limite = splitFranquiaMensal || 30;
      const restam = Math.max(0, limite - feitas);
      const isento = feitas < limite;

      return {
        isento,
        label: isento ? `Franquia Mensal Ativa (${restam} grátis)` : 'Franquia Mensal Esgotada',
        detalhe: isento 
          ? `${feitas} de ${limite} operações gratuitas consumidas este mês`
          : `${feitas} transações realizadas no mês • Tarifa de R$ ${splitTaxaTransacao.toFixed(2)}`,
        tipo: 'transacoes',
        restam,
        feitas,
      };
    }

    return {
      isento: false,
      label: 'Cobrança Normal',
      detalhe: `R$ ${splitTaxaTransacao.toFixed(2)} por operação excedente`,
      tipo: 'padrao',
    };
  }, [splitCarenciaTipo, splitDataAtivacao, splitDiasGratis, splitFranquiaMensal, splitContadorMes, splitTaxaTransacao]);

  // Cálculo da simulação em tempo real
  const fatiaNaville = useMemo(() => {
    if (!splitAtivo) return 0;
    return taxaNavilleUnitaria;
  }, [splitAtivo, taxaNavilleUnitaria]);

  const fatiaBarbeiro = useMemo(() => {
    const base = Math.max(0, valorSimulado - fatiaNaville);
    const v = base * (comissaoSimulada / 100);
    return Math.max(0, Number(v.toFixed(2)));
  }, [valorSimulado, fatiaNaville, comissaoSimulada]);

  const fatiaBarbearia = useMemo(() => {
    const v = valorSimulado - fatiaNaville - fatiaBarbeiro;
    return Math.max(0, Number(v.toFixed(2)));
  }, [valorSimulado, fatiaNaville, fatiaBarbeiro]);

  // Salvar configurações do Split da Barbearia
  const handleSalvarConfig = async () => {
    if (!selectedTenant) return;
    setSavingConfig(true);
    setSaveSuccess(false);

    try {
      const patch = {
        split_ativo: splitAtivo,
        modulo_split_asaas: splitAtivo,
        split_carencia_tipo: splitCarenciaTipo,
        split_dias_gratis: Number(splitDiasGratis),
        split_data_ativacao: splitDataAtivacao,
        split_franquia_transacoes_mensal: Number(splitFranquiaMensal),
        split_contador_mes_atual: Number(splitContadorMes),
        split_taxa_transacao: Number(splitTaxaTransacao),
        split_mensalidade_modulo: Number(splitMensalidadeModulo),
        split_taxa_tipo: tipoTaxa,
        split_taxa_valor: Number(taxaValor),
        asaas_wallet_id: asaasWalletId.trim() || null,
      };

      const updated = await pb.collection('barbearias').update(selectedTenant.id, patch);
      setSelectedTenant(updated);
      if (onUpdateTenant) onUpdateTenant(updated);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar configurações de split:', err);
      alert(err.message || 'Falha ao salvar configurações de Split.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Salvar Configuração de Repasse Bancário e Provisionar Subconta no Asaas
  const handleSalvarRepasse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTenant) {
      dispararToast('erro', 'Nenhuma barbearia selecionada.', 'Erro');
      return;
    }

    const chaveLimpa = pixChaveRepasse.trim();

    // 1. Validação explícita antes do submit: se vazia ou menor que tamanho mínimo
    if (!chaveLimpa || chaveLimpa.length < 5) {
      dispararToast('erro', 'Preencha uma chave Pix válida.', 'Validação');
      return;
    }

    setSavingRepasse(true);
    setRepasseSuccess(false);

    try {
      // 2. Sanitização e montagem do payload Asaas
      const chavePixNumeros = chaveLimpa.replace(/\D/g, '');
      const docCadastrado = (
        selectedTenant.documento ||
        selectedTenant.cpf_cnpj ||
        selectedTenant.cnpj ||
        ''
      ).replace(/\D/g, '');

      // Prioriza documento cadastrado ou a chave Pix limpa
      const cpfCnpjFinal =
        docCadastrado ||
        (chavePixNumeros.length === 11 || chavePixNumeros.length === 14
          ? chavePixNumeros
          : chavePixNumeros.padEnd(11, '0'));

      const payloadAsaas = {
        name: selectedTenant.nome || 'Barbearia Parceira',
        email:
          selectedTenant.email_dono ||
          selectedTenant.email ||
          `${selectedTenant.slug || 'loja'}@navillebarber.com`,
        cpfCnpj: cpfCnpjFinal,
        mobilePhone: (selectedTenant.telefone || '').replace(/\D/g, '') || '11999999999',
        address: selectedTenant.endereco || 'Rua Principal',
        addressNumber: selectedTenant.numero || 'S/N',
        postalCode: (selectedTenant.cep || '13770000').replace(/\D/g, '') || '13770000',
      };

      // 3. Provisionamento da Subconta no Asaas (se não houver wallet_id)
      let walletIdFinal = selectedTenant.asaas_wallet_id;
      let accountIdFinal = selectedTenant.asaas_account_id || selectedTenant.asaas_id;

      if (!walletIdFinal) {
        const subcontaRes = await criarSubcontaAsaas(payloadAsaas);
        walletIdFinal = subcontaRes.walletId;
        accountIdFinal = subcontaRes.id;
      }

      // 4. Persistência dos dados e do walletId no PocketBase
      const patch: Record<string, any> = {
        pix_tipo_chave: pixTipoChave,
        pix_chave_repasse: chaveLimpa,
        banco_nome: bancoNome.trim(),
        asaas_wallet_id: walletIdFinal,
      };

      if (accountIdFinal) {
        patch.asaas_account_id = accountIdFinal;
      }

      const updated = await pb.collection('barbearias').update(selectedTenant.id, patch);
      setSelectedTenant(updated);
      setAsaasWalletId(walletIdFinal || '');
      if (onUpdateTenant) onUpdateTenant(updated);

      setRepasseSuccess(true);
      setTimeout(() => setRepasseSuccess(false), 3500);

      // Toast de sucesso com walletId retornado
      dispararToast(
        'sucesso',
        `Repasse salvo e subconta vinculada com sucesso! Wallet ID: ${walletIdFinal}`,
        'Subconta Asaas Ativa'
      );
    } catch (err: any) {
      console.error('Erro ao provisionar subconta e salvar repasse:', err);
      const mensagemErro =
        err?.message ||
        (typeof err === 'string'
          ? err
          : 'Falha ao salvar dados de repasse ou comunicar com o Asaas.');
      dispararToast('erro', mensagemErro, 'Erro no Asaas / PocketBase');
    } finally {
      setSavingRepasse(false);
    }
  };

  // Ações de Governança e Carência
  const handleRenovarCarenciaDias = async () => {
    if (!selectedTenant) return;
    try {
      const hojeIso = new Date().toISOString();
      setSplitDataAtivacao(hojeIso);
      await pb.collection('barbearias').update(selectedTenant.id, {
        split_data_ativacao: hojeIso,
        split_dias_gratis: splitDiasGratis || 30,
      });
      setTerminalFeedback('Carência de dias renovada a partir de hoje!');
      setTimeout(() => setTerminalFeedback(''), 3000);
    } catch (err: any) {
      console.error('Erro ao renovar carência:', err);
    }
  };

  const handleResetarContadorMes = async () => {
    if (!selectedTenant) return;
    try {
      setSplitContadorMes(0);
      await pb.collection('barbearias').update(selectedTenant.id, {
        split_contador_mes_atual: 0,
      });
      setTerminalFeedback('Contador mensal de operações zerado com sucesso!');
      setTimeout(() => setTerminalFeedback(''), 3000);
    } catch (err: any) {
      console.error('Erro ao zerar contador:', err);
    }
  };

  // Ações nos Terminais de Pagamento
  const handleCriarTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !novoTerminalIdentificador.trim()) return;
    setSalvandoTerminal(true);

    try {
      const codAleatorio = Math.floor(100000 + Math.random() * 900000).toString();
      const created = await pb.collection('terminais_pagamento').create({
        barbearia: selectedTenant.id,
        identificador: novoTerminalIdentificador.trim(),
        tipo_terminal: novoTerminalTipo,
        codigo_pareamento: codAleatorio,
        status: 'online',
      });

      setTerminais((prev) => [created as unknown as TerminalPagamento, ...prev]);
      setModalNovoTerminalOpen(false);
      setNovoTerminalIdentificador('Balcão Principal');
      setTerminalFeedback(`Terminal "${created.identificador}" pareado com sucesso (#${codAleatorio})!`);
      setTimeout(() => setTerminalFeedback(''), 3500);
    } catch (err: any) {
      console.error('Erro ao criar terminal:', err);
      alert(err.message || 'Falha ao parear terminal.');
    } finally {
      setSalvandoTerminal(false);
    }
  };

  const handleDispararTefWeb = async (term: TerminalPagamento) => {
    if (!selectedTenant) return;
    setDisparandoTerminalId(term.id);

    try {
      await pb.collection('terminais_pagamento').update(term.id, {
        status: 'aguardando_pagamento',
      });
      setTerminais((prev) =>
        prev.map((t) => (t.id === term.id ? { ...t, status: 'aguardando_pagamento' } : t))
      );
      setTerminalFeedback(`Disparo TEF Web enviado para "${term.identificador}"! Status: Aguardando Pagamento.`);
      setTimeout(() => setTerminalFeedback(''), 4000);
    } catch (err: any) {
      console.error('Erro ao disparar TEF Web:', err);
      alert('Erro ao disparar cobrança remota para o terminal.');
    } finally {
      setDisparandoTerminalId(null);
    }
  };

  const handleLiberarTerminal = async (termId: string) => {
    try {
      await pb.collection('terminais_pagamento').update(termId, {
        status: 'online',
        cobranca_ativa: null,
      });
      setTerminais((prev) =>
        prev.map((t) => (t.id === termId ? { ...t, status: 'online', cobranca_ativa: undefined } : t))
      );
      setTerminalFeedback('Terminal liberado e pronto para novas cobranças.');
      setTimeout(() => setTerminalFeedback(''), 3000);
    } catch (err: any) {
      console.error('Erro ao liberar terminal:', err);
    }
  };

  const handleExcluirTerminal = async (termId: string) => {
    if (!confirm('Deseja realmente desparear este terminal?')) return;
    try {
      await pb.collection('terminais_pagamento').delete(termId);
      setTerminais((prev) => prev.filter((t) => t.id !== termId));
      setTerminalFeedback('Terminal removido com sucesso.');
      setTimeout(() => setTerminalFeedback(''), 3000);
    } catch (err: any) {
      console.error('Erro ao remover terminal:', err);
    }
  };

  // Selecionar Canal de Captura Principal
  const handleSelecionarCanalCaptura = async (canal: 'display_pix' | 'tap_phone' | 'smart_pos') => {
    if (!selectedTenant) return;
    setCanalCaptura(canal);

    try {
      const patch = {
        canal_captura_principal: canal,
      };
      const updated = await pb.collection('barbearias').update(selectedTenant.id, patch);
      setSelectedTenant(updated);
      if (onUpdateTenant) onUpdateTenant(updated);
    } catch (err: any) {
      console.error('Erro ao atualizar canal de captura:', err);
    }
  };

  // Confirmar Solicitação da Maquininha Smart POS
  const handleConfirmarSolicitacaoMaquininha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setEnviandoSolicitacao(true);

    try {
      const patch = {
        solicitou_maquininha: true,
        maquininha_modelo: modeloEscolhidoModal,
        canal_captura_principal: 'smart_pos',
      };

      const updated = await pb.collection('barbearias').update(selectedTenant.id, patch);
      setSelectedTenant(updated);
      setSolicitouMaquininha(true);
      setMaquininhaModelo(modeloEscolhidoModal);
      setCanalCaptura('smart_pos');
      if (onUpdateTenant) onUpdateTenant(updated);

      setSolicitacaoSucesso(true);
      setTimeout(() => {
        setSolicitacaoSucesso(false);
        setModalMaquininhaOpen(false);
      }, 1800);
    } catch (err: any) {
      console.error('Erro ao solicitar maquininha:', err);
      alert(err.message || 'Falha ao registrar solicitação da maquininha.');
    } finally {
      setEnviandoSolicitacao(false);
    }
  };

  // Abrir modal de subconta
  const handleAbrirModalSubconta = (p: Profissional) => {
    setSelectedProf(p);
    setSubNome(p.nome || '');
    setSubEmail((p as any).email || `${p.nome.toLowerCase().replace(/\s+/g, '')}@naville.local`);
    setSubCpf(p.cpf_cnpj || '');
    setSubTelefone(p.telefone || '');
    setSubComissao(p.porcentagem_comissao ?? p.taxa_comissao ?? 50);
    setSubPix(p.pix_chave || '');
    setSubcontaFeedback(null);
    setModalSubcontaOpen(true);
  };

  // Processar criação / sincronização da subconta no Asaas
  const handleConfirmarSubconta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProf || !selectedTenant) return;

    if (!subCpf || subCpf.replace(/\D/g, '').length < 11) {
      setSubcontaFeedback({ tipo: 'err', msg: 'Informe um CPF ou CNPJ válido.' });
      return;
    }

    setGerandoSubconta(true);
    setSubcontaFeedback(null);

    try {
      // 1. Cria Subconta no Asaas
      const subcontaRes = await criarSubcontaAsaas({
        name: subNome,
        email: subEmail,
        cpfCnpj: subCpf,
        mobilePhone: subTelefone,
      });

      // 2. Atualiza Profissional no PocketBase
      const patchProf = {
        asaas_account_id: subcontaRes.id,
        asaas_wallet_id: subcontaRes.walletId,
        porcentagem_comissao: Number(subComissao),
        taxa_comissao: Number(subComissao),
        cpf_cnpj: subCpf,
        pix_chave: subPix,
        split_status: 'ativo',
      };

      const profAtualizado = await pb.collection('profissionais').update(selectedProf.id, patchProf);

      setProfissionais((prev) =>
        prev.map((item) => (item.id === profAtualizado.id ? profAtualizado : item))
      );

      setSubcontaFeedback({
        tipo: 'ok',
        msg: `Subconta criada com sucesso! Wallet ID: ${subcontaRes.walletId}`,
      });

      setTimeout(() => {
        setModalSubcontaOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao gerar subconta:', err);
      setSubcontaFeedback({
        tipo: 'err',
        msg: err.message || 'Falha ao comunicar com a API do Asaas.',
      });
    } finally {
      setGerandoSubconta(false);
    }
  };

  // Criar novo barbeiro rápido
  const handleCriarNovoBarbeiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !novoNome) return;

    setSalvandoNovo(true);
    try {
      const record = await pb.collection('profissionais').create({
        barbearia_id: selectedTenant.id,
        nome: novoNome,
        telefone: novoTelefone,
        taxa_comissao: novaComissao,
        porcentagem_comissao: novaComissao,
        cpf_cnpj: novoCpf,
        ativo: true,
        tipo_atendimento: 'ambos',
        aceita_clube: true,
        servicos_ids: [],
        split_status: novoCpf ? 'pendente' : 'recusado',
      });

      setProfissionais((prev) => [record as Profissional, ...prev]);
      setModalNovoBarbeiroOpen(false);
      setNovoNome('');
      setNovoTelefone('');
      setNovoCpf('');
      setNovaComissao(50);
    } catch (err: any) {
      console.error('Erro ao cadastrar profissional:', err);
      alert(err.message || 'Falha ao cadastrar barbeiro.');
    } finally {
      setSalvandoNovo(false);
    }
  };

  // Filtro de profissionais
  const profissionaisFiltrados = useMemo(() => {
    return profissionais.filter(
      (p) =>
        p.nome.toLowerCase().includes(buscaProf.toLowerCase()) ||
        (p.cpf_cnpj && p.cpf_cnpj.includes(buscaProf)) ||
        (p.asaas_wallet_id && p.asaas_wallet_id.toLowerCase().includes(buscaProf.toLowerCase()))
    );
  }, [profissionais, buscaProf]);

  return (
    <div className="flex flex-col gap-5 text-white max-w-5xl mx-auto w-full font-sans animate-in fade-in duration-300 relative">
      
      {/* Toast Flutuante de Feedback Visual */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div
            className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${
              toast.tipo === 'sucesso'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
                : toast.tipo === 'erro'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-rose-500/10'
                : 'bg-zinc-950/90 border-white/20 text-zinc-200 shadow-zinc-900/30'
            }`}
          >
            {toast.tipo === 'sucesso' ? (
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            ) : toast.tipo === 'erro' ? (
              <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />
            ) : (
              <Info className="text-sky-400 shrink-0 mt-0.5" size={18} />
            )}
            <div className="flex-1 text-xs">
              {toast.titulo && <p className="font-bold mb-0.5 tracking-wide">{toast.titulo}</p>}
              <p className="leading-relaxed whitespace-pre-wrap">{toast.mensagem}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 1. HEADER & INTRODUÇÃO EXECUTIVA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <GitFork size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wide text-white">Split de Pagamentos Asaas</h2>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                Lei Salão-Parceiro
              </span>
              {selectedTenant && (
                <span className="text-[10px] bg-white/[0.04] text-zinc-300 border border-white/10 px-2 py-0.5 rounded font-medium">
                  {selectedTenant.nome}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Rateio automático no ato do Pix/Cartão entre Barbearia, Barbeiro e Taxa Naville (Take-Rate).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Loja se não houver loja travada */}
          {!initialTenant && tenants.length > 1 && (
            <div className="relative">
              <select
                value={selectedTenant?.id || ''}
                onChange={(e) => {
                  const found = tenants.find((t) => t.id === e.target.value);
                  if (found) setSelectedTenant(found);
                }}
                className="bg-black/60 border border-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 appearance-none pr-7 cursor-pointer"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id} className="bg-zinc-900 text-white">
                    {t.nome}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="text-zinc-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">Status do Split:</span>
            <button 
              type="button"
              onClick={() => setSplitAtivo(!splitAtivo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                splitAtivo 
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                  : 'bg-white/5 border border-white/10 text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${splitAtivo ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              {splitAtivo ? 'Split Automático Ativo' : 'Módulo Desativado'}
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Fechar painel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. GRADE CENTRAL: CONFIGURAÇÃO DE TAXAS & SIMULADOR VISUAL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Bloco de Configuração da Taxa Naville (5 colunas) */}
        <div className="md:col-span-5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between gap-4 backdrop-blur-sm">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                <DollarSign className="text-emerald-400" size={14} />
                Retenção Naville (Take-Rate)
              </span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Por Transação</span>
            </div>
            
            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
              Valor retido diretamente para a sua conta-mãe. Conforme a Lei Salão-Parceiro, a bitributação é evitada e o rateio é líquido.
            </p>

            {/* Alternador Fixa vs Percentual */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => setTipoTaxa('fixa')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  tipoTaxa === 'fixa' 
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)]' 
                    : 'bg-transparent border-white/5 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Taxa Fixa (R$)
              </button>
              <button
                type="button"
                onClick={() => setTipoTaxa('percentual')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  tipoTaxa === 'percentual' 
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)]' 
                    : 'bg-transparent border-white/5 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Porcentagem (%)
              </button>
            </div>

            <div className="mt-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                {tipoTaxa === 'fixa' ? 'Valor Fixo por Agendamento Pago' : 'Percentual sobre o Serviço'}
              </label>
              <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-500 transition-colors">
                <span className="text-xs text-zinc-500 font-mono mr-2">
                  {tipoTaxa === 'fixa' ? 'R$' : '%'}
                </span>
                <input 
                  type="number" 
                  step="0.10"
                  value={taxaValor}
                  onChange={(e) => setTaxaValor(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Wallet ID da Barbearia (Tenant) */}
            <div className="mt-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Wallet ID da Barbearia (Asaas)
              </label>
              <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-500 transition-colors">
                <Wallet className="text-zinc-500 mr-2" size={13} />
                <input 
                  type="text"
                  placeholder="wal_000000000000 ou ID da carteira"
                  value={asaasWalletId}
                  onChange={(e) => setAsaasWalletId(e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none font-mono placeholder:text-zinc-600"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2">
              <Info className="text-indigo-400 shrink-0 mt-0.5" size={14} />
              <p className="text-[10px] text-zinc-400 leading-normal">
                O Asaas realiza o split em D+0. A transferência para as subcontas é instantânea assim que o Pix é compensado.
              </p>
            </div>

            <div className="flex items-center justify-between mt-1">
              {saveSuccess ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> Salvo com sucesso!
                </span>
              ) : <div />}

              <button
                type="button"
                onClick={handleSalvarConfig}
                disabled={savingConfig || !selectedTenant}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(99,102,241,0.25)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                <span>{savingConfig ? 'Gravando...' : 'Salvar Regras de Split'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Simulador Interativo do Rateio (7 colunas) */}
        <div className="md:col-span-7 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-between backdrop-blur-sm">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                <Sparkles className="text-amber-400" size={14} />
                Simulador de Rateio ao Vivo
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                Exemplo de Corte
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Valor do Corte (R$)</label>
                <input 
                  type="number"
                  step="5"
                  value={valorSimulado}
                  onChange={(e) => setValorSimulado(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Comissão do Barbeiro (%)</label>
                <input 
                  type="number"
                  step="5"
                  value={comissaoSimulada}
                  onChange={(e) => setComissaoSimulada(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Gráfico Visual de Distribuição */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-3 shadow-inner">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-zinc-400">Divisão do Recebimento:</span>
              <span className="text-white font-bold">Total Bruto: R$ {valorSimulado.toFixed(2)}</span>
            </div>

            {/* Barra de Progresso Segmentada */}
            <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden flex shadow-sm">
              <div 
                style={{ width: `${valorSimulado > 0 ? (fatiaBarbeiro / valorSimulado) * 100 : 0}%` }} 
                className="bg-amber-500 transition-all duration-300" 
                title={`Barbeiro: R$ ${fatiaBarbeiro.toFixed(2)}`}
              />
              <div 
                style={{ width: `${valorSimulado > 0 ? (fatiaBarbearia / valorSimulado) * 100 : 0}%` }} 
                className="bg-blue-500 transition-all duration-300" 
                title={`Barbearia: R$ ${fatiaBarbearia.toFixed(2)}`}
              />
              <div 
                style={{ width: `${valorSimulado > 0 ? (fatiaNaville / valorSimulado) * 100 : 0}%` }} 
                className="bg-emerald-500 transition-all duration-300" 
                title={`Naville Take-Rate: R$ ${fatiaNaville.toFixed(2)}`}
              />
            </div>

            {/* Três Cards de Resumo de Rateio */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
              <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <span className="text-[9px] text-amber-400 font-bold uppercase block tracking-wider">Barbeiro ({comissaoSimulada}%)</span>
                <span className="text-xs font-mono font-bold text-white block mt-0.5">R$ {fatiaBarbeiro.toFixed(2)}</span>
                <span className="text-[8px] text-zinc-500 font-mono">
                  {valorSimulado > 0 ? ((fatiaBarbeiro / valorSimulado) * 100).toFixed(1) : 0}% do total
                </span>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <span className="text-[9px] text-blue-400 font-bold uppercase block tracking-wider">Barbearia</span>
                <span className="text-xs font-mono font-bold text-white block mt-0.5">R$ {fatiaBarbearia.toFixed(2)}</span>
                <span className="text-[8px] text-zinc-500 font-mono">
                  {valorSimulado > 0 ? ((fatiaBarbearia / valorSimulado) * 100).toFixed(1) : 0}% do total
                </span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-[9px] text-emerald-400 font-bold uppercase block tracking-wider">Naville (SaaS)</span>
                <span className="text-xs font-mono font-bold text-white block mt-0.5">R$ {fatiaNaville.toFixed(2)}</span>
                <span className="text-[8px] text-zinc-400 font-mono">
                  {statusCarencia.isento ? (
                    <span className="text-emerald-400 font-bold">Isento (R$ 0,00)</span>
                  ) : (
                    `R$ ${splitTaxaTransacao.toFixed(2)} /op`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* REGRAS COMERCIAIS DO SPLIT */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <GitFork className="text-indigo-400" size={16} />
            <span className="text-xs font-bold text-white">Regras Comerciais do Split</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Take-rate: R$ {Number(selectedTenant?.split_taxa_transacao || splitTaxaTransacao || 0.35).toFixed(2)}/op
            </span>
            <button
              type="button"
              onClick={handleSalvarConfig}
              disabled={savingConfig || !selectedTenant}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
              <span>Salvar Regras</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSplitCarenciaTipo('dias')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              splitCarenciaTipo === 'dias' ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500 hover:text-zinc-400'
            }`}
          >
            Dias Gratuitos
          </button>
          <button
            type="button"
            onClick={() => setSplitCarenciaTipo('transacoes')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              splitCarenciaTipo === 'transacoes' ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-zinc-500 hover:text-zinc-400'
            }`}
          >
            Cota Mensal Grátis
          </button>
          <button
            type="button"
            onClick={() => setSplitCarenciaTipo('isento_vitalicio')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              splitCarenciaTipo === 'isento_vitalicio' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'border-white/5 text-zinc-500 hover:text-zinc-400'
            }`}
          >
            Isenção Total (R$ 0)
          </button>
        </div>

        {splitCarenciaTipo === 'dias' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="text-[10px] text-zinc-400">Dias de carência:</label>
            <input
              type="number"
              value={splitDiasGratis}
              onChange={(e) => setSplitDiasGratis(Number(e.target.value))}
              className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
              placeholder="30"
            />
            <span className="text-[10px] text-zinc-500">dias a contar da ativação</span>
            <button
              type="button"
              onClick={handleRenovarCarenciaDias}
              className="ml-auto text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
            >
              Renovar hoje ({statusCarencia.restam ?? 0} dias restantes)
            </button>
          </div>
        )}

        {splitCarenciaTipo === 'transacoes' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="text-[10px] text-zinc-400">Cota mensal:</label>
            <input
              type="number"
              value={splitFranquiaMensal}
              onChange={(e) => setSplitFranquiaMensal(Number(e.target.value))}
              className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
              placeholder="30"
            />
            <span className="text-[10px] text-zinc-500">transações gratuitas todo mês</span>
            <button
              type="button"
              onClick={handleResetarContadorMes}
              className="ml-auto text-[10px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
            >
              Zerar contador ({splitContadorMes} usadas no mês)
            </button>
          </div>
        )}

        {splitCarenciaTipo === 'isento_vitalicio' && (
          <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1">
            <Gift size={13} />
            <span>Isenção vitalícia ativada: R$ 0,00 de retenção Naville em qualquer volume.</span>
          </div>
        )}
      </div>

      {/* 3. HARDWARE & MÉTODOS DE CAPTURA DE PAGAMENTO */}
      <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Hardware & Métodos de Captura de Pagamento
                </h3>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                  Zero Custo Inicial
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Inicie sem investimento em aparelhos com Display Pix dinâmico ou Celular NFC, com opção de Maquininha Smart posterior.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono">Canal Ativo:</span>
            <span className="text-[10px] font-bold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded">
              {canalCaptura === 'display_pix' && 'Display Pix / Tablet'}
              {canalCaptura === 'tap_phone' && 'Terminal Celular NFC'}
              {canalCaptura === 'smart_pos' && (solicitouMaquininha ? `Smart POS (${maquininhaModelo})` : 'Smart POS')}
            </span>
          </div>
        </div>

        {/* MATRIZ DE CANAIS DE CAPTURA (3 MODALIDADES) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Card 1: Display Pix no Balcão / Tablet */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
            canalCaptura === 'display_pix'
              ? 'bg-emerald-500/[0.04] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
              : 'bg-white/[0.015] border-white/[0.06] hover:border-white/15'
          }`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <QrCode size={16} />
                </div>
                <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Ativo • Sem Custo
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white">Display Pix no Balcão / Tablet</h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                  Geração de QR Code Pix dinâmico no computador, tablet ou celular da recepção. Split imediato em D+0.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSelecionarCanalCaptura('display_pix')}
                className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  canalCaptura === 'display_pix'
                    ? 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                }`}
              >
                {canalCaptura === 'display_pix' ? (
                  <>
                    <Check size={12} />
                    <span>Selecionado / Padrão</span>
                  </>
                ) : (
                  <span>Definir como Principal</span>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Terminal Celular (Tap on Phone / NFC) */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
            canalCaptura === 'tap_phone'
              ? 'bg-blue-500/[0.04] border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.08)]'
              : 'bg-white/[0.015] border-white/[0.06] hover:border-white/15'
          }`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <SmartphoneNfc size={16} />
                </div>
                <span className="text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Sem Aparelho Físico
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white">Terminal Celular (Tap on Phone / NFC)</h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                  Transforme o smartphone Android da barbearia ou dos barbeiros em terminal de aproximação para débito e crédito.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSelecionarCanalCaptura('tap_phone')}
                className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  canalCaptura === 'tap_phone'
                    ? 'bg-blue-600/30 border border-blue-500/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                }`}
              >
                {canalCaptura === 'tap_phone' ? (
                  <>
                    <Check size={12} />
                    <span>Terminal Móvel Ativo</span>
                  </>
                ) : (
                  <span>Habilitar Terminal Móvel</span>
                )}
              </button>
            </div>
          </div>

          {/* Card 3: Maquininha Smart Homologada (Smart POS) */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
            canalCaptura === 'smart_pos'
              ? 'bg-amber-500/[0.04] border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
              : 'bg-white/[0.015] border-white/[0.06] hover:border-white/15'
          }`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Upgrade Opcional
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Maquininha Smart Homologada</span>
                  <Cpu size={12} className="text-amber-400" />
                </h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                  Equipamento físico com impressora térmica integrada para alto volume de cartões com chip e aproximação.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
              {solicitouMaquininha ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> Pedido: {maquininhaModelo}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalMaquininhaOpen(true)}
                    className="w-full py-1 px-2.5 rounded-lg text-[9px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-all cursor-pointer"
                  >
                    Gerenciar Pedido de Maquininha
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalMaquininhaOpen(true)}
                  className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CreditCard size={12} />
                  <span>Solicitar / Vincular Maquininha</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* CENTRAL DE TERMINAIS DE PAGAMENTO (SMART LINK / TEF WEB & MODO PWA) */}
        <div className="mt-2 p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/5 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="text-emerald-400" size={16} />
                <h4 className="text-xs font-bold text-white">Terminais Pareados (TEF Web & Smart Link)</h4>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  {terminais.length} terminais ativos
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Dispare cobranças do PC direto para a maquininha via TEF Web ou utilize o Modo PWA Autônomo com código de 6 dígitos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModalNovoTerminalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <Plus size={13} />
              <span>Parear Novo Terminal</span>
            </button>
          </div>

          {terminalFeedback && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>{terminalFeedback}</span>
            </div>
          )}

          {loadingTerminais ? (
            <div className="py-6 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-emerald-400" />
              <span>Carregando terminais pareados...</span>
            </div>
          ) : terminais.length === 0 ? (
            <div className="py-6 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
              <Radio size={22} className="text-zinc-600" />
              <span>Nenhum terminal pareado para esta barbearia. Clique em "Parear Novo Terminal" para conectar o balcão.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {terminais.map((t) => {
                const isOnline = t.status === 'online';
                const isAguardando = t.status === 'aguardando_pagamento';

                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                      isAguardando
                        ? 'bg-amber-500/[0.06] border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.12)]'
                        : isOnline
                        ? 'bg-emerald-500/[0.03] border-emerald-500/30'
                        : 'bg-white/[0.015] border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                          t.tipo_terminal === 'tef_smartlink'
                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {t.tipo_terminal === 'tef_smartlink' ? <Monitor size={16} /> : <CreditCard size={16} />}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{t.identificador}</span>
                            <span className="text-[9px] bg-white/5 text-zinc-400 border border-white/10 px-1.5 py-0.2 rounded font-normal">
                              {t.tipo_terminal === 'tef_smartlink' ? 'TEF Smart Link' : 'PWA Maquininha'}
                            </span>
                          </h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-500 font-mono">Código:</span>
                            <span className="text-xs font-bold font-mono text-emerald-400 tracking-wider">
                              {t.codigo_pareamento}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(t.codigo_pareamento);
                                setTerminalFeedback(`Código ${t.codigo_pareamento} copiado!`);
                                setTimeout(() => setTerminalFeedback(''), 2500);
                              }}
                              className="text-zinc-500 hover:text-white transition-colors"
                              title="Copiar código de pareamento"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          isAguardando ? 'bg-amber-400 animate-ping' : isOnline ? 'bg-emerald-400' : 'bg-zinc-600'
                        }`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isAguardando ? 'text-amber-400' : isOnline ? 'text-emerald-400' : 'text-zinc-500'
                        }`}>
                          {isAguardando ? 'Aguardando Pagamento' : isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {isAguardando ? (
                          <button
                            type="button"
                            onClick={() => handleLiberarTerminal(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Liberar Terminal
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDispararTefWeb(t)}
                            disabled={disparandoTerminalId === t.id}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Send size={10} />
                            <span>{disparandoTerminalId === t.id ? 'Disparando...' : 'Testar Disparo TEF'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setTerminalSelecionadoPwa(t);
                            setModalPwaOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode size={11} />
                          <span>Modo PWA</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExcluirTerminal(t.id)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remover terminal"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 1. CONFIGURAÇÃO DE REPASSE BANCÁRIO (CONTA DO PROPRIETÁRIO) */}
        <div className="mt-2 p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/5 gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                <Landmark className="text-indigo-400" size={14} />
                <span>Destino dos Repasses Líquidos (Conta Bancária Atual)</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                O saldo rateado cai diretamente no seu banco habitual via Pix, sem necessidade de transferências manuais.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {repasseSuccess && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <Check size={12} /> Dados bancários salvos!
                </span>
              )}
              <button
                type="button"
                onClick={handleSalvarRepasse}
                disabled={savingRepasse || !selectedTenant}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingRepasse ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                <span>{savingRepasse ? 'Salvando e criando subconta...' : 'Salvar Repasse'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSalvarRepasse} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Tipo de Chave Pix
              </label>
              <select
                value={pixTipoChave}
                onChange={(e) => setPixTipoChave(e.target.value as any)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="cnpj" className="bg-zinc-900 text-white">CNPJ</option>
                <option value="cpf" className="bg-zinc-900 text-white">CPF</option>
                <option value="email" className="bg-zinc-900 text-white">E-mail</option>
                <option value="telefone" className="bg-zinc-900 text-white">Telefone</option>
                <option value="aleatoria" className="bg-zinc-900 text-white">Chave Aleatória (EVP)</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Chave Pix de Repasse
              </label>
              <input
                type="text"
                placeholder={
                  pixTipoChave === 'cnpj'
                    ? '00.000.000/0001-00'
                    : pixTipoChave === 'cpf'
                    ? '000.000.000-00'
                    : pixTipoChave === 'email'
                    ? 'financeiro@barbearia.com'
                    : pixTipoChave === 'telefone'
                    ? '(11) 99999-9999'
                    : 'Chave aleatória gerada pelo banco'
                }
                value={pixChaveRepasse}
                onChange={(e) => setPixChaveRepasse(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono focus:border-indigo-500 placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Instituição Bancária
              </label>
              <select
                value={bancoNome}
                onChange={(e) => setBancoNome(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Nubank" className="bg-zinc-900 text-white">Nubank (Nu Pagamentos)</option>
                <option value="Itaú" className="bg-zinc-900 text-white">Itaú Unibanco</option>
                <option value="Inter" className="bg-zinc-900 text-white">Banco Inter</option>
                <option value="Bradesco" className="bg-zinc-900 text-white">Bradesco</option>
                <option value="Santander" className="bg-zinc-900 text-white">Santander</option>
                <option value="Banco do Brasil" className="bg-zinc-900 text-white">Banco do Brasil</option>
                <option value="C6 Bank" className="bg-zinc-900 text-white">C6 Bank</option>
                <option value="Sicredi" className="bg-zinc-900 text-white">Sicredi</option>
                <option value="Outro Banco" className="bg-zinc-900 text-white">Outro Banco</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                Frequência de Liquidação
              </label>
              <select
                value={frequenciaLiquidacao}
                onChange={(e) => setFrequenciaLiquidacao(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="d0_instantaneo" className="bg-zinc-900 text-white">Instantâneo D+0 via Pix</option>
                <option value="diario_automatico" className="bg-zinc-900 text-white">Fechamento Diário Automático</option>
              </select>
            </div>
          </form>
        </div>

      </div>

      {/* 4. LISTAGEM DE SUBCONTAS DOS BARBEIROS */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 mb-3 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white">Subcontas dos Barbeiros</h3>
              <span className="text-[9px] bg-white/5 text-zinc-400 border border-white/10 px-2 py-0.5 rounded-full font-mono">
                {profissionais.length} cadastrados
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              Cada profissional recebe sua comissão líquida diretamente na sua carteira do Asaas sem bitributação.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search size={12} className="text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar barbeiro ou CPF..."
                value={buscaProf}
                onChange={(e) => setBuscaProf(e.target.value)}
                className="bg-white/[0.03] border border-white/10 text-white text-[11px] rounded-lg pl-7 pr-2.5 py-1.5 outline-none focus:border-indigo-500 w-44 placeholder:text-zinc-600"
              />
            </div>

            <button
              type="button"
              onClick={() => setModalNovoBarbeiroOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <UserPlus size={13} /> Convidar Barbeiro p/ Subconta
            </button>
          </div>
        </div>

        {loadingProfs ? (
          <div className="py-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-indigo-400" />
            Carregando profissionais da barbearia...
          </div>
        ) : profissionaisFiltrados.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <AlertCircle size={20} className="text-zinc-600" />
            <span>Nenhum profissional encontrado para este filtro ou barbearia.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                  <th className="pb-2 font-medium">Profissional</th>
                  <th className="pb-2 font-medium">Documento</th>
                  <th className="pb-2 font-medium">Comissão</th>
                  <th className="pb-2 font-medium">Chave PIX</th>
                  <th className="pb-2 font-medium">Wallet ID Asaas</th>
                  <th className="pb-2 font-medium">Status Subconta</th>
                  <th className="pb-2 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {profissionaisFiltrados.map((p) => {
                  const comissao = p.porcentagem_comissao ?? p.taxa_comissao ?? 50;
                  const temWallet = !!p.asaas_wallet_id;
                  const status = p.split_status || (temWallet ? 'ativo' : 'pendente');

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-2.5 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold">
                            {p.nome.charAt(0)}
                          </div>
                          <span>{p.nome}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-zinc-400 font-mono text-[11px]">
                        {p.cpf_cnpj ? p.cpf_cnpj : <span className="text-zinc-600 italic">Pendente</span>}
                      </td>
                      <td className="py-2.5 text-zinc-300 font-mono">
                        <span className="font-bold text-amber-400">{comissao}%</span>
                      </td>
                      <td className="py-2.5 text-zinc-400 font-mono text-[11px]">
                        {p.pix_chave ? p.pix_chave : <span className="text-zinc-600">-</span>}
                      </td>
                      <td className="py-2.5 text-zinc-400 font-mono text-[11px]">
                        {p.asaas_wallet_id ? (
                          <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            {p.asaas_wallet_id}
                          </span>
                        ) : (
                          <span className="text-zinc-600">Não sincronizado</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {status === 'ativo' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={10} /> Ativo no Asaas
                          </span>
                        ) : status === 'pendente' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock size={10} /> Dados Pendentes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-white/5">
                            <AlertCircle size={10} /> Sem Cadastro
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {!temWallet ? (
                          <button 
                            type="button"
                            onClick={() => handleAbrirModalSubconta(p)}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors cursor-pointer shadow-sm"
                          >
                            Gerar Subconta
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => handleAbrirModalSubconta(p)}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer border border-white/5"
                          >
                            Editar Subconta
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CRIAR / EDITAR SUBCONTA NO ASAAS */}
      {modalSubcontaOpen && selectedProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-white/10 p-5 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Subconta Asaas: {selectedProf.nome}</h3>
                  <p className="text-[10px] text-zinc-400">Rateio direto na carteira do profissional</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalSubcontaOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleConfirmarSubconta} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={subNome}
                  onChange={(e) => setSubNome(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    CPF ou CNPJ (Obrigatório)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={subCpf}
                    onChange={(e) => setSubCpf(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={subComissao}
                    onChange={(e) => setSubComissao(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Email para Subconta
                  </label>
                  <input
                    type="email"
                    required
                    value={subEmail}
                    onChange={(e) => setSubEmail(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Telefone / Celular
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={subTelefone}
                    onChange={(e) => setSubTelefone(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Chave PIX (Para saques do barbeiro)
                </label>
                <input
                  type="text"
                  placeholder="CPF, Telefone, Email ou Chave Aleatória"
                  value={subPix}
                  onChange={(e) => setSubPix(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {subcontaFeedback && (
                <div className={`p-2.5 rounded-lg text-[11px] flex items-center gap-2 ${
                  subcontaFeedback.tipo === 'ok' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {subcontaFeedback.tipo === 'ok' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>{subcontaFeedback.msg}</span>
                </div>
              )}

              <div className="pt-2 border-t border-white/5 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setModalSubcontaOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={gerandoSubconta}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-[0_0_12px_rgba(99,102,241,0.25)] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {gerandoSubconta ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  <span>{gerandoSubconta ? 'Sincronizando com Asaas...' : 'Ativar Subconta no Asaas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO BARBEIRO RÁPIDO */}
      {modalNovoBarbeiroOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-zinc-950 border border-white/10 p-5 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <UserPlus size={15} className="text-indigo-400" /> Cadastrar Barbeiro Parceiro
              </h3>
              <button
                type="button"
                onClick={() => setModalNovoBarbeiroOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCriarNovoBarbeiro} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Nome do Profissional
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Barbeiro"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={novoCpf}
                    onChange={(e) => setNovoCpf(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={novaComissao}
                    onChange={(e) => setNovaComissao(Number(e.target.value))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoBarbeiroOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNovo}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {salvandoNovo ? 'Salvando...' : 'Cadastrar Barbeiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SOLICITAR / VINCULAR MAQUININHA SMART POS */}
      {modalMaquininhaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-white/10 p-5 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Maquininha Smart POS Homologada</h3>
                  <p className="text-[10px] text-zinc-400">Split automático e comprovante impresso na hora</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMaquininhaOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleConfirmarSolicitacaoMaquininha} className="flex flex-col gap-4 text-xs">
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                A maquininha Smart POS já vem configurada de fábrica com o rateio em tempo real da Naville e do Asaas. Cada transação divide o valor do serviço automaticamente entre a barbearia, os barbeiros e a plataforma, imprimindo as comissões no comprovante térmico.
              </p>

              {/* Escolha do Modelo */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Selecione o Modelo Homologado:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    onClick={() => setModeloEscolhidoModal('Smart Asaas')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      modeloEscolhidoModal === 'Smart Asaas'
                        ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                        : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Smart Asaas POS</span>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">Oficial</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Android 10, tela touch 5.5", impressora 58mm, 4G Grátis + Wi-Fi.
                    </p>
                  </div>

                  <div
                    onClick={() => setModeloEscolhidoModal('Moderninha Smart / PagBank')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      modeloEscolhidoModal === 'Moderninha Smart / PagBank'
                        ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                        : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Moderninha Smart</span>
                      <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded font-bold">Multi-rede</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Compatibilidade multi-adquirente, NFC e bateria de 12 horas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefícios */}
              <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex flex-col gap-1.5 text-[10px] text-zinc-400">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <span>Sem cobrança de aluguel fixo com volume de faturamento</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <span>Subcontas dos barbeiros sincronizadas instantaneamente</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <span>Bobinas térmicas e chip 4G ilimitado inclusos</span>
                </div>
              </div>

              {solicitacaoSucesso && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center gap-2">
                  <CheckCircle2 size={13} />
                  <span>Solicitação confirmada! O modelo foi vinculado à barbearia.</span>
                </div>
              )}

              <div className="pt-2 border-t border-white/5 flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setModalMaquininhaOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoSolicitacao}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {enviandoSolicitacao ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{enviandoSolicitacao ? 'Vinculando...' : `Confirmar Solicitação (${modeloEscolhidoModal})`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PAREAR NOVO TERMINAL (TEF WEB / PWA) */}
      {modalNovoTerminalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Radio size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Parear Novo Terminal de Balcão</h3>
                  <p className="text-[10px] text-zinc-400">Conecte o PC da recepção ou a maquininha Android</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoTerminalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCriarTerminal} className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Identificador do Terminal / Local
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Balcão Principal, Cadeira 02, Totem Recepção"
                  value={novoTerminalIdentificador}
                  onChange={(e) => setNovoTerminalIdentificador(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Tipo de Integração
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovoTerminalTipo('tef_smartlink')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      novoTerminalTipo === 'tef_smartlink'
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-sm'
                        : 'bg-white/[0.02] border-white/5 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-300">
                      <Monitor size={14} />
                      <span>TEF Smart Link</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 mt-1">
                      Disparo remoto do PC para a máquina
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNovoTerminalTipo('pwa_maquininha')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      novoTerminalTipo === 'pwa_maquininha'
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-white shadow-sm'
                        : 'bg-white/[0.02] border-white/5 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-300">
                      <CreditCard size={14} />
                      <span>PWA Maquininha</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 mt-1">
                      Navegador Android direto na máquina
                    </p>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2 text-[10px] text-zinc-400">
                <Info size={14} className="text-emerald-400 shrink-0" />
                <span>
                  Um código numérico de 6 dígitos será gerado automaticamente para sincronizar a maquininha em tempo real.
                </span>
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoTerminalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoTerminal || !novoTerminalIdentificador.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {salvandoTerminal ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{salvandoTerminal ? 'Criando...' : 'Confirmar Pareamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: INSTRUÇÕES MODO PWA / QR CODE NA MAQUININHA */}
      {modalPwaOpen && terminalSelecionadoPwa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <QrCode size={24} />
            </div>

            <div>
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                Pareamento PWA Autônomo
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                {terminalSelecionadoPwa.identificador}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Abra a URL abaixo no navegador Android da maquininha ou escaneie o código.
              </p>
            </div>

            {/* Código de 6 Dígitos em Destaque */}
            <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/30 w-full flex flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Código de Conexão</span>
              <div className="text-3xl font-black font-mono tracking-[0.3em] text-emerald-400">
                {terminalSelecionadoPwa.codigo_pareamento}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(terminalSelecionadoPwa.codigo_pareamento);
                  setTerminalFeedback(`Código ${terminalSelecionadoPwa.codigo_pareamento} copiado!`);
                  setTimeout(() => setTerminalFeedback(''), 2500);
                }}
                className="mt-1 text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Copy size={11} />
                <span>Copiar Código</span>
              </button>
            </div>

            {/* Link Direto */}
            <div className="w-full text-left bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-[10px] text-zinc-400 flex items-center justify-between">
              <span className="font-mono truncate mr-2">
                {window.location.origin}/terminal?codigo={terminalSelecionadoPwa.codigo_pareamento}
              </span>
              <a
                href={`/terminal?codigo=${terminalSelecionadoPwa.codigo_pareamento}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 shrink-0 font-bold flex items-center gap-1"
              >
                <span>Abrir</span>
                <ExternalLink size={10} />
              </a>
            </div>

            <button
              type="button"
              onClick={() => {
                setModalPwaOpen(false);
                setTerminalSelecionadoPwa(null);
              }}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

