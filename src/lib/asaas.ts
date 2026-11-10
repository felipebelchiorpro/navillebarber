/**
 * Integração com o Gateway de Pagamentos Asaas
 */

import { pb } from '../services/pocketbase';

export interface ClienteAsaas {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  [key: string]: any;
}

export type AsaasBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';

export interface CobrancaAsaas {
  id: string;
  customer: string;
  dateCreated: string;
  dueDate: string;
  value: number;
  netValue?: number;
  billingType: AsaasBillingType;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
  description?: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  invoiceNumber?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  [key: string]: any;
}

export interface AssinaturaAsaas {
  id: string;
  customer: string;
  dateCreated: string;
  value: number;
  nextDueDate: string;
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  billingType: AsaasBillingType;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  description?: string;
  [key: string]: any;
}

// 1. CREDENCIAIS E ROTAS DO GATEWAY ASAAS
export const ASAAS_URL =
  (typeof process !== 'undefined' && process.env?.ASAAS_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ASAAS_API_URL) ||
  'https://api.asaas.com/v3';

export const ASAAS_KEY =
  (typeof process !== 'undefined' && process.env?.ASAAS_API_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ASAAS_API_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ASAAS_API_KEY_PRODUCTION) ||
  '';

export const MASTER_WALLET_ID =
  (typeof process !== 'undefined' && process.env?.ASAAS_MASTER_WALLET_ID) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ASAAS_MASTER_WALLET_ID) ||
  '';

function getAsaasConfig() {
  const apiKey = ASAAS_KEY;

  if (!apiKey) {
    throw new Error('Chave de API do Asaas não configurada no servidor. As operações devem ser realizadas via rotas do backend.');
  }

  const baseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV)
    ? '/api/asaas'
    : ASAAS_URL;

  return { apiKey, baseUrl, isProd: true };
}

/**
 * Dispara a sincronização/cadastro do tenant diretamente pelo backend seguro (sem expor credenciais no cliente)
 * Com validação de ID e fallback automático resiliente.
 */
export async function sincronizarTenantNoBackend(tenantId: string) {
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim() || tenantId === 'undefined' || tenantId === 'null') {
    throw new Error('ID da barbearia não foi informado. Cadastre e salve os dados da barbearia antes de sincronizar com o Asaas.');
  }

  const response = await fetch('/api/asaas/sync-tenant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenantId: tenantId.trim() }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Erro ao sincronizar com Asaas (${response.status})`);
  }

  return data;
}

/**
 * Dispara a criação/provisionamento da subconta de Split da barbearia diretamente pelo backend seguro
 */
export async function sincronizarSubcontaNoBackend(tenantId: string, dados?: { chavePix?: string; tipoChave?: string }) {
  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim() || tenantId === 'undefined' || tenantId === 'null') {
    throw new Error('ID da barbearia não foi informado. Cadastre e salve os dados da barbearia antes de sincronizar com o Asaas.');
  }

  const response = await fetch(`/api/tenants/${encodeURIComponent(tenantId.trim())}/sync-subconta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados || {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Erro ao provisionar subconta no Asaas (${response.status})`);
  }

  return data;
}

/**
 * Dispara a criação/provisionamento da subconta de Split do barbeiro/profissional diretamente pelo backend seguro
 */
export async function sincronizarSubcontaProfissionalNoBackend(profissionalId: string, dados?: any) {
  if (!profissionalId || typeof profissionalId !== 'string' || !profissionalId.trim() || profissionalId === 'undefined' || profissionalId === 'null') {
    throw new Error('ID do profissional não foi informado ou é inválido.');
  }

  const response = await fetch(`/api/profissionais/${encodeURIComponent(profissionalId.trim())}/sync-subconta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dados || {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Erro ao provisionar subconta do profissional no Asaas (${response.status})`);
  }

  return data;
}

/**
 * Cria um cliente no Asaas
 */
export async function criarClienteAsaas(
  nome: string,
  email: string,
  documento?: string
): Promise<ClienteAsaas> {
  const { apiKey, baseUrl } = getAsaasConfig();

  const payload: Record<string, any> = {
    name: nome,
    email: email,
  };

  if (documento) {
    const docLimpo = documento.replace(/\D/g, '');
    if (docLimpo.length === 11 || docLimpo.length === 14) {
      payload.cpfCnpj = docLimpo;
    }
  }

  const response = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.errors?.[0]?.description ||
      data.message ||
      `Falha na comunicação com Asaas (${response.status})`;
    throw new Error(errorMsg);
  }

  if (!data.id) {
    throw new Error('O Asaas não retornou o identificador do cliente (ID). Verifique a resposta.');
  }

  return data as ClienteAsaas;
}

/**
 * Gera uma nova cobrança avulsa no Asaas (PIX, Boleto com QR, Cartão ou Fatura Completa)
 */
export async function criarCobrancaAsaas(params: {
  customer: string;
  value: number;
  dueDate: string;
  description?: string;
  billingType?: AsaasBillingType;
}): Promise<CobrancaAsaas> {
  const { apiKey, baseUrl } = getAsaasConfig();

  const payload = {
    customer: params.customer,
    billingType: params.billingType || 'UNDEFINED',
    value: Number(params.value.toFixed(2)),
    dueDate: params.dueDate,
    description: params.description || 'Cobrança SaaS Naville Barber',
  };

  const response = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.errors?.[0]?.description ||
      data.message ||
      `Erro ao criar cobrança no Asaas (${response.status})`;
    throw new Error(errorMsg);
  }

  if (!data.id) {
    throw new Error('Falha ao obter ID da cobrança gerada pelo Asaas.');
  }

  return data as CobrancaAsaas;
}

/**
 * Cria uma assinatura recorrente no Asaas (ciclo mensal padrão)
 */
export async function criarAssinaturaAsaas(params: {
  customer: string;
  value: number;
  nextDueDate: string;
  description?: string;
  billingType?: AsaasBillingType;
  cycle?: 'MONTHLY' | 'WEEKLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
}): Promise<AssinaturaAsaas> {
  const { apiKey, baseUrl } = getAsaasConfig();

  const payload = {
    customer: params.customer,
    billingType: params.billingType || 'UNDEFINED',
    value: Number(params.value.toFixed(2)),
    nextDueDate: params.nextDueDate,
    cycle: params.cycle || 'MONTHLY',
    description: params.description || 'Assinatura Recorrente SaaS - Naville Barber',
  };

  const response = await fetch(`${baseUrl}/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.errors?.[0]?.description ||
      data.message ||
      `Erro ao criar assinatura no Asaas (${response.status})`;
    throw new Error(errorMsg);
  }

  return data as AssinaturaAsaas;
}

/**
 * Lista todas as cobranças de um cliente no Asaas
 */
export async function listarCobrancasClienteAsaas(customerId: string): Promise<CobrancaAsaas[]> {
  const { apiKey, baseUrl } = getAsaasConfig();

  const response = await fetch(`${baseUrl}/payments?customer=${encodeURIComponent(customerId)}&limit=50`, {
    method: 'GET',
    headers: {
      'access_token': apiKey,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.errors?.[0]?.description ||
      data.message ||
      `Erro ao buscar cobranças do cliente (${response.status})`;
    throw new Error(errorMsg);
  }

  return (data.data || []) as CobrancaAsaas[];
}

/**
 * Obtém o QR Code e a chave Copia e Cola do PIX para uma cobrança
 */
export async function buscarQrCodePixAsaas(paymentId: string): Promise<{
  encodedImage: string;
  payload: string;
  expirationDate: string;
}> {
  const { apiKey, baseUrl } = getAsaasConfig();

  const response = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentId)}/pixQrCode`, {
    method: 'GET',
    headers: {
      'access_token': apiKey,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.errors?.[0]?.description ||
      data.message ||
      `Erro ao carregar PIX QR Code (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Atualiza os dados de um cliente no Asaas (ex: nome do responsável / comprador, email, cpf/cnpj)
 */
export async function atualizarClienteAsaas(
  customerId: string,
  dados: { name?: string; email?: string; cpfCnpj?: string }
): Promise<ClienteAsaas> {
  const { apiKey, baseUrl } = getAsaasConfig();

  const payload: Record<string, any> = {};
  if (dados.name) payload.name = dados.name;
  if (dados.email) payload.email = dados.email;
  if (dados.cpfCnpj) {
    const docLimpo = dados.cpfCnpj.replace(/\D/g, '');
    if (docLimpo.length === 11 || docLimpo.length === 14) {
      payload.cpfCnpj = docLimpo;
    }
  }

  const response = await fetch(`${baseUrl}/customers/${encodeURIComponent(customerId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.errors?.[0]?.description ||
      data.message ||
      `Erro ao atualizar cliente no Asaas (${response.status})`;
    throw new Error(errorMsg);
  }

  return data as ClienteAsaas;
}

/**
 * Atualiza data de vencimento e/ou valor de uma cobrança pendente no Asaas
 */
export async function atualizarCobrancaAsaas(
  paymentId: string,
  dados: { dueDate?: string; value?: number; description?: string }
): Promise<CobrancaAsaas> {
  const { apiKey, baseUrl } = getAsaasConfig();

  const payload: Record<string, any> = {};
  if (dados.dueDate) payload.dueDate = dados.dueDate;
  if (dados.value !== undefined) payload.value = Number(dados.value.toFixed(2));
  if (dados.description) payload.description = dados.description;

  const response = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.errors?.[0]?.description ||
      data.message ||
      `Erro ao atualizar cobrança no Asaas (${response.status})`;
    throw new Error(errorMsg);
  }

  return data as CobrancaAsaas;
}

export interface SubcontaAsaasPayload {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
  phone?: string;
  incomeValue?: number;
  address?: string;
  addressNumber?: string;
  province?: string;
  postalCode?: string;
}

export interface SubcontaAsaasResponse {
  id: string;
  name: string;
  email: string;
  loginEmail?: string;
  cpfCnpj?: string;
  walletId: string;
  apiKey?: string;
  accountNumber?: {
    agency: string;
    account: string;
    accountDigit: string;
  };
}

/**
 * Cria uma subconta no Asaas para a Barbearia ou Barbeiro / Parceiro
 */
export async function criarSubcontaAsaas(
  dados: SubcontaAsaasPayload
): Promise<SubcontaAsaasResponse> {
  console.log('[ASAAS PROD] Criando subconta para:', dados.name);

  const { apiKey, baseUrl } = getAsaasConfig();
  const docLimpo = (dados.cpfCnpj || '').replace(/\D/g, '');
  const telLimpo = (dados.mobilePhone || dados.phone || '11999999999').replace(/\D/g, '');
  const cepLimpo = (dados.postalCode || '13770000').replace(/\D/g, '');

  const payload: Record<string, any> = {
    name: dados.name,
    email: dados.email,
    cpfCnpj: docLimpo,
    mobilePhone: telLimpo,
    address: dados.address || 'Rua Principal',
    addressNumber: dados.addressNumber || 'S/N',
    postalCode: cepLimpo,
    incomeValue: dados.incomeValue || 2500,
  };

  if (dados.province) payload.province = dados.province;

  const response = await fetch(`${baseUrl}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      data.errors?.[0]?.description ||
      data.message ||
      `Erro ao criar subconta no Asaas (${response.status})`;
    console.error('[ASAAS PROD] Falha na criação da subconta:', errorMsg, data);
    throw new Error(errorMsg);
  }

  const walletId = data.walletId || data.id;
  console.log('[ASAAS PROD] Resposta Asaas WalletId:', walletId);

  return {
    ...data,
    walletId,
  } as SubcontaAsaasResponse;
}

/**
 * Provisiona ou atualiza subconta no Asaas para a Barbearia (Tenant) com payload sanitizado
 */
export async function provisionarSubcontaBarbearia(
  barbearia: any,
  chavePix?: string
): Promise<SubcontaAsaasResponse> {
  const chavePixLimpa = (chavePix || barbearia.pix_chave_repasse || '').replace(/\D/g, '');
  const docCadastrado = (barbearia.documento || barbearia.cpf_cnpj || barbearia.cnpj || '').replace(/\D/g, '');

  const documentoFinal =
    docCadastrado ||
    (chavePixLimpa.length === 11 || chavePixLimpa.length === 14
      ? chavePixLimpa
      : chavePixLimpa.padEnd(11, '0'));

  const payload: SubcontaAsaasPayload = {
    name: barbearia.nome || 'Barbearia Parceira',
    email: barbearia.email_dono || barbearia.email || `${barbearia.slug || 'loja'}@navillebarber.com`,
    cpfCnpj: documentoFinal,
    mobilePhone: (barbearia.telefone || '').replace(/\D/g, '') || '11999999999',
    address: barbearia.endereco || 'Rua Principal',
    addressNumber: barbearia.numero || 'S/N',
    postalCode: (barbearia.cep || '13770000').replace(/\D/g, '') || '13770000',
  };

  return await criarSubcontaAsaas(payload);
}

/**
 * Motor de cálculo da taxa Naville (R$ 0,35 padrão ou regras de isenção/carência)
 */
export function calcularTaxaNavilleSplit(barbearia: any): number {
  if (!barbearia) return 0.35;

  // 1. Isenção vitalícia configurada no SuperAdmin
  if (barbearia.split_carencia_tipo === 'isento_vitalicio') {
    return 0.00;
  }

  // 2. Período de carência em dias (ex: primeiros 30 dias gratuitos)
  if (barbearia.split_carencia_tipo === 'dias' && barbearia.split_data_ativacao) {
    const dataAtivacao = new Date(barbearia.split_data_ativacao);
    const hoje = new Date();
    const diffDias = Math.floor((hoje.getTime() - dataAtivacao.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias <= (barbearia.split_dias_gratis || 30)) {
      return 0.00;
    }
  }

  // 3. Franquia mensal de operações gratuitas (ex: 30 primeiras transações do mês)
  if (barbearia.split_carencia_tipo === 'transacoes') {
    const operacoesFeitas = barbearia.split_contador_mes_atual || 0;
    const limiteGratis = barbearia.split_franquia_transacoes_mensal || 30;
    
    if (operacoesFeitas < limiteGratis) {
      return 0.00;
    }
  }

  // Se ultrapassou o período ou a franquia, cobra o valor padrão configurado
  return barbearia.split_taxa_transacao ?? 0.35;
}

export interface SplitDivisaoResultado {
  valorTotal: number;
  taxaNaville: number;
  fatiaProfissional: number;
  fatiaBarbearia: number;
  isento: boolean;
  motivoIsencao?: string;
}

/**
 * Calcula a divisão do Split para uma transação considerando as regras da barbearia
 */
export function calcularDivisaoSplitTransacao(
  valorTotal: number,
  comissaoPct: number,
  barbearia: any
): SplitDivisaoResultado {
  const taxaNaville = calcularTaxaNavilleSplit(barbearia);
  const isento = taxaNaville === 0;
  
  let motivoIsencao: string | undefined;
  if (isento) {
    if (barbearia?.split_carencia_tipo === 'isento_vitalicio') {
      motivoIsencao = 'Isenção Vitalícia SuperAdmin';
    } else if (barbearia?.split_carencia_tipo === 'dias') {
      motivoIsencao = 'Carência de Ativação (Dias Grátis)';
    } else if (barbearia?.split_carencia_tipo === 'transacoes') {
      motivoIsencao = 'Franquia Mensal Gratuita';
    }
  }

  // Barbeiro recebe sua porcentagem sobre o valor deduzida a taxa do ecossistema se configurado, ou do bruto
  const baseCalculo = Math.max(0, valorTotal - taxaNaville);
  const fatiaProfissional = Number((baseCalculo * (comissaoPct / 100)).toFixed(2));
  const fatiaBarbearia = Number((valorTotal - taxaNaville - fatiaProfissional).toFixed(2));

  return {
    valorTotal,
    taxaNaville,
    fatiaProfissional,
    fatiaBarbearia,
    isento,
    motivoIsencao,
  };
}

/**
 * Atualiza os dados bancários / Chave Pix na subconta do Asaas e no PocketBase
 */
export async function atualizarChavePixBarbeiro({
  subcontaAsaasId,
  tipoChave,
  chavePix,
  profissionalId,
  pinConfirmacao
}: {
  subcontaAsaasId: string;
  tipoChave: 'CPF' | 'PHONE' | 'EMAIL' | 'EVP';
  chavePix: string;
  profissionalId: string;
  pinConfirmacao: string;
}) {
  // 1. Valida o PIN do profissional no PocketBase antes de qualquer chamada externa
  const profissional = await pb.collection('profissionais').getOne<any>(profissionalId);
  const pinCadastrado = profissional.pin || profissional.pin_acesso || '1234';
  if (pinCadastrado !== pinConfirmacao.trim()) {
    throw new Error('PIN de segurança incorreto.');
  }

  // 2. Atualiza a subconta ou os dados de transferência padrão na API Asaas
  let apiKey = '';
  let baseUrl = 'https://api.asaas.com/api/v3';
  try {
    const config = getAsaasConfig();
    apiKey = config.apiKey;
    baseUrl = config.baseUrl;
  } catch {
    apiKey = (typeof process !== 'undefined' && process.env?.ASAAS_API_KEY) || '';
  }

  // Se houver subconta real e chave de API válida, dispara ao Asaas
  if (apiKey && subcontaAsaasId && !subcontaAsaasId.startsWith('acc_mock') && !subcontaAsaasId.startsWith('wal_mock')) {
    const response = await fetch(`${baseUrl}/accounts/${subcontaAsaasId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      },
      body: JSON.stringify({
        pixAddressKey: chavePix,
        pixAddressKeyType: tipoChave
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.description || errorData.message || 'Erro ao sincronizar com o Asaas.');
    }
  }

  // 3. Atualiza o registro no PocketBase
  const recordAtualizado = await pb.collection('profissionais').update(profissionalId, {
    pix_chave: chavePix,
    pix_tipo: tipoChave.toLowerCase(),
    pix_ultima_atualizacao: new Date().toISOString(),
    split_status: 'ativo'
  });

  return { success: true, profissional: recordAtualizado };
}

