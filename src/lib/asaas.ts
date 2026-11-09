/**
 * Integração com o Gateway de Pagamentos Asaas
 */

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

const FALLBACK_SANDBOX_KEY = '';

function getAsaasConfig() {
  const isProd = import.meta.env.VITE_ASAAS_ENV === 'production';
  const envKey = isProd
    ? import.meta.env.VITE_ASAAS_API_KEY_PRODUCTION
    : import.meta.env.VITE_ASAAS_API_KEY_SANDBOX;

  const apiKey =
    envKey && envKey !== 'sua_chave_sandbox_aqui' && envKey !== 'sua_chave_producao_aqui'
      ? envKey
      : '';

  if (!apiKey) {
    throw new Error('Chave de API do Asaas não configurada no arquivo .env');
  }

  // Em ambiente de desenvolvimento Vite, usa o proxy configurado (/api/asaas) para contornar CORS
  const baseUrl = import.meta.env.DEV
    ? '/api/asaas'
    : (isProd ? 'https://api.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3');

  return { apiKey, baseUrl, isProd };
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
