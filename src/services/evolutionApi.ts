/**
 * Serviço de Integração Oficial com o WhatsApp via Evolution API v2
 * Opera via rotas seguras do backend (/api/whatsapp/*) protegendo a API Key no servidor,
 * com suporte opcional a credenciais customizadas no localStorage (para testes/desenvolvimento).
 */

export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  isConfigured: boolean;
  hasServerEnv?: boolean;
}

export interface EvolutionQRResponse {
  base64?: string;
  code?: string;
  pairingCode?: string;
  count?: number;
}

export interface EvolutionConnectionState {
  state: 'open' | 'close' | 'connecting';
  instanceName?: string;
  phone?: string;
  profileName?: string;
}

const STORAGE_KEY_URL = 'naville_evolution_api_url';
const STORAGE_KEY_KEY = 'naville_evolution_api_key';

let cachedServerStatus: { configured: boolean; hasServerEnv: boolean; apiUrl?: string } | null = null;

export const evolutionApi = {
  /**
   * Consulta o backend para saber se EVOLUTION_API_URL e EVOLUTION_API_KEY já estão ativas no servidor
   */
  async checkServerConfig(): Promise<{ configured: boolean; hasServerEnv: boolean; apiUrl?: string }> {
    try {
      const res = await fetch('/api/whatsapp/config-status');
      if (res.ok) {
        const data = await res.json();
        cachedServerStatus = data;
        return data;
      }
    } catch {
      // Fallback silencioso caso o servidor Node não esteja ativo em ambiente puramente estático
    }
    return { configured: false, hasServerEnv: false };
  },

  /**
   * Obtém as configurações salvas (localStorage, .env do Vite ou status do servidor)
   */
  getConfig(): EvolutionConfig {
    const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

    const envUrl = (import.meta as any).env?.VITE_EVOLUTION_API_URL || '';
    const envKey = (import.meta as any).env?.VITE_EVOLUTION_API_KEY || '';

    const apiUrl = (storedUrl || envUrl || cachedServerStatus?.apiUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (storedKey || envKey || '').trim();

    return {
      apiUrl,
      apiKey,
      hasServerEnv: Boolean(cachedServerStatus?.hasServerEnv),
      isConfigured: Boolean(cachedServerStatus?.configured || (apiUrl && apiKey))
    };
  },

  /**
   * Salva configurações customizadas opcionais no navegador
   */
  saveConfig(apiUrl: string, apiKey: string) {
    const cleanUrl = apiUrl.trim().replace(/\/+$/, '');
    const cleanKey = apiKey.trim();
    if (typeof window !== 'undefined') {
      if (cleanUrl) localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      else localStorage.removeItem(STORAGE_KEY_URL);
      if (cleanKey) localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
      else localStorage.removeItem(STORAGE_KEY_KEY);
    }
  },

  /**
   * Monta headers para o backend (anexando override apenas se configurado no navegador)
   */
  getHeaders(): HeadersInit {
    const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (storedUrl.trim()) headers['x-evolution-url'] = storedUrl.trim();
    if (storedKey.trim()) headers['x-evolution-key'] = storedKey.trim();
    return headers;
  },

  /**
   * Normaliza o nome da instância por barbearia
   */
  getInstanceName(barbeariaId: string, slug?: string): string {
    const cleanId = (barbeariaId || 'default').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanSlug = (slug || 'loja').replace(/[^a-zA-Z0-9_]/g, '');
    return `naville_${cleanSlug}_${cleanId.slice(0, 8)}`;
  },

  /**
   * Provisiona instância + templates pré-definidos para uma barbearia recém-criada ou existente
   */
  async seedTenant(barbeariaId: string): Promise<{ success: boolean; instanceName?: string; seededCount?: number; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/seed-tenant', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ barbeariaId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data?.error || `Erro HTTP ${res.status}` };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao provisionar WhatsApp da barbearia.' };
    }
  },

  /**
   * Cria ou valida a existência da instância no servidor Evolution API (via backend seguro)
   */
  async createInstance(instanceName: string, barbeariaId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/instances/create', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ instanceName, barbeariaId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success !== false) {
        return { success: true, data };
      }
      return { success: false, error: data?.error || data?.message || `Erro HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha na conexão com o servidor Evolution API.' };
    }
  },

  /**
   * Solicita o QR Code real de conexão do WhatsApp Web (via backend seguro)
   */
  async getQRCode(instanceName: string): Promise<{ success: boolean; data?: EvolutionQRResponse; error?: string }> {
    try {
      const res = await fetch(`/api/whatsapp/instances/${encodeURIComponent(instanceName)}/qrcode`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        return { success: true, data: data.data };
      }
      return { success: false, error: data?.error || data?.message || `Erro HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao conectar à instância do WhatsApp.' };
    }
  },

  /**
   * Consulta o estado atual da conexão da instância ('open', 'close', 'connecting')
   */
  async getConnectionState(instanceName: string, barbeariaId?: string): Promise<EvolutionConnectionState> {
    try {
      const qs = barbeariaId ? `?barbeariaId=${encodeURIComponent(barbeariaId)}` : '';
      const res = await fetch(`/api/whatsapp/instances/${encodeURIComponent(instanceName)}/state${qs}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) {
        return { state: 'close', instanceName };
      }
      return await res.json();
    } catch {
      return { state: 'close', instanceName };
    }
  },

  /**
   * Busca dados da instância conectada (reutilizando o endpoint de state/info do backend)
   */
  async fetchInstanceInfo(instanceName: string): Promise<{ phone?: string; profileName?: string }> {
    const state = await this.getConnectionState(instanceName);
    return { phone: state.phone, profileName: state.profileName };
  },

  /**
   * Desconecta (Logout) a sessão da instância
   */
  async logoutInstance(instanceName: string, barbeariaId?: string): Promise<boolean> {
    try {
      const qs = barbeariaId ? `?barbeariaId=${encodeURIComponent(barbeariaId)}` : '';
      const res = await fetch(`/api/whatsapp/instances/${encodeURIComponent(instanceName)}/logout${qs}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Envia uma mensagem de texto real via WhatsApp através do backend seguro
   */
  async sendTextMessage(
    instanceName: string,
    number: string,
    text: string,
    meta?: {
      barbeariaId?: string;
      destinatario_nome?: string;
      tipo_gatilho?: string;
      template_id?: string;
      agendamento_id?: string;
      cliente_id?: string;
      skipHistory?: boolean;
    }
  ): Promise<{ success: boolean; data?: any; historico?: any; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          instanceName,
          number,
          text,
          skipHistory: meta?.skipHistory ?? true,
          ...meta
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        return { success: true, data: data.data, historico: data.historico };
      }
      return { success: false, error: data?.error || data?.message || `Erro HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao enviar mensagem via Evolution API.' };
    }
  },

  /**
   * Dispara notificação automática de agendamento usando os templates configurados da barbearia
   */
  async notifyAgendamento(
    agendamentoId: string,
    tipo_gatilho:
      | 'confirmacao_agendamento'
      | 'lembrete_2h'
      | 'pagamento_pix_confirmado'
      | 'cobranca_sinal_pix'
      | 'pos_atendimento_avaliacao'
      | 'cancelamento_agendamento',
    extraVars?: Record<string, string>
  ): Promise<{ success: boolean; status?: string; erro?: string }> {
    try {
      const res = await fetch('/api/whatsapp/notify-agendamento', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ agendamentoId, tipo_gatilho, extraVars })
      });
      const data = await res.json().catch(() => ({}));
      return { success: Boolean(data?.success), status: data?.status, erro: data?.erro || data?.error };
    } catch (err: any) {
      return { success: false, erro: err?.message };
    }
  }
};
