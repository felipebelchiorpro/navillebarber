import React, { useEffect, useState } from 'react';
import {
  Store,
  Settings,
  Power,
  FileText,
  Crown,
  Search,
  ExternalLink,
  ShieldCheck,
  Users,
  Wallet,
  MessageSquare,
  Bot,
  Sparkles,
  Sliders,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  UserPlus,
  QrCode,
  Receipt,
  Copy,
  X,
  RefreshCw,
  Calendar,
  Edit3,
  Save,
  Clock,
  Calculator,
  GitFork,
  Radio,
  Gift,
  Zap,
  Monitor,
  SmartphoneNfc,
  RotateCcw
} from 'lucide-react';
import SplitPaymentView from './SplitPaymentView';
import { pb } from '../lib/pocketbase';
import type { CobrancaAsaas, AsaasBillingType } from '../lib/asaas';

export default function SuperAdminLojasView() {
  const [barbearias, setBarbearias] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [busca, setBusca] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  // Toast Flutuante de Feedback Visual Amigável
  const [toast, setToast] = useState<{
    id: string;
    tipo: 'sucesso' | 'erro' | 'aviso' | 'info';
    titulo?: string;
    mensagem: string;
  } | null>(null);

  const dispararToast = (tipo: 'sucesso' | 'erro' | 'aviso' | 'info', mensagem: string, titulo?: string) => {
    setToast({
      id: Math.random().toString(),
      tipo,
      titulo,
      mensagem,
    });
    setTimeout(() => {
      setToast((prev) => (prev?.mensagem === mensagem ? null : prev));
    }, 4500);
  };

  // Estados para Emissão de Cobrança / Assinatura Asaas
  const [isCobrancaModalOpen, setIsCobrancaModalOpen] = useState(false);
  const [modalidadeCobranca, setModalidadeCobranca] = useState<'avulsa' | 'recorrente'>('avulsa');
  const [metodoCobranca, setMetodoCobranca] = useState<AsaasBillingType>('UNDEFINED');
  const [valorCobranca, setValorCobranca] = useState<number>(99.9);
  const [vencimentoCobranca, setVencimentoCobranca] = useState<string>('');
  const [descricaoCobranca, setDescricaoCobranca] = useState<string>('');
  const [loadingCobranca, setLoadingCobranca] = useState(false);
  const [cobrancaGerada, setCobrancaGerada] = useState<CobrancaAsaas | null>(null);

  // Estados para Histórico de Cobranças do Asaas
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [historicoCobrancas, setHistoricoCobrancas] = useState<CobrancaAsaas[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [syncingFaturasPB, setSyncingFaturasPB] = useState(false);

  // Estados de Pró-Rata e Melhor Data de Vencimento
  const [diaVencimentoEscolhido, setDiaVencimentoEscolhido] = useState<number>(10);
  const [usarProRata, setUsarProRata] = useState<boolean>(false);
  const [diasProRata, setDiasProRata] = useState<number>(0);
  const [valorIntegralMes, setValorIntegralMes] = useState<number>(99.9);

  // Estados para Edição de Comprador no Asaas
  const [isEditCompradorOpen, setIsEditCompradorOpen] = useState(false);
  const [nomeCompradorInput, setNomeCompradorInput] = useState('');
  const [emailCompradorInput, setEmailCompradorInput] = useState('');
  const [docCompradorInput, setDocCompradorInput] = useState('');
  const [savingComprador, setSavingComprador] = useState(false);

  // Estados para Edição Completa da Barbearia (Tenant)
  const [isEditBarbeariaOpen, setIsEditBarbeariaOpen] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editPlano, setEditPlano] = useState('pro');
  const [editProprietario, setEditProprietario] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDocumento, setEditDocumento] = useState('');
  const [editCep, setEditCep] = useState('');
  const [editEndereco, setEditEndereco] = useState('');
  const [editNumero, setEditNumero] = useState('');
  const [editBairro, setEditBairro] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [savingBarbearia, setSavingBarbearia] = useState(false);

  // Estados para Edição de Vencimento de Cobrança Pendente
  const [editandoCobrancaId, setEditandoCobrancaId] = useState<string | null>(null);
  const [novoVencimentoInput, setNovoVencimentoInput] = useState('');
  const [savingVencimento, setSavingVencimento] = useState(false);

  // Estados locais editáveis de valores dos módulos
  const [valorCadeira, setValorCadeira] = useState<number>(25);
  const [valorClubeVip, setValorClubeVip] = useState<number>(49.9);
  const [valorFinanceiro, setValorFinanceiro] = useState<number>(29.9);
  const [valorWhatsApp, setValorWhatsApp] = useState<number>(39.9);
  const [valorAssessor, setValorAssessor] = useState<number>(59.9);
  const [valorSplitMensal, setValorSplitMensal] = useState<number>(30.0);
  const [valorSplitTaxa, setValorSplitTaxa] = useState<number>(0.35);

  const handleResetarAsaas = async () => {
    if (!selectedTenant) return;
    if (!window.confirm(`Deseja resetar o ID Asaas deste cliente (${selectedTenant.asaas_id})? O vínculo atual será desfeito para que você possa criar um cliente novo diretamente na base REAL de Produção.`)) {
      return;
    }

    try {
      setSyncing(true);
      const patch = {
        asaas_id: null,
        asaas_customer_id: null,
      };
      const updated = await pb.collection('barbearias').update(selectedTenant.id, patch);
      const tenantAtualizado = { ...selectedTenant, ...updated, asaas_id: null };
      setSelectedTenant(tenantAtualizado);
      setBarbearias((prev) => prev.map((b) => (b.id === tenantAtualizado.id ? tenantAtualizado : b)));
      setSaveFeedback('ID Asaas resetado com sucesso! Agora clique em "Sincronizar Cliente no Asaas" para criar na base de Produção.');
      setTimeout(() => setSaveFeedback(''), 4500);
    } catch (error: any) {
      console.error('Erro ao resetar Asaas:', error);
      dispararToast('erro', 'Falha ao resetar vínculo do Asaas.', 'Erro');
    } finally {
      setSyncing(false);
    }
  };

  // Estados dos Terminais de Pagamento da Loja Selecionada
  const [terminaisTenant, setTerminaisTenant] = useState<any[]>([]);
  const [loadingTerminaisTenant, setLoadingTerminaisTenant] = useState(false);

  const carregarTerminaisTenant = async (tenantId: string) => {
    if (!tenantId) return;
    try {
      setLoadingTerminaisTenant(true);
      const list = await pb.collection('terminais_pagamento').getFullList({
        filter: `barbearia = "${tenantId}"`,
        sort: '-created',
      });
      setTerminaisTenant(list);
    } catch (err) {
      console.error('Erro ao buscar terminais no superadmin:', err);
    } finally {
      setLoadingTerminaisTenant(false);
    }
  };

  useEffect(() => {
    async function fetchTenants() {
      try {
        const records = await pb.collection('barbearias').getFullList({ sort: '-created' });
        setBarbearias(records);
        if (records.length > 0) {
          const savedId = sessionStorage.getItem('naville_selected_tenant_id');
          const target = (savedId && records.find((b) => b.id === savedId)) || records[0];
          setSelectedTenant(target);
          syncLocalValues(target);
          carregarTerminaisTenant(target.id);
        }
      } catch (error) {
        console.error('Erro ao buscar barbearias:', error);
      }
    }
    fetchTenants();
  }, []);

  const syncLocalValues = (tenant: any) => {
    if (!tenant) return;
    setValorCadeira(tenant.valor_adicional_barbeiro ?? 25);
    setValorClubeVip(tenant.valor_modulo_clube_vip ?? 49.9);
    setValorFinanceiro(tenant.valor_modulo_financeiro ?? 29.9);
    setValorWhatsApp(tenant.valor_modulo_whatsapp ?? 39.9);
    setValorAssessor(tenant.valor_modulo_assessor ?? 59.9);
    setValorSplitMensal(tenant.split_mensalidade_modulo ?? tenant.valor_modulo_split ?? 30.0);
    setValorSplitTaxa(tenant.split_taxa_transacao ?? 0.35);
  };

  const handleSelectTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    if (tenant?.id) {
      sessionStorage.setItem('naville_selected_tenant_id', tenant.id);
    }
    syncLocalValues(tenant);
    carregarTerminaisTenant(tenant.id);
  };

  const handleUpdateTenantField = async (field: string, value: any) => {
    if (!selectedTenant) return;
    try {
      setSaving(true);
      const patch = { [field]: value };
      const updated = await pb.collection('barbearias').update(selectedTenant.id, patch);
      setSelectedTenant(updated);
      setBarbearias(prev => prev.map(b => (b.id === updated.id ? updated : b)));
      setSaveFeedback('Salvo com sucesso!');
      setTimeout(() => setSaveFeedback(''), 2500);
    } catch (err) {
      console.error(`Erro ao atualizar ${field}:`, err);
      dispararToast('erro', 'Erro ao salvar alteração no PocketBase.', 'PocketBase');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMultiple = async (patch: Record<string, any>) => {
    if (!selectedTenant) return;
    try {
      setSaving(true);
      const updated = await pb.collection('barbearias').update(selectedTenant.id, patch);
      setSelectedTenant(updated);
      setBarbearias(prev => prev.map(b => (b.id === updated.id ? updated : b)));
      setSaveFeedback('Módulos e valores atualizados!');
      setTimeout(() => setSaveFeedback(''), 2500);
    } catch (err) {
      console.error('Erro ao salvar múltiplos campos:', err);
      dispararToast('erro', 'Erro ao salvar alterações no PocketBase.', 'PocketBase');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedTenant) return;
    const isAtiva = selectedTenant.status === 'ativa' || selectedTenant.status === 'ativo';
    const novoStatus = isAtiva ? 'bloqueada' : 'ativa';
    await handleUpdateTenantField('status', novoStatus);
  };

  const handleAjustarCadeiras = async (delta: number) => {
    if (!selectedTenant) return;
    const atual = Number(selectedTenant.max_barbeiros) || Number(selectedTenant.limite_profissionais) || 1;
    const novo = Math.max(1, atual + delta);
    await handleUpdateMultiple({
      max_barbeiros: novo,
      limite_profissionais: novo,
    });
  };

  const handleSalvarValores = async () => {
    await handleUpdateMultiple({
      valor_adicional_barbeiro: Number(valorCadeira) || 0,
      valor_modulo_clube_vip: Number(valorClubeVip) || 0,
      valor_modulo_financeiro: Number(valorFinanceiro) || 0,
      valor_modulo_whatsapp: Number(valorWhatsApp) || 0,
      valor_modulo_assessor: Number(valorAssessor) || 0,
      split_mensalidade_modulo: Number(valorSplitMensal) || 0,
      valor_modulo_split: Number(valorSplitMensal) || 0,
      split_taxa_transacao: Number(valorSplitTaxa) || 0.35,
    });
  };

  const handleSyncAsaas = async () => {
    // 1. Validação estrita do ID do Tenant / Barbearia
    if (!selectedTenant || !selectedTenant.id || typeof selectedTenant.id !== 'string' || !selectedTenant.id.trim()) {
      dispararToast('aviso', 'Cadastre e salve os dados da barbearia antes de sincronizar com o Asaas.', 'Atenção');
      return;
    }

    setSyncing(true);
    try {
      // 2. Chamada HTTP interna para a rota do backend seguro
      const response = await fetch('/api/asaas/sync-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tenantId: selectedTenant.id })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || `Erro ao sincronizar com Asaas (${response.status})`);
      }

      const walletId = data.walletId || data.asaas_wallet_id || data.asaas_id || data.id;
      const asaasId = data.asaas_id || data.asaas_customer_id || walletId;

      // 3. Atualiza os estados locais imediatamente
      const tenantAtualizado = {
        ...selectedTenant,
        asaas_id: asaasId,
        asaas_wallet_id: walletId || selectedTenant.asaas_wallet_id,
      };
      setSelectedTenant(tenantAtualizado);
      setBarbearias((prev) => prev.map((b) => (b.id === tenantAtualizado.id ? tenantAtualizado : b)));

      // 4. Toast de confirmação e sucesso
      dispararToast('sucesso', `Barbearia sincronizada com sucesso no Asaas! ID: ${walletId || asaasId}`, 'Sucesso');
    } catch (error: any) {
      console.error('[SYNC TENANT ERROR]', { erro: error, tenant: selectedTenant });
      const msgErro = error?.message || 'Falha ao sincronizar cliente no Asaas.';
      let tituloErro = 'Erro ao Sincronizar com Asaas';
      if (msgErro.toLowerCase().includes('pocketbase') || msgErro.toLowerCase().includes('não localizada')) {
        tituloErro = 'Erro no PocketBase';
      } else if (msgErro.toLowerCase().includes('cpf') || msgErro.toLowerCase().includes('cnpj') || msgErro.toLowerCase().includes('asaas')) {
        tituloErro = 'Erro no Asaas';
      }
      dispararToast('erro', msgErro, tituloErro);
    } finally {
      setSyncing(false);
    }
  };

  const formatarDataBR = (dataStr?: string) => {
    if (!dataStr) return '-';
    const partes = dataStr.substring(0, 10).split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataStr;
  };

  const formatarFormaPagamento = (type?: string) => {
    switch (type) {
      case 'PIX':
        return 'PIX Instantâneo';
      case 'BOLETO':
        return 'Boleto (com QR Code)';
      case 'CREDIT_CARD':
        return 'Cartão de Crédito';
      case 'UNDEFINED':
        return 'Fatura (PIX, Boleto, Cartão)';
      default:
        return type || 'Fatura';
    }
  };

  const handleAbrirEditarComprador = () => {
    if (!selectedTenant) return;
    setNomeCompradorInput(selectedTenant.proprietario || selectedTenant.nome_proprietario || selectedTenant.nome || '');
    setEmailCompradorInput(selectedTenant.email || '');
    setDocCompradorInput(selectedTenant.documento || '');
    setIsEditCompradorOpen(true);
  };

  const handleSalvarComprador = async () => {
    if (!selectedTenant) return;
    setSavingComprador(true);
    try {
      const updated = await pb.collection('barbearias').update(selectedTenant.id, {
        proprietario: nomeCompradorInput,
        nome_proprietario: nomeCompradorInput,
        email: emailCompradorInput,
        documento: docCompradorInput,
      });

      if (selectedTenant.asaas_id) {
        await fetch('/api/asaas/sync-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: selectedTenant.id }),
        }).catch((err) => console.warn('Aviso ao sincronizar alteração no Asaas:', err));
      }

      const tenantAtualizado = { ...selectedTenant, ...updated };
      setSelectedTenant(tenantAtualizado);
      setBarbearias((prev) => prev.map((b) => (b.id === tenantAtualizado.id ? tenantAtualizado : b)));
      setSaveFeedback('Dados do comprador atualizados no Asaas e no sistema!');
      setTimeout(() => setSaveFeedback(''), 3000);
      setIsEditCompradorOpen(false);
    } catch (err: any) {
      console.error('Erro ao atualizar comprador:', err);
      dispararToast('erro', err.message || 'Falha ao atualizar dados do comprador.', 'Erro no Asaas');
    } finally {
      setSavingComprador(false);
    }
  };

  const handleAbrirEditarBarbearia = (tenant?: any) => {
    const target = tenant || selectedTenant;
    if (!target) return;
    setEditNome(target.nome || '');
    setEditSlug(target.slug || '');
    setEditPlano(target.plano_saas || target.plano || 'pro');
    setEditProprietario(target.nome_proprietario || target.proprietario || '');
    setEditTelefone(target.telefone_proprietario || target.telefone || target.whatsapp || '');
    setEditEmail(target.email_dono || target.email || '');
    setEditDocumento(target.documento || target.cpf_cnpj || target.cnpj || '');
    setEditCep(target.cep || '');
    setEditEndereco(target.endereco || '');
    setEditNumero(target.numero || '');
    setEditBairro(target.bairro || '');
    setEditCidade(target.cidade || '');
    setEditEstado(target.estado || '');
    setIsEditBarbeariaOpen(true);
  };

  const handleSalvarBarbearia = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTenant) return;
    if (!editNome.trim()) {
      dispararToast('aviso', 'O nome da barbearia é obrigatório.', 'Atenção');
      return;
    }
    const cleanSlug = editSlug
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug) {
      dispararToast('aviso', 'O slug da barbearia é obrigatório.', 'Atenção');
      return;
    }

    setSavingBarbearia(true);
    try {
      const patch = {
        nome: editNome.trim(),
        slug: cleanSlug,
        plano: editPlano.toLowerCase(),
        plano_saas: editPlano.toLowerCase(),
        proprietario: editProprietario.trim(),
        nome_proprietario: editProprietario.trim() || editNome.trim(),
        telefone: editTelefone.trim(),
        telefone_proprietario: editTelefone.trim(),
        whatsapp: editTelefone.trim(),
        email: editEmail.trim(),
        email_dono: editEmail.trim(),
        documento: editDocumento.trim(),
        cpf_cnpj: editDocumento.trim(),
        cep: editCep.trim(),
        endereco: editEndereco.trim(),
        numero: editNumero.trim(),
        bairro: editBairro.trim(),
        cidade: editCidade.trim(),
        estado: editEstado.trim().toUpperCase(),
      };

      const updated = await pb.collection('barbearias').update(selectedTenant.id, patch);
      const tenantAtualizado = { ...selectedTenant, ...updated };
      setSelectedTenant(tenantAtualizado);
      setBarbearias((prev) => prev.map((b) => (b.id === tenantAtualizado.id ? tenantAtualizado : b)));

      // Sincroniza com Asaas caso já tenha vínculo
      if (selectedTenant.asaas_id) {
        fetch('/api/asaas/sync-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: selectedTenant.id }),
        }).catch((err) => console.warn('Aviso ao sincronizar no Asaas:', err));
      }

      dispararToast('sucesso', 'Dados da barbearia atualizados com sucesso!', 'Salvo com Sucesso');
      setSaveFeedback('Dados da barbearia atualizados!');
      setTimeout(() => setSaveFeedback(''), 3000);
      setIsEditBarbeariaOpen(false);
    } catch (err: any) {
      console.error('Erro ao atualizar barbearia:', err);
      const msg = err?.data?.message || err?.message || 'Falha ao salvar dados da barbearia.';
      dispararToast('erro', msg, 'Erro no PocketBase');
      alert(`Erro ao salvar barbearia: ${msg}`);
    } finally {
      setSavingBarbearia(false);
    }
  };

  const calcularValorMensalidade = (tenant: any) => {
    if (!tenant) return 97.0;
    const cadeirasExtras = Math.max(0, (tenant.max_barbeiros || 1) - 1);
    const custoCadeiras = cadeirasExtras * (tenant.valor_adicional_barbeiro ?? valorCadeira);
    const custoClube = tenant.vip_club_ativo ? (tenant.valor_modulo_clube_vip ?? valorClubeVip) : 0;
    const custoFin = tenant.modulo_financeiro ? (tenant.valor_modulo_financeiro ?? valorFinanceiro) : 0;
    const custoWpp = tenant.modulo_whatsapp ? (tenant.valor_modulo_whatsapp ?? valorWhatsApp) : 0;
    const custoAss = tenant.modulo_assessor ? (tenant.valor_modulo_assessor ?? valorAssessor) : 0;
    const custoSplit = (tenant.split_ativo || tenant.modulo_split_asaas)
      ? Number(tenant.split_mensalidade_modulo ?? tenant.valor_modulo_split ?? valorSplitMensal ?? 0)
      : 0;
    return Number((97.0 + custoCadeiras + custoClube + custoFin + custoWpp + custoAss + custoSplit).toFixed(2));
  };

  const calcularProRataParaDia = (diaEscolhido: number, valorMensal: number) => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    let dataAlvo = new Date(anoAtual, mesAtual, diaEscolhido);
    if (dataAlvo <= hoje) {
      dataAlvo = new Date(anoAtual, mesAtual + 1, diaEscolhido);
    }

    const diffTime = dataAlvo.getTime() - hoje.getTime();
    const diffDias = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const valorDiario = valorMensal / 30;
    const valorCalculado = diffDias >= 28 ? valorMensal : Number((valorDiario * diffDias).toFixed(2));

    return {
      dias: diffDias,
      dataVencimentoStr: dataAlvo.toISOString().split('T')[0],
      valorProRata: valorCalculado,
      valorDiario: Number(valorDiario.toFixed(2)),
    };
  };

  const handleSelecionarDiaVencimento = (dia: number) => {
    setDiaVencimentoEscolhido(dia);
    const calc = calcularProRataParaDia(dia, valorIntegralMes);
    setDiasProRata(calc.dias);
    setVencimentoCobranca(calc.dataVencimentoStr);
    if (usarProRata) {
      setValorCobranca(calc.valorProRata);
      setDescricaoCobranca(`1ª Mensalidade Pró-Rata (${calc.dias} dias até dia ${dia}) - ${selectedTenant?.nome}`);
    }
  };

  const handleToggleProRata = (ativar: boolean) => {
    setUsarProRata(ativar);
    const calc = calcularProRataParaDia(diaVencimentoEscolhido, valorIntegralMes);
    setDiasProRata(calc.dias);
    if (ativar) {
      setValorCobranca(calc.valorProRata);
      setDescricaoCobranca(`1ª Mensalidade Pró-Rata (${calc.dias} dias até dia ${diaVencimentoEscolhido}) - ${selectedTenant?.nome}`);
    } else {
      setValorCobranca(valorIntegralMes);
      setDescricaoCobranca(`Mensalidade SaaS Naville Barber - ${selectedTenant?.nome}`);
    }
  };

  const handleAbrirModalCobranca = () => {
    if (!selectedTenant) return;
    const mensalidade = calcularValorMensalidade(selectedTenant);
    setValorIntegralMes(mensalidade);

    const diaPadrao = 10;
    setDiaVencimentoEscolhido(diaPadrao);
    const calc = calcularProRataParaDia(diaPadrao, mensalidade);
    setDiasProRata(calc.dias);
    setVencimentoCobranca(calc.dataVencimentoStr);
    setValorCobranca(mensalidade);
    setUsarProRata(false);
    setDescricaoCobranca(`Mensalidade SaaS Naville Barber - ${selectedTenant.nome}`);
    setModalidadeCobranca('avulsa');
    setMetodoCobranca('UNDEFINED');
    setCobrancaGerada(null);
    setIsCobrancaModalOpen(true);
  };

  const handleSalvarNovoVencimento = async (cobId: string) => {
    if (!novoVencimentoInput) return;
    setSavingVencimento(true);
    try {
      const response = await fetch(`/api/asaas/payments/${encodeURIComponent(cobId)}/due-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: novoVencimentoInput }),
      });
      const updated = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(updated.error || updated.message || 'Erro ao alterar vencimento no Asaas');
      }

      setHistoricoCobrancas((prev) =>
        prev.map((c) => (c.id === cobId ? { ...c, dueDate: updated.dueDate || novoVencimentoInput } : c))
      );

      const faturasPB = await pb.collection('faturas').getFullList({
        filter: `barbearia_id = '${selectedTenant.id}' && (link_pagamento ~ '${cobId}' || id = '${cobId}')`,
      });
      if (faturasPB.length > 0) {
        await pb.collection('faturas').update(faturasPB[0].id, {
          data_vencimento: updated.dueDate || novoVencimentoInput,
        });
      }

      setEditandoCobrancaId(null);
      setSaveFeedback('Data de vencimento do boleto atualizada com sucesso no Asaas!');
      setTimeout(() => setSaveFeedback(''), 3000);
    } catch (err: any) {
      console.error('Erro ao atualizar vencimento:', err);
      dispararToast('erro', err.message || 'Falha ao alterar vencimento no Asaas.', 'Erro no Asaas');
    } finally {
      setSavingVencimento(false);
    }
  };

  const handleCriarCobrancaAsaasSubmit = async () => {
    if (!selectedTenant?.asaas_id) {
      dispararToast('aviso', 'Esta barbearia ainda não tem ID Asaas. Sincronize o cliente primeiro.', 'Atenção');
      return;
    }
    if (!valorCobranca || valorCobranca <= 0) {
      dispararToast('aviso', 'Informe um valor válido para a cobrança.', 'Atenção');
      return;
    }
    if (!vencimentoCobranca) {
      dispararToast('aviso', 'Informe uma data de vencimento válida.', 'Atenção');
      return;
    }

    setLoadingCobranca(true);
    try {
      let linkPagamento = '';
      const statusFatura = 'pendente';

      if (modalidadeCobranca === 'recorrente') {
        const subRes = await fetch('/api/asaas/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: selectedTenant.asaas_id,
            value: valorCobranca,
            nextDueDate: vencimentoCobranca,
            billingType: metodoCobranca,
            description: descricaoCobranca,
            cycle: 'MONTHLY'
          })
        });
        const subData = await subRes.json().catch(() => ({}));
        if (!subRes.ok) {
          throw new Error(subData.error || subData.message || 'Erro ao emitir assinatura recorrente no Asaas');
        }

        const paymentsRes = await fetch(`/api/asaas/customers/${encodeURIComponent(selectedTenant.asaas_id)}/payments`);
        const payments = await paymentsRes.json().catch(() => []);
        if (Array.isArray(payments) && payments.length > 0) {
          linkPagamento = payments[0].invoiceUrl || payments[0].bankSlipUrl || '';
          setCobrancaGerada(payments[0]);
        }
      } else {
        const cobRes = await fetch('/api/asaas/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer: selectedTenant.asaas_id,
            value: valorCobranca,
            dueDate: vencimentoCobranca,
            billingType: metodoCobranca,
            description: descricaoCobranca
          })
        });
        const cobranca = await cobRes.json().catch(() => ({}));
        if (!cobRes.ok) {
          throw new Error(cobranca.error || cobranca.message || 'Erro ao emitir cobrança no Asaas');
        }
        linkPagamento = cobranca.invoiceUrl || cobranca.bankSlipUrl || '';
        setCobrancaGerada(cobranca);
      }

      // Salva o registro na coleção 'faturas' do PocketBase para que a barbearia veja no seu painel
      const metodoPB = metodoCobranca === 'BOLETO' ? 'boleto' : metodoCobranca === 'CREDIT_CARD' ? 'cartao' : 'pix';
      await pb.collection('faturas').create({
        barbearia_id: selectedTenant.id,
        valor: Number(valorCobranca),
        data_vencimento: vencimentoCobranca,
        descricao: descricaoCobranca,
        status: statusFatura,
        metodo_pagamento: metodoPB,
        link_pagamento: linkPagamento,
        comprovante: '',
      }).catch((err) => {
        console.warn('Aviso ao sincronizar fatura local no PocketBase:', err);
      });

      setSaveFeedback('Cobrança emitida e vinculada ao painel da barbearia!');
      setTimeout(() => setSaveFeedback(''), 4000);
      dispararToast('sucesso', 'Cobrança emitida e vinculada ao painel da barbearia!', 'Cobrança Criada');
    } catch (err: any) {
      console.error('Erro ao emitir cobrança:', err);
      dispararToast('erro', err.message || 'Falha ao emitir cobrança no Asaas.', 'Erro no Asaas');
    } finally {
      setLoadingCobranca(false);
    }
  };

  const handleAbrirHistoricoAsaas = async () => {
    if (!selectedTenant?.asaas_id) {
      dispararToast('aviso', 'Esta barbearia ainda não possui ID no Asaas.', 'Atenção');
      return;
    }
    setIsHistoricoModalOpen(true);
    setLoadingHistorico(true);
    try {
      const res = await fetch(`/api/asaas/customers/${encodeURIComponent(selectedTenant.asaas_id)}/payments`);
      const lista = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(lista.error || lista.message || 'Não foi possível carregar o histórico do Asaas.');
      }
      setHistoricoCobrancas(Array.isArray(lista) ? lista : []);
      setHistoricoCobrancas(lista);
    } catch (err: any) {
      console.error('Erro ao listar histórico do Asaas:', err);
      dispararToast('erro', err.message || 'Não foi possível carregar o histórico do Asaas.', 'Erro no Asaas');
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleSincronizarFaturasComPocketBase = async () => {
    if (!selectedTenant?.id || historicoCobrancas.length === 0) return;
    setSyncingFaturasPB(true);
    try {
      const faturasExistentes = await pb.collection('faturas').getFullList({
        filter: `barbearia_id = '${selectedTenant.id}'`,
      });

      let novos = 0;
      for (const cob of historicoCobrancas) {
        const link = cob.invoiceUrl || cob.bankSlipUrl || '';
        const jaExiste = faturasExistentes.some(f => f.link_pagamento === link || f.id === cob.id);
        const isPago = cob.status === 'RECEIVED' || cob.status === 'CONFIRMED' || cob.status === 'RECEIVED_IN_CASH';
        const isAtrasado = cob.status === 'OVERDUE';
        const st = isPago ? 'pago' : isAtrasado ? 'atrasado' : 'pendente';
        const met = cob.billingType === 'BOLETO' ? 'boleto' : cob.billingType === 'CREDIT_CARD' ? 'cartao' : 'pix';

        if (!jaExiste) {
          await pb.collection('faturas').create({
            barbearia_id: selectedTenant.id,
            valor: Number(cob.value),
            data_vencimento: cob.dueDate,
            descricao: cob.description || 'Cobrança Asaas',
            status: st,
            metodo_pagamento: met,
            link_pagamento: link,
            comprovante: isPago ? link : '',
            data_pagamento: cob.paymentDate || (isPago ? new Date().toISOString() : undefined)
          });
          novos++;
        }
      }

      setSaveFeedback(`Sincronização concluída! ${novos} nova(s) fatura(s) adicionada(s) ao painel da barbearia.`);
      setTimeout(() => setSaveFeedback(''), 4000);
      dispararToast('sucesso', `${novos} nova(s) fatura(s) sincronizada(s) no PocketBase!`, 'Faturas Sincronizadas');
    } catch (err: any) {
      console.error('Erro ao sincronizar histórico com PocketBase:', err);
      dispararToast('erro', 'Erro ao sincronizar faturas com o banco local.', 'PocketBase');
    } finally {
      setSyncingFaturasPB(false);
    }
  };

  const barbeariasFiltradas = barbearias.filter(b => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (b.nome || '').toLowerCase().includes(q) || (b.slug || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-3 h-full w-full animate-in fade-in duration-500">
      <header className="flex items-center justify-between shrink-0 mb-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Store className="text-emerald-500" size={16} />
          Gestão de Clientes (Tenants)
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
          <input
            type="text"
            placeholder="Buscar barbearia..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-md pl-7 pr-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none w-64 placeholder-zinc-500"
          />
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* LISTA DE BARBEARIAS */}
        <div className="col-span-4 flex flex-col rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
          <div className="overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
            {barbeariasFiltradas.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">Nenhuma barbearia encontrada.</p>
            ) : (
              barbeariasFiltradas.map(b => (
                <div
                  key={b.id}
                  onClick={() => handleSelectTenant(b)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors group ${
                    selectedTenant?.id === b.id
                      ? 'bg-white/[0.05] border-emerald-500/30'
                      : 'border-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-bold text-white truncate">{b.nome || 'Sem Nome'}</p>
                    <p className="text-[9px] text-zinc-500 truncate">/b/{b.slug}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTenant(b);
                        handleAbrirEditarBarbearia(b);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="Editar dados desta barbearia"
                    >
                      <Edit3 size={11} />
                    </button>
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold border ${
                        b.status === 'ativa' || b.status === 'ativo'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {b.status || 'Pendente'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DETALHES, GOVERNANÇA & MÓDULOS */}
        {selectedTenant ? (
          <div className="col-span-8 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
            {/* CABEÇALHO DO TENANT */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{selectedTenant.nome}</h2>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold uppercase">
                    {selectedTenant.plano_saas || selectedTenant.plano || 'Starter'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  ID: <span className="font-mono text-zinc-300">{selectedTenant.id}</span> • Slug: <span className="text-emerald-400">/b/{selectedTenant.slug}</span>
                  {(selectedTenant.proprietario || selectedTenant.nome_proprietario) && ` • Dono: ${selectedTenant.proprietario || selectedTenant.nome_proprietario}`}
                  {(selectedTenant.telefone || selectedTenant.telefone_proprietario) && ` • Tel: ${selectedTenant.telefone || selectedTenant.telefone_proprietario}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAbrirEditarBarbearia()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
                  title="Editar dados da barbearia (Nome, Dono, Slug, Telefone, Endereço, Documento)"
                >
                  <Edit3 size={13} />
                  <span>Editar Barbearia</span>
                </button>

                <a
                  href={`/b/${selectedTenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
                  title="Abrir Vitrine Pública da Barbearia"
                >
                  <span>Vitrine</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  onClick={handleToggleStatus}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white transition-colors cursor-pointer ${
                    selectedTenant.status === 'ativa' || selectedTenant.status === 'ativo'
                      ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30'
                  }`}
                >
                  <Power size={12} />
                  {selectedTenant.status === 'ativa' || selectedTenant.status === 'ativo'
                    ? 'Suspender Conta'
                    : 'Ativar Conta'}
                </button>
              </div>
            </div>

            {/* SEÇÃO: GOVERNANÇA DE RECURSOS & GATEWAYS */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sliders className="text-emerald-500" size={16} />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Governança de Recursos & Gateways
                    </h3>
                    {selectedTenant.e_vitalicio && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                        Parceiro Vitalício
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Ativação independente de recursos por barbearia, isolamento de Gateways e precificação avulsa.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {saveFeedback && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 animate-in fade-in">
                      <Check size={12} /> {saveFeedback}
                    </span>
                  )}
                  <button
                    onClick={handleSalvarValores}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} />
                    <span>{saving ? 'Salvando...' : 'Salvar Valores'}</span>
                  </button>
                </div>
              </div>

              {/* GRID DE MÓDULOS (2 COLUNAS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. ISENÇÃO DE MENSALIDADE (VITALÍCIO) */}
                <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <ShieldCheck className="text-emerald-400" size={15} />
                        <span>Isenção de Mensalidade (Vitalício)</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Isenta de faturas SaaS mensais da Naville.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateTenantField('e_vitalicio', !selectedTenant.e_vitalicio)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                        selectedTenant.e_vitalicio ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block w-5 h-5 rounded-full bg-white transform transition-transform ${
                          selectedTenant.e_vitalicio ? 'translate-x-5.5' : 'translate-x-0.5'
                        } top-0.5 absolute left-0`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
                    <span className="text-zinc-500 uppercase font-semibold">Status Gateway SaaS:</span>
                    <span className={`font-bold ${selectedTenant.e_vitalicio ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedTenant.e_vitalicio ? 'Isento' : 'Cobrança Ativa'}
                    </span>
                  </div>
                </div>

                {/* 2. CADEIRAS PERMITIDAS */}
                <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <Users className="text-emerald-400" size={15} />
                        <span>Cadeiras Permitidas</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Limite de barbeiros ativos cadastráveis.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => handleAjustarCadeiras(-1)}
                        className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="Diminuir cadeira"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-white">
                        {Number(selectedTenant.max_barbeiros) || Number(selectedTenant.limite_profissionais) || 1}
                      </span>
                      <button
                        onClick={() => handleAjustarCadeiras(1)}
                        className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="Aumentar cadeira"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
                    <span className="text-zinc-500 uppercase font-semibold">Valor por Cadeira Extra:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={valorCadeira}
                        onChange={e => setValorCadeira(Number(e.target.value))}
                        onBlur={() => handleUpdateTenantField('valor_adicional_barbeiro', Number(valorCadeira))}
                        className="w-16 bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-right font-bold text-white outline-none focus:border-emerald-500 text-[10px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. CLUBE DE ASSINATURAS (CLUBE VIP) */}
                <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <Crown className="text-amber-400" size={15} />
                        <span>Clube de Assinaturas</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Permite ao dono cobrar assinaturas de clientes.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const novo = !(selectedTenant.vip_club_ativo || selectedTenant.modulo_clube_vip);
                        handleUpdateMultiple({
                          vip_club_ativo: novo,
                          modulo_clube_vip: novo,
                        });
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                        (selectedTenant.vip_club_ativo || selectedTenant.modulo_clube_vip) ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block w-5 h-5 rounded-full bg-white transform transition-transform ${
                          (selectedTenant.vip_club_ativo || selectedTenant.modulo_clube_vip) ? 'translate-x-5.5' : 'translate-x-0.5'
                        } top-0.5 absolute left-0`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
                    <span className="text-zinc-500 uppercase font-semibold">Gateway do Dono:</span>
                    <span className="text-emerald-400 font-bold">100% Direto ao Dono</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-zinc-500 uppercase font-semibold">Mensalidade Módulo:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={valorClubeVip}
                        onChange={e => setValorClubeVip(Number(e.target.value))}
                        onBlur={() => handleUpdateTenantField('valor_modulo_clube_vip', Number(valorClubeVip))}
                        className="w-16 bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-right font-bold text-white outline-none focus:border-emerald-500 text-[10px]"
                      />
                      <span className="text-zinc-500">/mês</span>
                    </div>
                  </div>
                </div>

                {/* 4. FLUXO FINANCEIRO / CAIXA */}
                <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <Wallet className="text-blue-400" size={15} />
                        <span>Fluxo Financeiro / Caixa</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        PDV, Sangrias e Controle de Gastos no painel.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateTenantField('modulo_financeiro', !selectedTenant.modulo_financeiro)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                        selectedTenant.modulo_financeiro ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block w-5 h-5 rounded-full bg-white transform transition-transform ${
                          selectedTenant.modulo_financeiro ? 'translate-x-5.5' : 'translate-x-0.5'
                        } top-0.5 absolute left-0`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
                    <span className="text-zinc-500 uppercase font-semibold">Módulos PDV & Caixa:</span>
                    <span className={`font-bold ${selectedTenant.modulo_financeiro ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {selectedTenant.modulo_financeiro ? 'Habilitado' : 'Desabilitado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-zinc-500 uppercase font-semibold">Mensalidade Módulo:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={valorFinanceiro}
                        onChange={e => setValorFinanceiro(Number(e.target.value))}
                        onBlur={() => handleUpdateTenantField('valor_modulo_financeiro', Number(valorFinanceiro))}
                        className="w-16 bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-right font-bold text-white outline-none focus:border-emerald-500 text-[10px]"
                      />
                      <span className="text-zinc-500">/mês</span>
                    </div>
                  </div>
                </div>

                {/* 5. MOTOR WHATSAPP NATIVO */}
                <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <MessageSquare className="text-emerald-400" size={15} />
                        <span>Motor WhatsApp Nativo</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Evolution API v2, confirmação automática e atraso anti-ban.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateTenantField('modulo_whatsapp', !selectedTenant.modulo_whatsapp)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                        selectedTenant.modulo_whatsapp ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block w-5 h-5 rounded-full bg-white transform transition-transform ${
                          selectedTenant.modulo_whatsapp ? 'translate-x-5.5' : 'translate-x-0.5'
                        } top-0.5 absolute left-0`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
                    <span className="text-zinc-500 uppercase font-semibold">Status do Disparo:</span>
                    <span className={`font-bold ${selectedTenant.modulo_whatsapp ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {selectedTenant.modulo_whatsapp ? 'Ativo (Anti-Ban)' : 'Desativado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-zinc-500 uppercase font-semibold">Mensalidade Módulo:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={valorWhatsApp}
                        onChange={e => setValorWhatsApp(Number(e.target.value))}
                        onBlur={() => handleUpdateTenantField('valor_modulo_whatsapp', Number(valorWhatsApp))}
                        className="w-16 bg-white/[0.04] border border-white/10 rounded px-1.5 py-0.5 text-right font-bold text-white outline-none focus:border-emerald-500 text-[10px]"
                      />
                      <span className="text-zinc-500">/mês</span>
                    </div>
                  </div>
                </div>

                {/* 6. MÓDULO MEU ASSESSOR (IA & COPILOTO DE GESTÃO) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-white/[0.015] to-purple-500/10 border border-emerald-500/30 flex flex-col justify-between gap-3 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <Bot className="text-emerald-400" size={15} />
                        <span>Meu Assessor (IA)</span>
                        <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-bold uppercase flex items-center gap-0.5">
                          <Sparkles size={8} /> Add-on
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-300 mt-1">
                        Copiloto inteligente: relatórios executivos por IA, insights financeiros e decisões no WhatsApp.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUpdateTenantField('modulo_assessor', !selectedTenant.modulo_assessor)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                        selectedTenant.modulo_assessor ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block w-5 h-5 rounded-full bg-white transform transition-transform ${
                          selectedTenant.modulo_assessor ? 'translate-x-5.5' : 'translate-x-0.5'
                        } top-0.5 absolute left-0`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5">
                    <span className="text-zinc-400 uppercase font-semibold">Disponível nos Planos:</span>
                    <span className="text-purple-300 font-bold">Starter, Pro e Elite</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-zinc-400 uppercase font-semibold">Mensalidade do Assessor:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={valorAssessor}
                        onChange={e => setValorAssessor(Number(e.target.value))}
                        onBlur={() => handleUpdateTenantField('valor_modulo_assessor', Number(valorAssessor))}
                        className="w-16 bg-white/[0.04] border border-emerald-500/30 rounded px-1.5 py-0.5 text-right font-bold text-white outline-none focus:border-emerald-500 text-[10px]"
                      />
                      <span className="text-zinc-500">/mês</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateTenantField('modulo_assessor', true)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        selectedTenant.modulo_assessor
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      }`}
                    >
                      <Bot size={11} />
                      {selectedTenant.modulo_assessor ? 'Assessor Ativo nesta Loja' : 'Adicionar Meu Assessor (+R$ 59,90)'}
                    </button>
                  </div>
                </div>

                {/* 7. MÓDULO SPLIT DE PAGAMENTOS & SUBCONTAS (ASAAS - LEI SALÃO-PARCEIRO) */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-500/10 via-white/[0.015] to-emerald-500/10 border border-indigo-500/30 flex flex-col justify-between gap-3 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <GitFork className="text-indigo-400" size={15} />
                        <span>Split de Pagamentos Asaas</span>
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                          Salão-Parceiro
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-300 mt-1">
                        Rateio automático D+0 entre Barbearia, Barbeiros e Taxa Naville (Take-Rate) sem bitributação.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const novoStatus = !(selectedTenant.split_ativo ?? selectedTenant.modulo_split_asaas);
                        handleUpdateMultiple({
                          split_ativo: novoStatus,
                          modulo_split_asaas: novoStatus,
                        });
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
                        (selectedTenant.split_ativo ?? selectedTenant.modulo_split_asaas) ? 'bg-indigo-600' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block w-5 h-5 rounded-full bg-white transform transition-transform ${
                          (selectedTenant.split_ativo ?? selectedTenant.modulo_split_asaas) ? 'translate-x-5.5' : 'translate-x-0.5'
                        } top-0.5 absolute left-0`}
                      />
                    </button>
                  </div>

                  {/* PRECIFICAÇÃO E COBRANÇA DO UPGRADE (SPLIT) */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-black/50 border border-indigo-500/30 flex flex-col gap-3 shadow-inner">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <CreditCard className="text-indigo-400" size={16} />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Precificação do Upgrade & Cobrança
                        </span>
                      </div>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        Valor Adicional na Mensalidade
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* VALOR MENSALIDADE UPGRADE */}
                      <div className="p-3 rounded-lg bg-black/50 border border-indigo-500/20 flex flex-col gap-1.5 hover:border-indigo-500/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block animate-pulse"></span>
                            Preço do Upgrade Mensal:
                          </label>
                          <span className="text-[9px] text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">R$/mês</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 focus-within:border-indigo-400 focus-within:bg-white/[0.08] transition-all">
                          <span className="text-sm font-black text-indigo-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={valorSplitMensal}
                            onChange={e => setValorSplitMensal(Number(e.target.value))}
                            onBlur={() => handleUpdateMultiple({
                              split_mensalidade_modulo: Number(valorSplitMensal),
                              valor_modulo_split: Number(valorSplitMensal)
                            })}
                            className="w-full bg-transparent font-black text-white text-base outline-none tracking-wide"
                            placeholder="30.00"
                          />
                          <span className="text-xs text-zinc-400 font-semibold whitespace-nowrap">/mês</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                          Cobrado na assinatura mensal da barbearia quando o Split estiver ativo.
                        </p>
                      </div>

                      {/* TAKE-RATE NAVILLE */}
                      <div className="p-3 rounded-lg bg-black/50 border border-emerald-500/20 flex flex-col gap-1.5 hover:border-emerald-500/40 transition-colors">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                            Take-rate por Operação:
                          </label>
                          <span className="text-[9px] text-emerald-300 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">R$/transação</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 focus-within:border-emerald-400 focus-within:bg-white/[0.08] transition-all">
                          <span className="text-sm font-black text-emerald-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={valorSplitTaxa}
                            onChange={e => setValorSplitTaxa(Number(e.target.value))}
                            onBlur={() => handleUpdateTenantField('split_taxa_transacao', Number(valorSplitTaxa))}
                            className="w-full bg-transparent font-black text-emerald-300 text-base outline-none tracking-wide"
                            placeholder="0.35"
                          />
                          <span className="text-xs text-zinc-400 font-semibold whitespace-nowrap">/op</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                          Tarifa Naville retida em cada transação de checkout após o período de carência.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* REGRAS COMERCIAIS DO SPLIT */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <GitFork className="text-indigo-400" size={16} />
                        <span className="text-xs font-bold text-white">Regras de Carência e Gratuidade</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Take-rate atual: R$ {Number(selectedTenant.split_taxa_transacao || 0.35).toFixed(2)}/op
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateTenantField('split_carencia_tipo', 'dias')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          (selectedTenant.split_carencia_tipo || 'dias') === 'dias'
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'border-white/5 text-zinc-500 hover:text-zinc-400'
                        }`}
                      >
                        Dias Gratuitos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTenantField('split_carencia_tipo', 'transacoes')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          selectedTenant.split_carencia_tipo === 'transacoes'
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'border-white/5 text-zinc-500 hover:text-zinc-400'
                        }`}
                      >
                        Cota Mensal Grátis
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTenantField('split_carencia_tipo', 'isento_vitalicio')}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          selectedTenant.split_carencia_tipo === 'isento_vitalicio'
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                            : 'border-white/5 text-zinc-500 hover:text-zinc-400'
                        }`}
                      >
                        Isenção Total (R$ 0)
                      </button>
                    </div>

                    {(selectedTenant.split_carencia_tipo || 'dias') === 'dias' && (
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-[10px] text-zinc-400">Dias de carência:</label>
                        <input
                          type="number"
                          value={selectedTenant.split_dias_gratis ?? 30}
                          onChange={(e) => handleUpdateTenantField('split_dias_gratis', Number(e.target.value))}
                          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                          placeholder="30"
                        />
                        <span className="text-[10px] text-zinc-500">dias a contar da ativação</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateMultiple({
                              split_data_ativacao: new Date().toISOString(),
                              split_dias_gratis: selectedTenant.split_dias_gratis ?? 30,
                            });
                          }}
                          className="ml-auto text-[9px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                        >
                          Renovar (Hoje)
                        </button>
                      </div>
                    )}

                    {selectedTenant.split_carencia_tipo === 'transacoes' && (
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-[10px] text-zinc-400">Cota mensal:</label>
                        <input
                          type="number"
                          value={selectedTenant.split_franquia_transacoes_mensal ?? 30}
                          onChange={(e) => handleUpdateTenantField('split_franquia_transacoes_mensal', Number(e.target.value))}
                          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                          placeholder="30"
                        />
                        <span className="text-[10px] text-zinc-500">transações gratuitas todo mês</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateTenantField('split_contador_mes_atual', 0)}
                          className="ml-auto text-[9px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                        >
                          Zerar ({selectedTenant.split_contador_mes_atual ?? 0} usadas)
                        </button>
                      </div>
                    )}

                    {selectedTenant.split_carencia_tipo === 'isento_vitalicio' && (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1">
                        <Gift size={13} />
                        <span>Isenção vitalícia ativada: R$ 0,00 de retenção Naville em qualquer volume.</span>
                      </div>
                    )}
                  </div>

                  {/* RESUMO DOS TERMINAIS PAREADOS (SMART LINK / TEF) */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1.5">
                        <Radio size={12} className="text-emerald-400" />
                        Terminais Pareados:
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">
                        {terminaisTenant.length} conectados
                      </span>
                    </div>

                    {loadingTerminaisTenant ? (
                      <span className="text-[10px] text-zinc-500">Carregando terminais...</span>
                    ) : terminaisTenant.length === 0 ? (
                      <span className="text-[10px] text-zinc-500">Nenhum terminal físico ou PWA registrado.</span>
                    ) : (
                      <div className="flex flex-col gap-1 mt-1">
                        {terminaisTenant.slice(0, 3).map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between text-[10px] bg-white/[0.02] px-2 py-1 rounded border border-white/5">
                            <span className="text-white font-medium truncate max-w-[130px]">
                              {t.identificador}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono text-zinc-400">#{t.codigo_pareamento}</span>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                t.status === 'aguardando_pagamento'
                                  ? 'bg-amber-400 animate-ping'
                                  : t.status === 'online'
                                  ? 'bg-emerald-400'
                                  : 'bg-zinc-600'
                              }`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSplitModalOpen(true)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 shadow-sm"
                    >
                      <GitFork size={12} />
                      <span>Gerenciar Subcontas, Regras & Terminais ({selectedTenant.nome})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO: FATURAMENTO & COBRANÇA */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-2"><CreditCard size={14}/> Faturamento (Asaas)</h3>
                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Gateway Oficial</span>
              </div>
              
              {/* Renderização Condicional: Cliente Asaas Existe? */}
              {!selectedTenant.asaas_id ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Este tenant ainda não está sincronizado com o Asaas. Sincronize para cadastrar o cliente na base de Produção e emitir cobranças.
                  </p>
                  <button
                    onClick={handleSyncAsaas}
                    disabled={syncing}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg transition-colors flex justify-center items-center gap-1.5 shadow-[0_0_12px_rgba(59,130,246,0.25)] cursor-pointer"
                  >
                    <UserPlus size={14}/> {syncing ? 'Sincronizando com Asaas...' : 'Sincronizar Cliente no Asaas (Produção)'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-lg p-2.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Comprador / Titular (Asaas):</span>
                      <span className="text-[11px] font-bold text-white truncate max-w-[170px]">
                        {selectedTenant.proprietario || selectedTenant.nome_proprietario || selectedTenant.nome}
                      </span>
                    </div>
                    <button
                      onClick={handleAbrirEditarComprador}
                      className="text-[9px] text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded border border-blue-500/20 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Editar nome e dados do comprador no Asaas"
                    >
                      <Edit3 size={10} /> Editar
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-lg px-2.5 py-1.5 mb-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">ID Asaas:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedTenant.asaas_id}</span>
                      <button
                        type="button"
                        onClick={handleResetarAsaas}
                        disabled={syncing}
                        className="text-[9px] text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Resetar ID para criar uma conta na base real de Produção"
                      >
                        <RotateCcw size={10} /> Resetar p/ Produção
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAbrirModalCobranca}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg transition-colors flex justify-center items-center gap-1.5 shadow-[0_0_12px_rgba(59,130,246,0.25)] cursor-pointer"
                  >
                    <Receipt size={14}/> Gerar Cobrança / Assinatura (Asaas)
                  </button>
                  
                  <button
                    onClick={handleAbrirHistoricoAsaas}
                    className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold py-1.5 px-3 rounded-lg border border-white/10 transition-colors flex justify-center items-center gap-1.5 mt-0.5 cursor-pointer"
                  >
                    <FileText size={14}/> Ver Histórico do Asaas
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="col-span-8 flex flex-col items-center justify-center rounded-xl bg-white/[0.01] border border-white/[0.05] text-zinc-500 text-xs">
            <Store className="opacity-30 mb-2" size={28} />
            Selecione uma barbearia para gerenciar a governança e módulos.
          </div>
        )}
      </div>

      {/* MODAL: EMISSÃO DE COBRANÇA / ASSINATURA NO ASAAS */}
      {isCobrancaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Receipt size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Emitir Cobrança SaaS (Asaas)</h3>
                  <p className="text-[11px] text-zinc-400">
                    Comprador: <strong className="text-zinc-200">{selectedTenant?.proprietario || selectedTenant?.nome}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsCobrancaModalOpen(false); setCobrancaGerada(null); }}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {cobrancaGerada ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center flex flex-col items-center gap-2">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">Cobrança Gerada no Asaas com Sucesso!</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    A fatura foi emitida e vinculada ao painel desta barbearia. O cliente pode pagar por PIX, Boleto com QR Code ou Cartão.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">ID da Cobrança:</span>
                    <span className="font-mono text-blue-400 font-bold">{cobrancaGerada.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Valor:</span>
                    <span className="font-bold text-amber-400">R$ {Number(cobrancaGerada.value).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Vencimento:</span>
                    <span className="text-zinc-200 font-mono">{formatarDataBR(cobrancaGerada.dueDate)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={cobrancaGerada.invoiceUrl || cobrancaGerada.bankSlipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs flex justify-center items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                  >
                    <ExternalLink size={14} /> Abrir Fatura Oficial no Asaas
                  </a>
                  <button
                    onClick={() => {
                      const link = cobrancaGerada.invoiceUrl || cobrancaGerada.bankSlipUrl || '';
                      navigator.clipboard.writeText(link);
                      alert('Link da fatura copiado para a área de transferência!');
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold py-1.5 px-3 rounded-lg text-xs flex justify-center items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Copy size={13} /> Copiar Link de Pagamento
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {/* Modalidade: Avulsa ou Recorrente */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-300">Tipo de Faturamento:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalidadeCobranca('avulsa')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                        modalidadeCobranca === 'avulsa'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      ⚡ Cobrança Avulsa
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalidadeCobranca('recorrente')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                        modalidadeCobranca === 'recorrente'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      🔄 Assinatura Recorrente
                    </button>
                  </div>
                </div>

                {/* Seletor do Melhor Dia do Mês e Pró-Rata */}
                <div className="p-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/20 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                      <Calendar size={13} className="text-blue-400" /> Melhor Dia de Vencimento:
                    </label>
                    <div className="flex gap-1">
                      {[5, 10, 15, 20, 25].map((dia) => (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => handleSelecionarDiaVencimento(dia)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            diaVencimentoEscolhido === dia
                              ? 'bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                          }`}
                        >
                          Dia {dia < 10 ? `0${dia}` : dia}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Pró-Rata */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <Calculator size={13} className="text-amber-400" /> Cobrança Pró-Rata (Proporcional)
                      </span>
                      <span className="text-[9px] text-zinc-400">
                        {usarProRata
                          ? `${diasProRata} dias até o dia ${diaVencimentoEscolhido} • R$ ${(valorIntegralMes / 30).toFixed(2)}/dia`
                          : 'Cobrar valor integral na primeira fatura'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleProRata(!usarProRata)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        usarProRata ? 'bg-amber-500' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          usarProRata ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {usarProRata && (
                    <div className="text-[10px] bg-amber-500/10 text-amber-300 p-2 rounded-lg border border-amber-500/20 leading-tight">
                      Primeira fatura proporcional: <strong>R$ {valorCobranca.toFixed(2)}</strong> ({diasProRata} dias). A partir do mês seguinte, a recorrência cobrará os <strong>R$ {valorIntegralMes.toFixed(2)}</strong> integrais.
                    </div>
                  )}
                </div>

                {/* Forma de Pagamento */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-300">Formas de Pagamento Aceitas:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMetodoCobranca('UNDEFINED')}
                      className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-colors text-left flex items-center justify-between cursor-pointer ${
                        metodoCobranca === 'UNDEFINED'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span>🌐 Todas (PIX, Boleto, Cartão)</span>
                      {metodoCobranca === 'UNDEFINED' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoCobranca('PIX')}
                      className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-colors text-left flex items-center justify-between cursor-pointer ${
                        metodoCobranca === 'PIX'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span>💠 Exclusivo PIX</span>
                      {metodoCobranca === 'PIX' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoCobranca('BOLETO')}
                      className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-colors text-left flex items-center justify-between cursor-pointer ${
                        metodoCobranca === 'BOLETO'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span>📄 Boleto (com QR Code PIX)</span>
                      {metodoCobranca === 'BOLETO' && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoCobranca('CREDIT_CARD')}
                      className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-colors text-left flex items-center justify-between cursor-pointer ${
                        metodoCobranca === 'CREDIT_CARD'
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                          : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span>💳 Cartão de Crédito</span>
                      {metodoCobranca === 'CREDIT_CARD' && <Check size={12} />}
                    </button>
                  </div>
                </div>

                {/* Linha com Valor e Vencimento */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-300">Valor Cobrado (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorCobranca}
                      onChange={(e) => setValorCobranca(Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-300">Data de Vencimento:</label>
                    <input
                      type="date"
                      value={vencimentoCobranca}
                      onChange={(e) => setVencimentoCobranca(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-300">Descrição na Fatura:</label>
                  <input
                    type="text"
                    value={descricaoCobranca}
                    onChange={(e) => setDescricaoCobranca(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[10px] text-zinc-400 flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-400 shrink-0" />
                  <span>O boleto gerado no Asaas inclui automaticamente código de barras, linha digitável e <strong>QR Code PIX</strong> embutido.</span>
                </div>

                <button
                  type="button"
                  onClick={handleCriarCobrancaAsaasSubmit}
                  disabled={loadingCobranca}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs flex justify-center items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(59,130,246,0.25)] cursor-pointer mt-1"
                >
                  {loadingCobranca ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Emitindo no Asaas...
                    </>
                  ) : (
                    <>
                      <Receipt size={14} /> Emitir no Asaas e Salvar no Painel
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE COBRANÇAS DO ASAAS */}
      {isHistoricoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Histórico de Cobranças (Asaas)</h3>
                  <p className="text-[11px] text-zinc-400">
                    Cliente: <strong className="text-zinc-200">{selectedTenant?.proprietario || selectedTenant?.nome}</strong> (ID: {selectedTenant?.asaas_id})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSincronizarFaturasComPocketBase}
                  disabled={syncingFaturasPB || historicoCobrancas.length === 0}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                  title="Sincronizar faturas do Asaas com o PocketBase"
                >
                  <RefreshCw size={12} className={syncingFaturasPB ? 'animate-spin' : ''} />
                  <span>{syncingFaturasPB ? 'Sincronizando...' : 'Sincronizar com Loja'}</span>
                </button>
                <button
                  onClick={() => setIsHistoricoModalOpen(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
              {loadingHistorico ? (
                <div className="text-center py-12 text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={15} className="animate-spin text-blue-400" />
                  <span>Consultando faturas no Asaas Sandbox...</span>
                </div>
              ) : historicoCobrancas.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs flex flex-col items-center gap-2 bg-white/[0.01] rounded-xl border border-white/5">
                  <FileText size={24} className="opacity-30" />
                  <span>Nenhuma cobrança encontrada para este cliente no Asaas.</span>
                </div>
              ) : (
                historicoCobrancas.map((cob) => {
                  const isPago = cob.status === 'RECEIVED' || cob.status === 'CONFIRMED' || cob.status === 'RECEIVED_IN_CASH';
                  const isAtrasado = cob.status === 'OVERDUE';
                  const linkFatura = cob.invoiceUrl || cob.bankSlipUrl;
                  const isEditingThis = editandoCobrancaId === cob.id;

                  return (
                    <div
                      key={cob.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                              isPago
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isAtrasado
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {cob.billingType === 'PIX' ? 'PIX' : cob.billingType === 'BOLETO' ? 'BOL' : 'FAT'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{cob.description || 'Cobrança Naville Barber'}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  isPago
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : isAtrasado
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {isPago ? 'PAGO' : isAtrasado ? 'ATRASADO' : 'PENDENTE'}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 whitespace-nowrap">
                              <span>
                                Vencimento: <strong className="text-zinc-200 font-mono">{formatarDataBR(cob.dueDate)}</strong>
                              </span>
                              <span>•</span>
                              <span className="text-zinc-400">{formatarFormaPagamento(cob.billingType)}</span>
                              <span>•</span>
                              <span className="font-mono text-[9px] text-zinc-500">{cob.id}</span>
                              {cob.paymentDate && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400">Pago em {formatarDataBR(cob.paymentDate)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold text-amber-400">R$ {Number(cob.value).toFixed(2)}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">{cob.billingType}</div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isPago && (
                              <button
                                onClick={() => {
                                  setEditandoCobrancaId(isEditingThis ? null : cob.id);
                                  setNovoVencimentoInput(cob.dueDate || '');
                                }}
                                className="text-[10px] font-bold px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                title="Alterar data de vencimento desta cobrança no Asaas"
                              >
                                <Clock size={11} />
                                <span>{isEditingThis ? 'Cancelar' : 'Mudar Vencimento'}</span>
                              </button>
                            )}

                            {linkFatura && (
                              <a
                                href={linkFatura}
                                target="_blank"
                                rel="noreferrer"
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                                  isPago
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white border-transparent'
                                }`}
                              >
                                <ExternalLink size={11} />
                                <span>{isPago ? 'Ver Comprovante' : 'Abrir Fatura'}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Painel inline de alteração de vencimento */}
                      {isEditingThis && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-3 bg-white/[0.01] p-2 rounded-lg animate-in fade-in duration-150">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-400 text-[11px]">Nova Data de Vencimento:</span>
                            <input
                              type="date"
                              value={novoVencimentoInput}
                              onChange={(e) => setNovoVencimentoInput(e.target.value)}
                              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => handleSalvarNovoVencimento(cob.id)}
                            disabled={savingVencimento}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-3 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Save size={11} />
                            <span>{savingVencimento ? 'Salvando...' : 'Salvar no Asaas'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DADOS COMPLETOS DA BARBEARIA */}
      {isEditBarbeariaOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Editar Dados da Barbearia</h3>
                  <p className="text-[11px] text-zinc-400">
                    Altere nome comercial, URL/slug, proprietário, contatos, plano e endereço
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBarbeariaOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSalvarBarbearia} className="flex flex-col gap-4">
              {/* SEÇÃO 1: IDENTIFICAÇÃO DA LOJA */}
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                  1. Identificação da Loja
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Nome da Barbearia *</label>
                    <input
                      type="text"
                      required
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      placeholder="Ex: Barbearia Vip"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Slug / Link Público *</label>
                    <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 focus-within:border-indigo-500 transition-colors">
                      <span className="text-zinc-500 text-xs font-mono select-none">/b/</span>
                      <input
                        type="text"
                        required
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        placeholder="barbearia-vip"
                        className="bg-transparent text-xs text-emerald-400 outline-none w-full font-mono ml-0.5"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Plano SaaS</label>
                    <select
                      value={editPlano}
                      onChange={(e) => setEditPlano(e.target.value)}
                      className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="starter">Starter (Até 2 Cadeiras)</option>
                      <option value="pro">Pro (Até 5 Cadeiras)</option>
                      <option value="elite">Elite (Ilimitado / Custom)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">ID no Sistema</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={selectedTenant.id}
                      className="bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-500 font-mono cursor-not-allowed select-all"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: DADOS DO PROPRIETÁRIO / CONTATO */}
              <div className="border-t border-white/5 pt-3">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                  2. Proprietário & Contato
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Nome do Dono / Titular</label>
                    <input
                      type="text"
                      value={editProprietario}
                      onChange={(e) => setEditProprietario(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={editTelefone}
                      onChange={(e) => setEditTelefone(e.target.value)}
                      placeholder="Ex: 19999998888"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">E-mail do Proprietário</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="dono@exemplo.com"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">CPF ou CNPJ</label>
                    <input
                      type="text"
                      value={editDocumento}
                      onChange={(e) => setEditDocumento(e.target.value)}
                      placeholder="Apenas números ou formatado"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: ENDEREÇO DA BARBEARIA */}
              <div className="border-t border-white/5 pt-3">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                  3. Endereço Comercial
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">CEP</label>
                    <input
                      type="text"
                      value={editCep}
                      onChange={(e) => setEditCep(e.target.value)}
                      placeholder="13770-000"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Rua / Logradouro</label>
                    <input
                      type="text"
                      value={editEndereco}
                      onChange={(e) => setEditEndereco(e.target.value)}
                      placeholder="Ex: Rua das Flores"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Número</label>
                    <input
                      type="text"
                      value={editNumero}
                      onChange={(e) => setEditNumero(e.target.value)}
                      placeholder="123 ou S/N"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Bairro</label>
                    <input
                      type="text"
                      value={editBairro}
                      onChange={(e) => setEditBairro(e.target.value)}
                      placeholder="Centro"
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-zinc-300">Cidade / UF</label>
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        type="text"
                        value={editCidade}
                        onChange={(e) => setEditCidade(e.target.value)}
                        placeholder="Cidade"
                        className="col-span-2 bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                      />
                      <input
                        type="text"
                        maxLength={2}
                        value={editEstado}
                        onChange={(e) => setEditEstado(e.target.value.toUpperCase())}
                        placeholder="SP"
                        className="bg-white/[0.03] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors text-center uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="border-t border-white/5 pt-3 flex justify-end items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditBarbeariaOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBarbearia}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingBarbearia ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                  <span>{savingBarbearia ? 'Salvando Alterações...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR COMPRADOR / TITULAR NO ASAAS */}
      {isEditCompradorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Editar Dados do Comprador</h3>
                  <p className="text-[11px] text-zinc-400">Atualiza os dados de faturamento no Asaas</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditCompradorOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-zinc-300">Nome do Titular / Responsável:</label>
                <input
                  type="text"
                  value={nomeCompradorInput}
                  onChange={(e) => setNomeCompradorInput(e.target.value)}
                  placeholder="Nome completo do comprador"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-zinc-300">E-mail para Faturas:</label>
                <input
                  type="email"
                  value={emailCompradorInput}
                  onChange={(e) => setEmailCompradorInput(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-zinc-300">CPF ou CNPJ:</label>
                <input
                  type="text"
                  value={docCompradorInput}
                  onChange={(e) => setDocCompradorInput(e.target.value)}
                  placeholder="Apenas números"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSalvarComprador}
                disabled={savingComprador}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-1.5 px-3.5 rounded-lg text-xs flex justify-center items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(59,130,246,0.25)] cursor-pointer mt-2"
              >
                {savingComprador ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Atualizando no Asaas...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Salvar Alterações no Asaas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL / OVERLAY: SPLIT DE PAGAMENTOS & SUBCONTAS ASAAS */}
      {isSplitModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-2xl bg-zinc-950/95 border border-white/10 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[92vh] overflow-y-auto custom-scrollbar">
            <SplitPaymentView
              tenant={selectedTenant}
              onUpdateTenant={(updated) => {
                setSelectedTenant(updated);
                setBarbearias((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
              }}
              onClose={() => setIsSplitModalOpen(false)}
            />
          </div>
        </div>
      )}
      {/* TOAST FLUTUANTE DE NOTIFICAÇÕES */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div
            className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${
              toast.tipo === 'sucesso'
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
                : toast.tipo === 'erro'
                ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
                : toast.tipo === 'aviso'
                ? 'bg-amber-950/95 border-amber-500/40 text-amber-200'
                : 'bg-blue-950/95 border-blue-500/40 text-blue-200'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.tipo === 'sucesso' && <CheckCircle2 size={18} className="text-emerald-400" />}
              {toast.tipo === 'erro' && <AlertCircle size={18} className="text-rose-400" />}
              {toast.tipo === 'aviso' && <AlertCircle size={18} className="text-amber-400" />}
              {toast.tipo === 'info' && <AlertCircle size={18} className="text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.titulo && (
                <h5 className="text-xs font-bold uppercase tracking-wider mb-0.5">{toast.titulo}</h5>
              )}
              <p className="text-xs font-normal leading-relaxed">{toast.mensagem}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { SuperAdminLojasView };
