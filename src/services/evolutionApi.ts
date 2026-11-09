/**
 * Serviço de Integração Oficial com o WhatsApp via Evolution API v2
 * Suporta instâncias isoladas por barbearia (Multi-tenant),
 * geração de QR Code real, código de pareamento, verificação de status
 * e envio de mensagens de texto com registro de histórico.
 */

export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  isConfigured: boolean;
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
}

const STORAGE_KEY_URL = 'naville_evolution_api_url';
const STORAGE_KEY_KEY = 'naville_evolution_api_key';

export const evolutionApi = {
  /**
   * Obtém as configurações salvas (priorizando localStorage e depois .env)
   */
  getConfig(): EvolutionConfig {
    const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

    const envUrl = (import.meta as any).env?.VITE_EVOLUTION_API_URL || '';
    const envKey = (import.meta as any).env?.VITE_EVOLUTION_API_KEY || '';

    const apiUrl = (storedUrl || envUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (storedKey || envKey || '').trim();

    return {
      apiUrl,
      apiKey,
      isConfigured: Boolean(apiUrl && apiKey)
    };
  },

  /**
   * Salva as configurações de conexão da Evolution API
   */
  saveConfig(apiUrl: string, apiKey: string) {
    const cleanUrl = apiUrl.trim().replace(/\/+$/, '');
    const cleanKey = apiKey.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
    }
  },

  /**
   * Helper para montar headers com autenticação
   */
  getHeaders(): HeadersInit {
    const { apiKey } = this.getConfig();
    return {
      'Content-Type': 'application/json',
      apikey: apiKey
    };
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
   * Cria ou valida a existência da instância no servidor Evolution API
   */
  async createInstance(instanceName: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const { apiUrl, isConfigured } = this.getConfig();
    if (!isConfigured) {
      return { success: false, error: 'Evolution API não configurada. Defina a URL e API Key.' };
    }

    try {
      const res = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          instanceName,
          token: `token_${instanceName}`,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          reject_call: false,
          msg_call: 'Atendimento automatizado Naville Barber.',
          groups_ignore: true,
          always_online: true,
          read_messages: false,
          read_status: false
        })
      });

      const data = await res.json().catch(() => ({}));
      // Se a instância já existe (403 ou instance already exists), consideramos sucesso para poder conectar
      if (res.ok || res.status === 403 || String(data?.message || '').includes('already exists')) {
        return { success: true, data };
      }

      return { success: false, error: data?.message || data?.error || `Erro HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha na conexão com o servidor Evolution API.' };
    }
  },

  /**
   * Solicita o QR Code real de conexão do WhatsApp Web
   */
  async getQRCode(instanceName: string): Promise<{ success: boolean; data?: EvolutionQRResponse; error?: string }> {
    const { apiUrl, isConfigured } = this.getConfig();
    if (!isConfigured) {
      return { success: false, error: 'Evolution API não configurada.' };
    }

    // Garante que a instância foi criada antes
    await this.createInstance(instanceName);

    try {
      const res = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.message || `Erro HTTP ${res.status}` };
      }

      // Normaliza retorno do base64 do QR Code (v1 vs v2)
      let base64 = data.base64 || data.qrcode?.base64;
      if (base64 && !base64.startsWith('data:image')) {
        base64 = `data:image/png;base64,${base64}`;
      }

      return {
        success: true,
        data: {
          base64,
          code: data.code || data.qrcode?.code,
          pairingCode: data.pairingCode || data.qrcode?.pairingCode,
          count: data.count || 1
        }
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao conectar à instância do WhatsApp.' };
    }
  },

  /**
   * Consulta o estado atual da conexão da instância ('open', 'close', 'connecting')
   */
  async getConnectionState(instanceName: string): Promise<EvolutionConnectionState> {
    const { apiUrl, isConfigured } = this.getConfig();
    if (!isConfigured) {
      return { state: 'close', instanceName };
    }

    try {
      const res = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!res.ok) {
        return { state: 'close', instanceName };
      }

      const data = await res.json();
      const rawState = data.instance?.state || data.state || 'close';

      return {
        state: rawState === 'open' ? 'open' : rawState === 'connecting' ? 'connecting' : 'close',
        instanceName
      };
    } catch {
      return { state: 'close', instanceName };
    }
  },

  /**
   * Busca dados da instância conectada (como número do WhatsApp emparelhado e nome)
   */
  async fetchInstanceInfo(instanceName: string): Promise<{ phone?: string; profileName?: string }> {
    const { apiUrl, isConfigured } = this.getConfig();
    if (!isConfigured) return {};

    try {
      const res = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!res.ok) return {};
      const data = await res.json();
      const inst = Array.isArray(data) ? data.find((i: any) => i.name === instanceName || i.instanceName === instanceName) : data;

      if (inst) {
        const ownerJid = inst.owner || inst.ownerJid || inst.connectionStatus?.ownerJid || '';
        const phone = ownerJid ? ownerJid.split('@')[0] : '';
        const profileName = inst.profileName || inst.name || '';
        return { phone, profileName };
      }
    } catch (e) {
      console.warn('Não foi possível obter detalhes do perfil:', e);
    }
    return {};
  },

  /**
   * Desconecta (Logout) e remove a sessão da instância
   */
  async logoutInstance(instanceName: string): Promise<boolean> {
    const { apiUrl, isConfigured } = this.getConfig();
    if (!isConfigured) return true;

    try {
      await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Envia uma mensagem de texto real via WhatsApp
   */
  async sendTextMessage(
    instanceName: string,
    number: string,
    text: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const { apiUrl, isConfigured } = this.getConfig();
    if (!isConfigured) {
      return { success: false, error: 'Servidor Evolution API não configurado.' };
    }

    // Normaliza número brasileiro (apenas dígitos, garantindo DDI 55)
    let cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length >= 10 && cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
      cleanNumber = `55${cleanNumber}`;
    }

    try {
      const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          number: cleanNumber,
          text,
          delay: 1200, // Simulação anti-ban humana
          linkPreview: false
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, data };
      }

      return { success: false, error: data?.message || data?.error || `Erro HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao enviar mensagem via Evolution API.' };
    }
  }
};

