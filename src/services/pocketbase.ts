import PocketBase from 'pocketbase';
import { evolutionApi } from './evolutionApi';

export const POCKETBASE_URL =
  (import.meta as any).env?.VITE_POCKETBASE_URL ||
  (typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8090'
        : window.location.origin)
    : 'http://127.0.0.1:8090');

export const pb = new PocketBase(POCKETBASE_URL);

// Desativa o auto-cancelamento global para evitar race conditions em requisições concorrentes
pb.autoCancellation(false);

/**
 * Interface representativa da coleção 'barbearias' (respeitando tabelas em português)
 */
export interface Barbearia {
  id: string;
  collectionId?: string;
  collectionName?: string;
  nome: string;
  slug: string;
  nome_proprietario?: string;
  telefone_proprietario?: string;
  proprietario?: string;
  telefone?: string;
  email?: string;
  documento?: string;
  status: 'ativo' | 'ativa' | 'teste' | 'bloqueado' | 'bloqueada' | 'cancelado' | 'cancelada';
  status_assinatura?: 'ativo' | 'trial' | 'bloqueado' | 'cancelado';
  plano?: string;
  plano_saas: 'starter' | 'pro' | 'elite' | 'enterprise' | 'basico' | 'vitalicio';
  e_vitalicio: boolean;
  max_barbeiros: number;
  limite_profissionais?: number;
  valor_adicional_barbeiro: number;
  bloqueio_automatico: boolean;
  data_expiracao_plano?: string;
  horarios_funcionamento?: Record<string, string>;
  descricao_espaco?: string;
  descricao?: string;
  e_publico: boolean;
  whatsapp_status?: 'desconectado' | 'qrcode' | 'conectado';
  whatsapp_numero?: string;
  whatsapp?: string;
  instagram?: string;
  instagram_perfil?: string;
  maps_url?: string;
  endereco?: string;
  vip_club_ativo?: boolean;
  cidade?: string;
  estado?: string;
  horario_abertura?: string;
  horario_fechamento?: string;
  foto_capa?: string;
  foto_capa_url?: string;
  logo?: string;
  logo_url?: string;
  asaas_id?: string;
  modulo_split_asaas?: boolean;
  split_taxa_tipo?: 'fixa' | 'percentual';
  split_taxa_valor?: number;
  asaas_wallet_id?: string;
  pix_chave_repasse?: string;
  pix_tipo_chave?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  banco_nome?: string;
  canal_captura_principal?: 'display_pix' | 'tap_phone' | 'smart_pos';
  solicitou_maquininha?: boolean;
  maquininha_modelo?: string;
  // Campos de Governança e Isenção de Split
  split_ativo?: boolean;
  split_carencia_tipo?: 'dias' | 'transacoes' | 'isento_vitalicio';
  split_dias_gratis?: number;
  split_data_ativacao?: string;
  split_franquia_transacoes_mensal?: number;
  split_contador_mes_atual?: number;
  split_taxa_transacao?: number;
  split_mensalidade_modulo?: number;
  templates_whatsapp?: Record<string, { ativo?: boolean; texto: string }>;
  created?: string;
  updated?: string;
}

/**
 * Interface da coleção 'terminais_pagamento' (TEF Web / Smart Link e PWA Maquininha)
 */
export interface TerminalPagamento {
  id: string;
  collectionId?: string;
  collectionName?: string;
  barbearia: string;
  identificador: string;
  tipo_terminal: 'tef_smartlink' | 'pwa_maquininha';
  codigo_pareamento: string;
  status: 'online' | 'offline' | 'aguardando_pagamento';
  cobranca_ativa?: string;
  expand?: {
    barbearia?: Barbearia;
    cobranca_ativa?: any;
  };
  created?: string;
  updated?: string;
}

/**
 * Interface da coleção 'categorias_servicos'
 */
export interface CategoriaServico {
  id: string;
  barbearia: string;
  nome: string;
  ordem?: number;
  icone?: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
}

/**
 * Interface da coleção 'assinaturas_vip'
 */
export interface AssinaturaVip {
  id: string;
  barbearia: string;
  cliente_telefone: string;
  cliente_nome?: string;
  ativo: boolean;
  plano_nome?: string;
  servicos_inclusos?: string[];
  asaas_id?: string;
  created?: string;
  updated?: string;
}

/**
 * Interface representativa da coleção 'users' / 'usuarios'
 */
export interface Usuario {
  id: string;
  email: string;
  name: string;
  nome?: string;
  barbearia_id?: string;
  papel: 'superadmin' | 'dono' | 'gerente' | 'barbeiro' | 'cliente';
  telefone?: string;
  status: 'ativo' | 'bloqueado' | 'pendente';
  taxa_comissao?: number;
  pode_acessar_admin: boolean;
  avatar?: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
}

/**
 * Interface da coleção 'servicos' (Módulo 02)
 */
export interface Servico {
  id: string;
  barbearia_id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  categoria: 'cabelo' | 'barba' | 'combos' | 'tratamento' | 'clube' | string;
  categoria_id?: string;
  ativo: boolean;
  descricao?: string;
  destaque?: boolean;
  foto?: string;
  foto_url?: string;
  asaas_id?: string;
  comissao_personalizada_ativa?: boolean;
  comissao_tipo?: 'padrao_barbeiro' | 'porcentagem_fixa' | 'valor_fixo';
  comissao_valor?: number;
  created?: string;
  updated?: string;
}

/**
 * Interface da coleção 'profissionais' (Módulo 02)
 */
export interface Profissional {
  id: string;
  barbearia_id: string;
  nome: string;
  apelido?: string;
  telefone?: string;
  taxa_comissao: number;
  ativo: boolean;
  tipo_atendimento: 'agenda' | 'ordem_chegada' | 'ambos';
  aceita_clube: boolean;
  servicos_ids: string[];
  avatar_url?: string;
  asaas_id?: string;
  asaas_account_id?: string;
  asaas_wallet_id?: string;
  porcentagem_comissao?: number;
  cpf_cnpj?: string;
  pin?: string;
  pin_acesso?: string;
  pix_tipo?: string;
  pix_chave?: string;
  pix_banco?: string;
  pix_ultima_atualizacao?: string;
  split_status?: 'pendente' | 'ativo' | 'recusado';
  created?: string;
  updated?: string;
}

/**
 * Interface da coleção 'agendamentos' (Módulo 03)
 */
export interface Agendamento {
  id: string;
  barbearia_id: string;
  barbeiro_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  servicos_ids: string[];
  data: string; // Formato YYYY-MM-DD
  horario: string; // Formato HH:mm
  duracao_total_minutos: number;
  valor_total: number;
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
  observacoes?: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
  // Campos expandidos opcionais para visualização
  expand?: {
    barbeiro_id?: Profissional;
    barbearia_id?: Barbearia;
  };
}

/**
 * Interface da coleção 'bloqueios_horario' (Módulo 03)
 */
export interface BloqueioHorario {
  id: string;
  barbearia_id: string;
  barbeiro_id: string; // ID do profissional ou 'todos'
  data: string; // Formato YYYY-MM-DD
  horario_inicio: string; // Formato HH:mm
  horario_fim: string; // Formato HH:mm
  motivo: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
}

/**
 * Interface da coleção 'produtos' (Módulo 04)
 */
export interface Produto {
  id: string;
  barbearia_id: string;
  nome: string;
  categoria: 'cabelo' | 'barba' | 'bebidas' | 'cuidados' | 'acessorios';
  preco_venda: number;
  preco_custo: number;
  estoque_atual: number;
  estoque_minimo: number;
  codigo_barras?: string;
  ativo: boolean;
  descricao?: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
}

export interface ItemServicoVenda {
  id: string;
  nome: string;
  preco: number;
  barbeiro_id?: string;
}

export interface ItemProdutoVenda {
  id: string;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  subtotal: number;
}

/**
 * Interface da coleção 'vendas_balcao' (Módulo 04)
 */
export interface VendaBalcao {
  id: string;
  barbearia_id: string;
  agendamento_id?: string;
  barbeiro_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  itens_servicos: ItemServicoVenda[];
  itens_produtos: ItemProdutoVenda[];
  subtotal_servicos: number;
  subtotal_produtos: number;
  desconto: number;
  acrescimo: number;
  valor_total: number;
  forma_pagamento: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'misto' | 'outros';
  status_pagamento: 'pago' | 'pendente' | 'cancelado';
  observacoes?: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
  expand?: {
    barbeiro_id?: Profissional;
    agendamento_id?: Agendamento;
  };
}

/**
 * Interface da coleção 'planos_assinatura' (Módulo 05)
 */
export interface PlanoAssinatura {
  id: string;
  barbearia_id: string;
  nome: string;
  valor_mensal: number;
  limite_cortes_mes: number; // 0 para ilimitado, ou cota fixa ex: 4
  permite_barba: boolean;
  servicos_inclusos: string[]; // array de IDs de serviços com 100% de desconto
  dias_permitidos: number[]; // array de inteiros [1,2,3,4] para dias da semana
  barbeiros_permitidos: string[]; // array de IDs de barbeiros que atendem o plano
  ativo: boolean;
  link_mercado_pago?: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
}

/**
 * Interface da coleção 'clientes' (Módulo 05)
 */
export interface Cliente {
  id: string;
  barbearia_id: string;
  nome: string;
  telefone: string;
  email?: string;
  observacoes?: string;
  total_visitas: number;
  total_gasto: number;
  plano_assinatura_id?: string;
  status_assinatura: 'ativo' | 'atrasado' | 'vencido' | 'cancelado' | 'sem_plano';
  data_vencimento?: string; // Formato YYYY-MM-DD
  cortes_utilizados_mes: number;
  asaas_id?: string;
  created?: string;
  updated?: string;
  expand?: {
    plano_assinatura_id?: PlanoAssinatura;
    barbearia_id?: Barbearia;
  };
}

/**
 * Serviço de Autenticação e Gestão de Sessão do Módulo 01
 */
export const authService = {
  /**
   * Autentica o usuário com email e senha na coleção nativa de auth
   */
  async login(email: string, pass: string): Promise<{ user: Usuario; barbearia: Barbearia | null }> {
    const authData = await pb.collection('users').authWithPassword<Usuario>(email, pass);
    const user = authData.record;

    let barbearia: Barbearia | null = null;
    if (user.barbearia_id) {
      try {
        barbearia = await pb.collection('barbearias').getOne<Barbearia>(user.barbearia_id);
      } catch (err) {
        console.warn('Não foi possível obter dados da barbearia vinculada:', err);
      }
    }

    return { user, barbearia };
  },

  /**
   * Encerra a sessão ativa
   */
  logout(): void {
    pb.authStore.clear();
  },

  /**
   * Retorna o usuário atualmente logado (se houver)
   */
  getCurrentUser(): Usuario | null {
    if (pb.authStore.isValid && pb.authStore.record) {
      return pb.authStore.record as unknown as Usuario;
    }
    return null;
  },

  /**
   * Busca a barbearia ativa pelo ID
   */
  async getBarbearia(barbeariaId: string): Promise<Barbearia | null> {
    try {
      return await pb.collection('barbearias').getOne<Barbearia>(barbeariaId);
    } catch (err) {
      console.error('Erro ao carregar barbearia:', err);
      return null;
    }
  },

  /**
   * Verifica se a sessão atual do PocketBase é válida
   */
  isAuthValid(): boolean {
    return pb.authStore.isValid;
  },
};

/**
 * Serviço de Gestão de Barbearias (Módulo 01 & Vitrine Pública)
 */
export const barbeariasService = {
  /**
   * Busca os dados públicos da barbearia através do seu slug (ex: 'zero-grau')
   */
  async getBySlug(slug: string): Promise<Barbearia | null> {
    try {
      const cleanSlug = slug.trim().toLowerCase();
      const records = await pb.collection('barbearias').getFullList<Barbearia>({
        filter: `slug = '${cleanSlug}'`,
      });
      return records.length > 0 ? records[0] : null;
    } catch (err) {
      console.warn(`Erro ao buscar barbearia pelo slug (${slug}):`, err);
      return null;
    }
  },

  /**
   * Busca barbearia por ID
   */
  async getOne(id: string): Promise<Barbearia | null> {
    try {
      return await pb.collection('barbearias').getOne<Barbearia>(id);
    } catch (err) {
      console.warn(`Erro ao buscar barbearia por ID (${id}):`, err);
      return null;
    }
  },

  /**
   * Lista todas as barbearias disponíveis
   */
  async list(): Promise<Barbearia[]> {
    return await pb.collection('barbearias').getFullList<Barbearia>({
      sort: 'nome',
    });
  },

  /**
   * Atualiza dados de uma barbearia
   */
  async update(id: string, data: Partial<Barbearia>): Promise<Barbearia> {
    return await pb.collection('barbearias').update<Barbearia>(id, data);
  },

  /**
   * Cria uma nova barbearia no PocketBase
   */
  async create(data: Partial<Barbearia>): Promise<Barbearia> {
    const created = await pb.collection('barbearias').create<Barbearia>(data);
    // Provisiona instância Evolution + templates pré-definidos automaticamente no backend
    evolutionApi.seedTenant(created.id).catch(() => {});
    return created;
  },

  /**
   * Remove uma barbearia
   */
  async delete(id: string): Promise<boolean> {
    return await pb.collection('barbearias').delete(id);
  },

  /**
   * Atualiza o status operacional e de assinatura da barbearia
   */
  async updateStatus(
    id: string,
    status: Barbearia['status'],
    statusAssinatura?: Barbearia['status_assinatura']
  ): Promise<Barbearia> {
    const payload: Partial<Barbearia> = { status };
    if (statusAssinatura) payload.status_assinatura = statusAssinatura;
    return await pb.collection('barbearias').update<Barbearia>(id, payload);
  },
};

/**
 * Serviço de Gestão de Serviços (Módulo 02)
 */
export const servicosService = {
  async list(barbeariaId: string): Promise<Servico[]> {
    return await pb.collection('servicos').getFullList<Servico>({
      filter: `barbearia_id = '${barbeariaId}'`,
      sort: 'categoria,nome',
    });
  },

  async create(data: {
    barbearia_id: string;
    nome: string;
    preco: number;
    duracao_minutos: number;
    categoria: string;
    ativo: boolean;
    descricao?: string;
    destaque?: boolean;
    foto_url?: string;
    foto?: string;
    comissao_personalizada_ativa?: boolean;
    comissao_tipo?: 'padrao_barbeiro' | 'porcentagem_fixa' | 'valor_fixo';
    comissao_valor?: number;
  }): Promise<Servico> {
    return await pb.collection('servicos').create<Servico>(data);
  },

  async update(id: string, data: Partial<Servico>): Promise<Servico> {
    return await pb.collection('servicos').update<Servico>(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('servicos').delete(id);
  },
};

/**
 * Serviço de Gestão de Profissionais (Módulo 02)
 */
export const profissionaisService = {
  async list(barbeariaId: string): Promise<Profissional[]> {
    return await pb.collection('profissionais').getFullList<Profissional>({
      filter: `barbearia_id = '${barbeariaId}'`,
      sort: 'nome',
    });
  },

  async create(data: {
    barbearia_id: string;
    nome: string;
    apelido?: string;
    telefone?: string;
    taxa_comissao: number;
    ativo: boolean;
    tipo_atendimento: 'agenda' | 'ordem_chegada' | 'ambos';
    aceita_clube: boolean;
    servicos_ids: string[];
    avatar_url?: string;
    avatar?: string;
  }): Promise<Profissional> {
    return await pb.collection('profissionais').create<Profissional>(data);
  },

  async update(id: string, data: Partial<Profissional>): Promise<Profissional> {
    return await pb.collection('profissionais').update<Profissional>(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('profissionais').delete(id);
  },
};

/**
 * Serviço de Categorias de Serviços (Módulo 02)
 */
export const categoriasService = {
  async list(barbeariaId: string): Promise<CategoriaServico[]> {
    try {
      return await pb.collection('categorias_servicos').getFullList<CategoriaServico>({
        filter: `barbearia = '${barbeariaId}' || barbearia = ''`,
        sort: 'ordem,nome',
      });
    } catch {
      return await pb.collection('categorias_servicos').getFullList<CategoriaServico>({
        sort: 'ordem,nome',
      }).catch(() => []);
    }
  },

  async create(data: {
    barbearia: string;
    nome: string;
    icone?: string;
    ordem?: number;
  }): Promise<CategoriaServico> {
    return await pb.collection('categorias_servicos').create<CategoriaServico>(data);
  },

  async update(id: string, data: Partial<CategoriaServico>): Promise<CategoriaServico> {
    return await pb.collection('categorias_servicos').update<CategoriaServico>(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('categorias_servicos').delete(id);
  },
};

/**
 * Serviço de Gestão de Agendamentos (Módulo 03)
 */
export const agendamentosService = {
  async list(barbeariaId: string, data?: string, barbeiroId?: string): Promise<Agendamento[]> {
    const filters: string[] = [`barbearia_id = '${barbeariaId}'`];
    if (data) {
      filters.push(`data = '${data}'`);
    }
    if (barbeiroId && barbeiroId !== 'todos') {
      filters.push(`barbeiro_id = '${barbeiroId}'`);
    }

    return await pb.collection('agendamentos').getFullList<Agendamento>({
      filter: filters.join(' && '),
      sort: 'data,horario',
      expand: 'barbeiro_id,barbearia_id',
    });
  },

  async create(data: {
    barbearia_id: string;
    barbeiro_id: string;
    cliente_nome: string;
    cliente_telefone: string;
    servicos_ids: string[];
    data: string;
    horario: string;
    duracao_total_minutos: number;
    valor_total: number;
    status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
    observacoes?: string;
  }): Promise<Agendamento> {
    const created = await pb.collection('agendamentos').create<Agendamento>(data, {
      expand: 'barbeiro_id,barbearia_id',
    });
    evolutionApi.notifyAgendamento(created.id, 'confirmacao_agendamento').catch(() => {});
    return created;
  },

  async update(id: string, data: Partial<Agendamento>): Promise<Agendamento> {
    return await pb.collection('agendamentos').update<Agendamento>(id, data, {
      expand: 'barbeiro_id,barbearia_id',
    });
  },

  async updateStatus(id: string, status: Agendamento['status']): Promise<Agendamento> {
    const updated = await pb.collection('agendamentos').update<Agendamento>(id, { status }, {
      expand: 'barbeiro_id,barbearia_id',
    });
    if (status === 'cancelado') {
      evolutionApi.notifyAgendamento(id, 'cancelamento_agendamento').catch(() => {});
    }
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('agendamentos').delete(id);
  },
};

/**
 * Serviço de Bloqueios de Horário (Módulo 03)
 */
export const bloqueiosService = {
  async list(barbeariaId: string, data?: string, barbeiroId?: string): Promise<BloqueioHorario[]> {
    const filters: string[] = [`barbearia_id = '${barbeariaId}'`];
    if (data) {
      filters.push(`data = '${data}'`);
    }
    if (barbeiroId && barbeiroId !== 'todos') {
      filters.push(`(barbeiro_id = '${barbeiroId}' || barbeiro_id = 'todos')`);
    }

    return await pb.collection('bloqueios_horario').getFullList<BloqueioHorario>({
      filter: filters.join(' && '),
      sort: 'horario_inicio',
    });
  },

  async create(data: {
    barbearia_id: string;
    barbeiro_id: string;
    data: string;
    horario_inicio: string;
    horario_fim: string;
    motivo: string;
  }): Promise<BloqueioHorario> {
    return await pb.collection('bloqueios_horario').create<BloqueioHorario>(data);
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('bloqueios_horario').delete(id);
  },
};

/**
 * Serviço de Gestão de Produtos e Estoque (Módulo 04)
 */
export const produtosService = {
  async list(barbeariaId: string): Promise<Produto[]> {
    return await pb.collection('produtos').getFullList<Produto>({
      filter: `barbearia_id = '${barbeariaId}'`,
      sort: 'categoria,nome',
    });
  },

  async create(data: Omit<Produto, 'id' | 'created' | 'updated'>): Promise<Produto> {
    return await pb.collection('produtos').create<Produto>(data);
  },

  async update(id: string, data: Partial<Produto>): Promise<Produto> {
    return await pb.collection('produtos').update<Produto>(id, data);
  },

  async adjustStock(id: string, delta: number): Promise<Produto> {
    const item = await pb.collection('produtos').getOne<Produto>(id);
    const novoEstoque = Math.max(0, (item.estoque_atual || 0) + delta);
    return await pb.collection('produtos').update<Produto>(id, { estoque_atual: novoEstoque });
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('produtos').delete(id);
  },
};

/**
 * Serviço de Vendas Balcão e Fecho de Comanda (Módulo 04)
 */
export const vendasBalcaoService = {
  async list(barbeariaId: string): Promise<VendaBalcao[]> {
    return await pb.collection('vendas_balcao').getFullList<VendaBalcao>({
      filter: `barbearia_id = '${barbeariaId}'`,
      sort: '-created',
      expand: 'barbeiro_id,agendamento_id',
    });
  },

  async fecharComanda(dados: {
    barbearia_id: string;
    agendamento_id?: string;
    barbeiro_id?: string;
    cliente_nome: string;
    cliente_telefone?: string;
    itens_servicos: ItemServicoVenda[];
    itens_produtos: ItemProdutoVenda[];
    subtotal_servicos: number;
    subtotal_produtos: number;
    desconto: number;
    acrescimo: number;
    valor_total: number;
    forma_pagamento: VendaBalcao['forma_pagamento'];
    status_pagamento: VendaBalcao['status_pagamento'];
    observacoes?: string;
  }): Promise<VendaBalcao> {
    // 1. Sanitiza os dados para o PocketBase, tratando campos opcionais de relação e arrays
    const payload: Record<string, any> = {
      barbearia_id: dados.barbearia_id,
      cliente_nome: dados.cliente_nome.trim(),
      itens_servicos: Array.isArray(dados.itens_servicos) ? dados.itens_servicos : [],
      itens_produtos: Array.isArray(dados.itens_produtos) ? dados.itens_produtos : [],
      subtotal_servicos: Number(dados.subtotal_servicos) || 0,
      subtotal_produtos: Number(dados.subtotal_produtos) || 0,
      desconto: Number(dados.desconto) || 0,
      acrescimo: Number(dados.acrescimo) || 0,
      valor_total: Number(dados.valor_total) || 0,
      forma_pagamento: dados.forma_pagamento || 'pix',
      status_pagamento: dados.status_pagamento || 'pago',
    };

    if (dados.cliente_telefone && dados.cliente_telefone.trim()) {
      payload.cliente_telefone = dados.cliente_telefone.trim();
    }

    if (dados.observacoes && dados.observacoes.trim()) {
      payload.observacoes = dados.observacoes.trim();
    }

    // Apenas vincula barbeiro_id se houver um ID válido
    if (dados.barbeiro_id && dados.barbeiro_id.trim() !== '') {
      payload.barbeiro_id = dados.barbeiro_id.trim();
    }

    // Apenas vincula agendamento_id se houver um ID válido de agendamento (evita erro na venda avulsa direta de balcão)
    const hasAgendamento = Boolean(dados.agendamento_id && dados.agendamento_id.trim() !== '');
    if (hasAgendamento) {
      payload.agendamento_id = dados.agendamento_id!.trim();
    }

    // Configura expansões válidas
    const expands: string[] = [];
    if (payload.barbeiro_id) expands.push('barbeiro_id');
    if (payload.agendamento_id) expands.push('agendamento_id');

    // 2. Cria o registro na coleção vendas_balcao
    const venda = await pb.collection('vendas_balcao').create<VendaBalcao>(
      payload as any,
      expands.length > 0 ? { expand: expands.join(',') } : undefined
    );

    // 3. Se a venda originou de um agendamento real, atualiza o status para 'concluido'
    if (hasAgendamento) {
      try {
        await pb.collection('agendamentos').update(dados.agendamento_id!.trim(), {
          status: 'concluido',
        });
      } catch (err) {
        console.warn('Falha ao atualizar status do agendamento para concluido:', err);
      }
    }

    // 4. Abate as unidades vendidas do estoque físico em produtos
    for (const prodItem of payload.itens_produtos) {
      if (prodItem.id && prodItem.quantidade > 0) {
        try {
          await produtosService.adjustStock(prodItem.id, -prodItem.quantidade);
        } catch (err) {
          console.warn(`Falha ao abater estoque do produto ${prodItem.id}:`, err);
        }
      }
    }

    return venda;
  },
};

/**
 * Serviço de Gestão de Planos de Assinatura (Módulo 05)
 */
export const planosService = {
  async list(barbeariaId: string): Promise<PlanoAssinatura[]> {
    return await pb.collection('planos_assinatura').getFullList<PlanoAssinatura>({
      filter: `barbearia_id = '${barbeariaId}'`,
      sort: 'nome',
    });
  },

  async getOne(id: string): Promise<PlanoAssinatura> {
    return await pb.collection('planos_assinatura').getOne<PlanoAssinatura>(id);
  },

  async create(data: Omit<PlanoAssinatura, 'id' | 'created' | 'updated'>): Promise<PlanoAssinatura> {
    return await pb.collection('planos_assinatura').create<PlanoAssinatura>(data);
  },

  async update(id: string, data: Partial<PlanoAssinatura>): Promise<PlanoAssinatura> {
    return await pb.collection('planos_assinatura').update<PlanoAssinatura>(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('planos_assinatura').delete(id);
  },
};

/**
 * Serviço de Gestão da Base de Clientes (Módulo 05)
 */
export const clientesService = {
  async list(barbeariaId: string, search?: string, statusAssinatura?: string): Promise<Cliente[]> {
    const filters: string[] = [`barbearia_id = '${barbeariaId}'`];
    if (statusAssinatura && statusAssinatura !== 'todos') {
      filters.push(`status_assinatura = '${statusAssinatura}'`);
    }

    const list = await pb.collection('clientes').getFullList<Cliente>({
      filter: filters.join(' && '),
      sort: 'nome',
      expand: 'plano_assinatura_id',
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const qDigits = search.replace(/\D/g, '');
      return list.filter((c) => {
        const matchNome = (c.nome || '').toLowerCase().includes(q);
        const matchEmail = (c.email || '').toLowerCase().includes(q);
        const cDigits = (c.telefone || '').replace(/\D/g, '');
        const matchTel = qDigits ? cDigits.includes(qDigits) : false;
        return matchNome || matchEmail || matchTel;
      });
    }

    return list;
  },

  async getByTelefone(barbeariaId: string, telefone: string): Promise<Cliente | null> {
    const clean = telefone.replace(/\D/g, '');
    if (!clean || clean.length < 8) return null;
    try {
      const list = await pb.collection('clientes').getFullList<Cliente>({
        filter: `barbearia_id = '${barbeariaId}'`,
        expand: 'plano_assinatura_id',
      });
      const found = list.find((c) => {
        const cClean = (c.telefone || '').replace(/\D/g, '');
        return (
          cClean === clean ||
          (cClean.length >= 8 &&
            clean.length >= 8 &&
            (cClean.endsWith(clean) || clean.endsWith(cClean)))
        );
      });
      return found || null;
    } catch (err) {
      console.error('Erro ao buscar cliente por telefone:', err);
      return null;
    }
  },

  async create(data: Partial<Cliente> & { barbearia_id: string; nome: string; telefone: string }): Promise<Cliente> {
    const payload = {
      barbearia_id: data.barbearia_id,
      nome: data.nome.trim(),
      telefone: data.telefone.trim(),
      email: data.email?.trim() || '',
      observacoes: data.observacoes?.trim() || '',
      total_visitas: Number(data.total_visitas) || 0,
      total_gasto: Number(data.total_gasto) || 0,
      plano_assinatura_id: data.plano_assinatura_id || null,
      status_assinatura: data.status_assinatura || 'sem_plano',
      data_vencimento: data.data_vencimento || '',
      cortes_utilizados_mes: Number(data.cortes_utilizados_mes) || 0,
    };
    return await pb.collection('clientes').create<Cliente>(payload as any, {
      expand: 'plano_assinatura_id',
    });
  },

  async update(id: string, data: Partial<Cliente>): Promise<Cliente> {
    return await pb.collection('clientes').update<Cliente>(id, data, {
      expand: 'plano_assinatura_id',
    });
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('clientes').delete(id);
  },

  async incrementarCorte(clienteId: string): Promise<Cliente> {
    const cliente = await pb.collection('clientes').getOne<Cliente>(clienteId);
    const novoCortes = (cliente.cortes_utilizados_mes || 0) + 1;
    return await pb.collection('clientes').update<Cliente>(
      clienteId,
      { cortes_utilizados_mes: novoCortes },
      { expand: 'plano_assinatura_id' }
    );
  },

  async registrarAtendimento(clienteId: string, valorPago: number, teveCorteVip: boolean): Promise<Cliente> {
    const cliente = await pb.collection('clientes').getOne<Cliente>(clienteId);
    const novoTotalVisitas = (cliente.total_visitas || 0) + 1;
    const novoTotalGasto = Number(((cliente.total_gasto || 0) + valorPago).toFixed(2));
    const updateData: Partial<Cliente> = {
      total_visitas: novoTotalVisitas,
      total_gasto: novoTotalGasto,
    };
    if (teveCorteVip) {
      updateData.cortes_utilizados_mes = (cliente.cortes_utilizados_mes || 0) + 1;
    }
    return await pb.collection('clientes').update<Cliente>(clienteId, updateData, {
      expand: 'plano_assinatura_id',
    });
  },
};

/**
 * Interface do Resultado da Validação VIP
 */
export interface ValidacaoVipResult {
  isVip: boolean;
  cliente: Cliente | null;
  plano: PlanoAssinatura | null;
  elegivel: boolean;
  motivoIneligibilidade?: string;
  servicosCobertos: string[]; // array de IDs de serviços cobertos a R$ 0,00
  permiteBarba: boolean;
  cortesRestantes: number | null; // null se ilimitado
  limiteIlimitado: boolean;
}

/**
 * Motor de Elegibilidade VIP (Regras de Validação do Módulo 05)
 * 1. Verifica se status_assinatura == 'ativo' e data_vencimento >= hoje.
 * 2. Verifica se o dia atual/agendado está em dias_permitidos.
 * 3. Verifica se o barbeiro atende pelo plano (barbeiros_permitidos).
 * 4. Se o limite mensal for maior que 0, verifica se cortes_utilizados_mes < limite_cortes_mes.
 * 5. Se todas as condições baterem, o serviço incluso sai a R$ 0,00.
 */
export function validarElegibilidadeVip(
  cliente: Cliente | null,
  plano: PlanoAssinatura | null,
  options?: {
    dataIso?: string; // Formato YYYY-MM-DD (padrão: hoje local)
    barbeiroId?: string;
  }
): ValidacaoVipResult {
  if (!cliente || !cliente.plano_assinatura_id || !plano) {
    return {
      isVip: false,
      cliente,
      plano: null,
      elegivel: false,
      motivoIneligibilidade: 'Cliente não possui plano de assinatura VIP vinculado.',
      servicosCobertos: [],
      permiteBarba: false,
      cortesRestantes: null,
      limiteIlimitado: false,
    };
  }

  // 1. Status e Data de Vencimento
  if (cliente.status_assinatura !== 'ativo') {
    return {
      isVip: true,
      cliente,
      plano,
      elegivel: false,
      motivoIneligibilidade: `Assinatura com status '${cliente.status_assinatura}'. Regularize a assinatura para usufruir dos benefícios.`,
      servicosCobertos: [],
      permiteBarba: !!plano.permite_barba,
      cortesRestantes: 0,
      limiteIlimitado: plano.limite_cortes_mes === 0,
    };
  }

  // Hoje no fuso local no formato YYYY-MM-DD
  const hojeStr = new Date().toLocaleDateString('en-CA');
  const dataReferencia = options?.dataIso || hojeStr;

  if (cliente.data_vencimento && cliente.data_vencimento.trim() !== '') {
    if (cliente.data_vencimento < hojeStr) {
      return {
        isVip: true,
        cliente,
        plano,
        elegivel: false,
        motivoIneligibilidade: `Assinatura vencida em ${cliente.data_vencimento}.`,
        servicosCobertos: [],
        permiteBarba: !!plano.permite_barba,
        cortesRestantes: 0,
        limiteIlimitado: plano.limite_cortes_mes === 0,
      };
    }
  }

  // 2. Dias Permitidos
  if (plano.dias_permitidos && Array.isArray(plano.dias_permitidos) && plano.dias_permitidos.length > 0) {
    // Extrai o dia da semana da data de referência
    const [ano, mes, dia] = dataReferencia.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemanaJs = dataObj.getDay(); // 0 = Domingo, 1 = Segunda, 2 = Terça... 6 = Sábado
    // Aceita tanto convenção 0..6 quanto 1..7 (onde 7 = Domingo)
    const diaPermitido =
      plano.dias_permitidos.includes(diaSemanaJs) ||
      (diaSemanaJs === 0 && plano.dias_permitidos.includes(7));

    if (!diaPermitido) {
      const nomesDias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const diasTexto = plano.dias_permitidos
        .map((d) => (d === 7 ? 'Domingo' : nomesDias[d] || `Dia ${d}`))
        .join(', ');
      return {
        isVip: true,
        cliente,
        plano,
        elegivel: false,
        motivoIneligibilidade: `Hoje (${nomesDias[diaSemanaJs]}) não é um dia elegível no plano. Dias permitidos: ${diasTexto}.`,
        servicosCobertos: [],
        permiteBarba: !!plano.permite_barba,
        cortesRestantes:
          plano.limite_cortes_mes > 0
            ? Math.max(0, plano.limite_cortes_mes - (cliente.cortes_utilizados_mes || 0))
            : null,
        limiteIlimitado: plano.limite_cortes_mes === 0,
      };
    }
  }

  // 3. Barbeiros Permitidos
  if (
    options?.barbeiroId &&
    options.barbeiroId.trim() !== '' &&
    plano.barbeiros_permitidos &&
    Array.isArray(plano.barbeiros_permitidos) &&
    plano.barbeiros_permitidos.length > 0
  ) {
    const barbeiroElegivel =
      plano.barbeiros_permitidos.includes(options.barbeiroId) ||
      plano.barbeiros_permitidos.includes('todos');

    if (!barbeiroElegivel) {
      return {
        isVip: true,
        cliente,
        plano,
        elegivel: false,
        motivoIneligibilidade: 'O profissional selecionado não atende pelo plano VIP.',
        servicosCobertos: [],
        permiteBarba: !!plano.permite_barba,
        cortesRestantes:
          plano.limite_cortes_mes > 0
            ? Math.max(0, plano.limite_cortes_mes - (cliente.cortes_utilizados_mes || 0))
            : null,
        limiteIlimitado: plano.limite_cortes_mes === 0,
      };
    }
  }

  // 4. Limite de Cortes no Mês
  const cortesUsados = cliente.cortes_utilizados_mes || 0;
  const isIlimitado = plano.limite_cortes_mes === 0;

  if (!isIlimitado && cortesUsados >= plano.limite_cortes_mes) {
    return {
      isVip: true,
      cliente,
      plano,
      elegivel: false,
      motivoIneligibilidade: `Cota mensal de cortes esgotada (${cortesUsados}/${plano.limite_cortes_mes} cortes já utilizados neste mês).`,
      servicosCobertos: [],
      permiteBarba: !!plano.permite_barba,
      cortesRestantes: 0,
      limiteIlimitado: false,
    };
  }

  // 5. Todas as condições aprovadas
  const cortesRestantes = isIlimitado
    ? null
    : Math.max(0, plano.limite_cortes_mes - cortesUsados);

  return {
    isVip: true,
    cliente,
    plano,
    elegivel: true,
    servicosCobertos: Array.isArray(plano.servicos_inclusos) ? plano.servicos_inclusos : [],
    permiteBarba: !!plano.permite_barba,
    cortesRestantes,
    limiteIlimitado: isIlimitado,
  };
}

/**
 * ==========================================
 * MÓDULO 05: NOTIFICAÇÕES WHATSAPP & TEMPLATES
 * ==========================================
 */

export type TipoGatilhoWhatsapp =
  | 'confirmacao_agendamento'
  | 'lembrete_horario'
  | 'cancelamento_agendamento'
  | 'pos_atendimento'
  | 'cobranca_vip'
  | 'avulso';

export type StatusMensagemWhatsapp = 'enviado' | 'entregue' | 'lido' | 'falha' | 'pendente';

export interface TemplateMensagem {
  id: string;
  barbearia_id: string;
  tipo_gatilho: TipoGatilhoWhatsapp;
  titulo: string;
  conteudo: string;
  ativo: boolean;
  variaveis_disponiveis?: string[];
  asaas_id?: string;
  created?: string;
  updated?: string;
}

export interface HistoricoMensagemWhatsapp {
  id: string;
  barbearia_id: string;
  template_id?: string;
  agendamento_id?: string;
  cliente_id?: string;
  destinatario_nome: string;
  destinatario_telefone: string;
  tipo_gatilho: TipoGatilhoWhatsapp;
  mensagem: string;
  status: StatusMensagemWhatsapp;
  erro_detalhe?: string;
  data_envio?: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
}

export const whatsappService = {
  async listTemplates(barbeariaId: string): Promise<TemplateMensagem[]> {
    return await pb.collection('templates_mensagens').getFullList<TemplateMensagem>({
      filter: `barbearia_id = '${barbeariaId}'`,
      sort: 'titulo',
    });
  },

  async updateTemplate(id: string, data: Partial<TemplateMensagem>): Promise<TemplateMensagem> {
    return await pb.collection('templates_mensagens').update<TemplateMensagem>(id, data);
  },

  async createTemplate(data: Omit<TemplateMensagem, 'id' | 'created' | 'updated'>): Promise<TemplateMensagem> {
    return await pb.collection('templates_mensagens').create<TemplateMensagem>(data);
  },

  async deleteTemplate(id: string): Promise<boolean> {
    return await pb.collection('templates_mensagens').delete(id);
  },

  async listHistorico(barbeariaId: string, filterStatus?: string): Promise<HistoricoMensagemWhatsapp[]> {
    let filter = `barbearia_id = '${barbeariaId}'`;
    if (filterStatus && filterStatus !== 'todos') {
      filter += ` && status = '${filterStatus}'`;
    }
    try {
      return await pb.collection('historico_mensagens_whatsapp').getFullList<HistoricoMensagemWhatsapp>({
        filter,
        sort: '-data_envio',
      });
    } catch (e) {
      console.warn('Tentativa com ordenação falhou, listando sem parâmetro sort:', e);
      try {
        return await pb.collection('historico_mensagens_whatsapp').getFullList<HistoricoMensagemWhatsapp>({
          filter,
        });
      } catch (innerErr) {
        console.error('Falha ao listar histórico do WhatsApp:', innerErr);
        return [];
      }
    }
  },

  async registrarEnvio(data: {
    barbearia_id: string;
    destinatario_nome: string;
    destinatario_telefone: string;
    tipo_gatilho: TipoGatilhoWhatsapp;
    mensagem: string;
    status?: StatusMensagemWhatsapp;
    template_id?: string;
    agendamento_id?: string;
    cliente_id?: string;
    erro_detalhe?: string;
    data_envio?: string;
  }): Promise<HistoricoMensagemWhatsapp> {
    const now = new Date();
    const dataEnvioFormatada = data.data_envio || `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
    
    return await pb.collection('historico_mensagens_whatsapp').create<HistoricoMensagemWhatsapp>({
      ...data,
      status: data.status || 'entregue',
      data_envio: dataEnvioFormatada,
    });
  },

  async updateStatusConexao(
    barbeariaId: string,
    status: 'desconectado' | 'qrcode' | 'conectado',
    numero?: string
  ): Promise<Barbearia> {
    return await pb.collection('barbearias').update<Barbearia>(barbeariaId, {
      whatsapp_status: status,
      whatsapp_numero: numero || '',
    });
  },

  formatPlaceholder(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      result = result.split(key).join(val || '');
    }
    return result;
  }
};

/**
 * Interface da coleção 'faturas' (Módulo 06 - SaaS & Faturamento B2B)
 */
export interface Fatura {
  id: string;
  barbearia_id: string;
  descricao?: string;
  valor: number;
  data_vencimento: string; // YYYY-MM-DD
  data_pagamento?: string; // ISO timestamp ou string
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  metodo_pagamento: 'pix' | 'cartao' | 'boleto';
  link_pagamento?: string;
  comprovante?: string;
  asaas_id?: string;
  created?: string;
  updated?: string;
}

export const faturasService = {
  async list(barbeariaId: string): Promise<Fatura[]> {
    return await pb.collection('faturas').getFullList<Fatura>({
      filter: `barbearia_id = '${barbeariaId}'`,
      sort: '-data_vencimento',
    });
  },

  async get(id: string): Promise<Fatura> {
    return await pb.collection('faturas').getOne<Fatura>(id);
  },

  async create(data: Omit<Fatura, 'id' | 'created' | 'updated'>): Promise<Fatura> {
    return await pb.collection('faturas').create<Fatura>(data);
  },

  async update(id: string, data: Partial<Fatura>): Promise<Fatura> {
    return await pb.collection('faturas').update<Fatura>(id, data);
  },

  async simularPagamento(faturaId: string, barbeariaId: string): Promise<{ fatura: Fatura; barbearia: Barbearia }> {
    const now = new Date();
    const dataPagamento = now.toISOString().replace('T', ' ').substring(0, 19);
    
    // Atualiza fatura para paga
    const faturaAtualizada = await pb.collection('faturas').update<Fatura>(faturaId, {
      status: 'pago',
      data_pagamento: dataPagamento,
    });

    // Próximo vencimento 30 dias adiante
    const proxVenc = new Date();
    proxVenc.setDate(proxVenc.getDate() + 30);
    const dataExp = proxVenc.toISOString().split('T')[0];

    // Reativa a barbearia instantaneamente (Kill Switch liberado)
    const barbeariaAtualizada = await pb.collection('barbearias').update<Barbearia>(barbeariaId, {
      status: 'ativo',
      status_assinatura: 'ativo',
      data_expiracao_plano: dataExp,
    });

    return { fatura: faturaAtualizada, barbearia: barbeariaAtualizada };
  },

  async gerarFaturaSimulada(
    barbeariaId: string,
    plano: 'starter' | 'pro' | 'enterprise',
    valor?: number
  ): Promise<Fatura> {
    const valores: Record<string, number> = {
      starter: 97.00,
      pro: 197.00,
      enterprise: 347.00,
    };
    const valFinal = valor !== undefined ? valor : (valores[plano] || 197.00);
    
    const venc = new Date();
    venc.setDate(venc.getDate() + 5);
    const dataVenc = venc.toISOString().split('T')[0];

    const fatura = await pb.collection('faturas').create<Fatura>({
      barbearia_id: barbeariaId,
      descricao: `Mensalidade Plano ${plano.toUpperCase()} — Simulação Local`,
      valor: valFinal,
      data_vencimento: dataVenc,
      status: 'pendente',
      metodo_pagamento: 'pix',
      link_pagamento: `https://pix.navillebarber.local/sim/fat_${Date.now()}`,
    });

    return fatura;
  }
};

export const saasService = {
  async updateStatusAssinatura(
    barbeariaId: string,
    status: 'ativo' | 'trial' | 'bloqueado' | 'cancelado'
  ): Promise<Barbearia> {
    return await pb.collection('barbearias').update<Barbearia>(barbeariaId, {
      status_assinatura: status,
      status: status === 'bloqueado' ? 'bloqueado' : 'ativo',
    });
  },

  async alternarBloqueioAutomatico(barbeariaId: string, ativo: boolean): Promise<Barbearia> {
    return await pb.collection('barbearias').update<Barbearia>(barbeariaId, {
      bloqueio_automatico: ativo,
    });
  },

  async updatePlanoConfig(
    barbeariaId: string,
    data: {
      plano?: string;
  plano_saas: 'starter' | 'pro' | 'elite' | 'enterprise' | 'basico' | 'vitalicio';
      limite_profissionais?: number;
      data_expiracao_plano?: string;
    }
  ): Promise<Barbearia> {
    return await pb.collection('barbearias').update<Barbearia>(barbeariaId, {
      ...data,
      max_barbeiros: data.limite_profissionais || 5,
    });
  },

  verificarKillSwitch(
    barbearia: Barbearia | null,
    faturas: Fatura[] = []
  ): {
    isBloqueado: boolean;
    motivo?: 'status_bloqueado' | 'data_expirada' | 'fatura_vencida';
    mensagem?: string;
    faturaPendente?: Fatura;
  } {
    if (!barbearia) return { isBloqueado: false };

    // 1. Bloqueio explícito por status
    if (barbearia.status === 'bloqueado' || barbearia.status_assinatura === 'bloqueado') {
      const faturaPendente = faturas.find(f => f.status === 'pendente' || f.status === 'atrasado');
      return {
        isBloqueado: true,
        motivo: 'status_bloqueado',
        mensagem: 'O acesso da barbearia foi suspenso pela administração SaaS devido à pendência de faturamento.',
        faturaPendente,
      };
    }

    // Se o bloqueio automático estiver desligado, não bloqueia por prazo
    if (barbearia.bloqueio_automatico === false) {
      return { isBloqueado: false };
    }

    const hoje = new Date().toISOString().split('T')[0];

    // 2. Data de expiração do plano expirada
    if (barbearia.data_expiracao_plano && barbearia.data_expiracao_plano < hoje) {
      const faturaPendente = faturas.find(f => f.status === 'pendente' || f.status === 'atrasado');
      return {
        isBloqueado: true,
        motivo: 'data_expirada',
        mensagem: `Sua assinatura expirou em ${barbearia.data_expiracao_plano}. Regularize a fatura para restabelecer o acesso imediatamente.`,
        faturaPendente,
      };
    }

    // 3. Fatura vencida em aberto com bloqueio automático
    const faturaVencida = faturas.find(f => 
      (f.status === 'atrasado') || 
      (f.status === 'pendente' && f.data_vencimento < hoje)
    );

    if (faturaVencida) {
      return {
        isBloqueado: true,
        motivo: 'fatura_vencida',
        mensagem: `A fatura no valor de R$ ${faturaVencida.valor.toFixed(2)} venceu em ${faturaVencida.data_vencimento}.`,
        faturaPendente: faturaVencida,
      };
    }

    return { isBloqueado: false };
  }
};

export const clubePlanosService = {
  async getOne(id: string): Promise<ClubePlano | null> {
    try {
      return await pb.collection('clube_planos').getOne<ClubePlano>(id);
    } catch {
      return null;
    }
  },
  async listar(barbeariaId: string): Promise<ClubePlano[]> {
    try {
      return await pb.collection('clube_planos').getFullList<ClubePlano>({
        filter: `barbearia = "${barbeariaId}" && ativo = true`,
        sort: 'valor_mensal',
      });
    } catch {
      return [];
    }
  }
};

export const clubeMembrosService = {
  async buscarMembro(barbeariaId: string, telefone: string): Promise<any | null> {
    try {
      const cleanPhone = telefone.replace(/\D/g, '');
      const records = await pb.collection('clube_membros').getFullList({
        filter: `barbearia = "${barbeariaId}" && (telefone ~ "${cleanPhone}" || telefone = "${cleanPhone}")`,
        expand: 'plano',
      });
      return records[0] || null;
    } catch {
      return null;
    }
  }
};



