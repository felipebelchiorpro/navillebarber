/**
 * Motor Server-Side da Evolution API v2 & Automações WhatsApp (Multi-Tenant)
 * - Protege EVOLUTION_API_KEY e EVOLUTION_API_URL no servidor
 * - Provisiona instância dedicada por barbearia + templates pré-definidos
 * - Executa envios reais de confirmação, pagamento Pix e cancelamento
 * - Roda agendador em background para Lembrete 2h antes, Pós-atendimento e Reengajamento (30d)
 */

export const DEFAULT_TEMPLATES_WHATSAPP = {
  confirmacao_agendamento: {
    ativo: true,
    texto: `Fala, {cliente}! ✂️

Seu horário com o barbeiro {barbeiro} na {barbearia} tá confirmado!

📅 Data: {data}
⏰ Horário: {hora}
💈 Serviço: {servico}

Qualquer imprevisto, avise a gente por aqui com antecedência. Te esperamos! 👊`
  },
  lembrete_2h: {
    ativo: true,
    texto: `Opa, {cliente}, tudo bem? Passando só para lembrar do seu horário hoje! ⏱️

⏰ Horário: {hora} com {barbeiro}
📍 Local: {barbearia}

Se puder chegar 5 minutinhos antes, a cadeira já tá pronta te esperando. Até já! 💈`
  },
  pagamento_pix_confirmado: {
    ativo: true,
    texto: `Olá, {cliente}! Recebemos o seu pagamento referente ao agendamento na {barbearia} com sucesso. ✅

💈 Serviço: {servico}
⏰ Horário: {data} às {hora}

Seu atendimento com {barbeiro} está 100% garantido!`
  },
  cobranca_sinal_pix: {
    ativo: true,
    texto: `Fala, {cliente}! Para garantir sua vaga na cadeira do {barbeiro} no dia {data} às {hora}, finalize o pagamento do sinal pelo Pix abaixo:

🔑 Pix Copia e Cola:
{chave_pix}

Assim que compensar, o seu horário é travado automaticamente na nossa agenda! ✂️`
  },
  pos_atendimento_avaliacao: {
    ativo: true,
    texto: `E aí, {cliente}, curtiu o visual novo? 🔥

Valeu demais pela moral e pela preferência hoje aqui na {barbearia} com o {barbeiro}!

Se puder avaliar o nosso atendimento em 5 estrelas no Google, ajuda demais a gente:
🔗 {link_agendamento}

Tmj e até a próxima! 👊`
  },
  reengajamento_sumido: {
    ativo: true,
    texto: `Fala, {cliente}! Sumiu, pô! 💈

Já faz um tempo desde o seu último corte aqui na {barbearia} com o {barbeiro}.

A cadeira já tá com saudade de você! Bora dar aquele talento no visual essa semana?

Agende seu horário direto pelo link:
🔗 {link_agendamento}

Te esperamos! 👊`
  }
};

export const DEFAULT_COLLECTION_TEMPLATES = [
  {
    tipo_gatilho: 'confirmacao_agendamento',
    titulo: 'Confirmação de Agendamento',
    conteudo:
      '💈 Olá, {cliente_nome}! Seu agendamento na *{barbearia_nome}* foi confirmado com sucesso!\n\n✂️ Profissional: {barbeiro}\n📅 Data: {data}\n⏰ Horário: {horario}\n⭐ Serviço: {servico}\n\nCaso precise remarcar, entre em contato com antecedência. Te aguardamos!',
    ativo: true,
    variaveis_disponiveis: ['{cliente_nome}', '{barbearia_nome}', '{barbeiro}', '{data}', '{horario}', '{servico}']
  },
  {
    tipo_gatilho: 'lembrete_horario',
    titulo: 'Lembrete de Horário (2h antes)',
    conteudo:
      '⏰ Fala {cliente_nome}! Passando para lembrar do seu horário hoje às *{horario}* na *{barbearia_nome}* com {barbeiro} ({servico}). Até daqui a pouco!',
    ativo: true,
    variaveis_disponiveis: ['{cliente_nome}', '{barbearia_nome}', '{barbeiro}', '{data}', '{horario}', '{servico}']
  },
  {
    tipo_gatilho: 'pos_atendimento',
    titulo: 'Agradecimento & Avaliação',
    conteudo:
      '🔥 Fala {cliente_nome}! Valeu pela presença hoje na *{barbearia_nome}*. O que achou do seu visual com {barbeiro}? Se puder nos avaliar, ficaremos muito gratos. Até a próxima!',
    ativo: true,
    variaveis_disponiveis: ['{cliente_nome}', '{barbearia_nome}', '{barbeiro}']
  },
  {
    tipo_gatilho: 'cancelamento_agendamento',
    titulo: 'Cancelamento de Agendamento',
    conteudo:
      '⚠️ Olá {cliente_nome}, informamos que seu agendamento para {data} às {horario} com {barbeiro} na *{barbearia_nome}* foi cancelado. Para reagendar um novo horário, fale conosco por aqui.',
    ativo: true,
    variaveis_disponiveis: ['{cliente_nome}', '{barbearia_nome}', '{barbeiro}', '{data}', '{horario}']
  },
  {
    tipo_gatilho: 'cobranca_vip',
    titulo: 'Aviso de Renovação Clube VIP',
    conteudo:
      '👑 Olá {cliente_nome}! Seu plano do Clube VIP na *{barbearia_nome}* vence em breve. Renove agora para continuar desfrutando de seus cortes exclusivos sem fila!',
    ativo: true,
    variaveis_disponiveis: ['{cliente_nome}', '{barbearia_nome}', '{data_vencimento}']
  }
];

/**
 * Obtém configuração da Evolution API com prioridade para variáveis de ambiente do servidor.
 * Permite override opcional vindo da requisição caso não haja variável configurada no container.
 */
export function getEvolutionConfig(override = {}) {
  const envUrl = (process.env.EVOLUTION_API_URL || process.env.VITE_EVOLUTION_API_URL || '').trim();
  const envKey = (process.env.EVOLUTION_API_KEY || process.env.VITE_EVOLUTION_API_KEY || '').trim();

  const customUrl = (override.apiUrl || '').trim();
  const customKey = (override.apiKey || '').trim();

  const apiUrl = (customUrl || envUrl).replace(/\/+$/, '');
  const apiKey = customKey || envKey;

  return {
    apiUrl,
    apiKey,
    hasServerEnv: Boolean(envUrl && envKey),
    isConfigured: Boolean(apiUrl && apiKey)
  };
}

/**
 * Extrai override opcional de headers/query/body da requisição Express.
 */
export function extractEvolutionOverride(req) {
  const apiUrl =
    req.headers?.['x-evolution-url'] ||
    req.body?.evolutionUrl ||
    req.query?.evolutionUrl ||
    '';
  const apiKey =
    req.headers?.['x-evolution-key'] ||
    req.body?.evolutionKey ||
    req.query?.evolutionKey ||
    '';
  return getEvolutionConfig({ apiUrl: String(apiUrl || ''), apiKey: String(apiKey || '') });
}

/**
 * Normaliza nome da instância isolada por barbearia.
 */
export function getInstanceName(barbeariaId, slug) {
  const cleanId = (barbeariaId || 'default').replace(/[^a-zA-Z0-9_]/g, '');
  const cleanSlug = (slug || 'loja').replace(/[^a-zA-Z0-9_]/g, '');
  return `naville_${cleanSlug}_${cleanId.slice(0, 8)}`;
}

/**
 * Normaliza telefone brasileiro garantindo DDI 55.
 */
export function normalizeBrPhone(phone) {
  let clean = String(phone || '').replace(/\D/g, '');
  if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
    clean = `55${clean}`;
  }
  return clean;
}

function evolutionHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    apikey: apiKey
  };
}

export async function createEvolutionInstance(instanceName, config) {
  if (!config?.isConfigured) {
    return { success: false, error: 'Evolution API não configurada no servidor.' };
  }

  try {
    const res = await fetch(`${config.apiUrl}/instance/create`, {
      method: 'POST',
      headers: evolutionHeaders(config.apiKey),
      body: JSON.stringify({
        instanceName,
        token: `token_${instanceName}`,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        rejectCall: false,
        msgCall: 'Atendimento automatizado Naville Barber.',
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: false,
        readStatus: false
      })
    });

    const data = await res.json().catch(() => ({}));
    const msg = JSON.stringify(data || '');
    if (res.ok || res.status === 403 || msg.toLowerCase().includes('already')) {
      return { success: true, data };
    }

    return {
      success: false,
      error: data?.response?.message?.[0] || data?.message || data?.error || `Erro HTTP ${res.status}`
    };
  } catch (err) {
    return { success: false, error: err?.message || 'Falha na conexão com a Evolution API.' };
  }
}

export async function getEvolutionQRCode(instanceName, config) {
  if (!config?.isConfigured) {
    return { success: false, error: 'Evolution API não configurada no servidor.' };
  }

  await createEvolutionInstance(instanceName, config);

  try {
    const res = await fetch(`${config.apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      headers: evolutionHeaders(config.apiKey)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.message || data?.error || `Erro HTTP ${res.status}` };
    }

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
  } catch (err) {
    return { success: false, error: err?.message || 'Erro ao conectar à instância do WhatsApp.' };
  }
}

export async function getEvolutionConnectionState(instanceName, config) {
  if (!config?.isConfigured) {
    return { state: 'close', instanceName };
  }

  try {
    const res = await fetch(`${config.apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      headers: evolutionHeaders(config.apiKey)
    });

    if (!res.ok) {
      return { state: 'close', instanceName };
    }

    const data = await res.json().catch(() => ({}));
    const rawState = data.instance?.state || data.state || 'close';

    return {
      state: rawState === 'open' ? 'open' : rawState === 'connecting' ? 'connecting' : 'close',
      instanceName
    };
  } catch {
    return { state: 'close', instanceName };
  }
}

export async function fetchEvolutionInstanceInfo(instanceName, config) {
  if (!config?.isConfigured) return {};

  try {
    const res = await fetch(
      `${config.apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      {
        method: 'GET',
        headers: evolutionHeaders(config.apiKey)
      }
    );
    if (!res.ok) return {};

    const data = await res.json().catch(() => []);
    const inst = Array.isArray(data)
      ? data.find((i) => i.name === instanceName || i.instanceName === instanceName)
      : data;

    if (inst) {
      const ownerJid = inst.owner || inst.ownerJid || inst.connectionStatus?.ownerJid || '';
      const phone = ownerJid ? ownerJid.split('@')[0] : '';
      const profileName = inst.profileName || inst.name || '';
      return { phone, profileName };
    }
  } catch (e) {
    console.warn('[WhatsApp] Aviso ao obter info da instância:', e?.message);
  }
  return {};
}

export async function logoutEvolutionInstance(instanceName, config) {
  if (!config?.isConfigured) return true;
  try {
    await fetch(`${config.apiUrl}/instance/logout/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE',
      headers: evolutionHeaders(config.apiKey)
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendEvolutionText(instanceName, number, text, config) {
  if (!config?.isConfigured) {
    return { success: false, error: 'Servidor Evolution API não configurado.' };
  }

  const cleanNumber = normalizeBrPhone(number);
  if (cleanNumber.length < 10) {
    return { success: false, error: 'Número de telefone inválido para WhatsApp.' };
  }

  try {
    const res = await fetch(`${config.apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      headers: evolutionHeaders(config.apiKey),
      body: JSON.stringify({
        number: cleanNumber,
        text,
        delay: 1200, // Simulação humana anti-ban
        linkPreview: false
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, data };
    }
    return { success: false, error: data?.message || data?.error || `Erro HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err?.message || 'Falha ao enviar mensagem via Evolution API.' };
  }
}

export function formatTemplatePlaceholders(template, vars) {
  let result = String(template || '');
  for (const [key, val] of Object.entries(vars || {})) {
    result = result.split(key).join(val ?? '');
  }
  return result;
}

/**
 * Garante instância Evolution (se configurada) + templates JSON + coleção templates_mensagens para a barbearia.
 */
export async function ensureTenantWhatsAppSetup(pb, barbeariaIdOrRecord, overrideConfig) {
  const config = overrideConfig || getEvolutionConfig();
  let barbearia =
    typeof barbeariaIdOrRecord === 'string'
      ? await pb.collection('barbearias').getOne(barbeariaIdOrRecord)
      : barbeariaIdOrRecord;

  if (!barbearia?.id) {
    throw new Error('Barbearia inválida para setup do WhatsApp.');
  }

  // 1. Garante templates JSON na própria barbearia
  const patch = {};
  if (!barbearia.templates_whatsapp || Object.keys(barbearia.templates_whatsapp).length === 0) {
    patch.templates_whatsapp = DEFAULT_TEMPLATES_WHATSAPP;
  }
  if (!barbearia.whatsapp_status) {
    patch.whatsapp_status = 'desconectado';
  }
  if (Object.keys(patch).length > 0) {
    try {
      barbearia = await pb.collection('barbearias').update(barbearia.id, patch);
    } catch (e) {
      console.warn('[WhatsApp] Aviso ao atualizar templates_whatsapp na barbearia:', e?.message);
    }
  }

  // 2. Garante registros padrão na coleção templates_mensagens
  let seededCount = 0;
  try {
    const existingTpls = await pb.collection('templates_mensagens').getFullList({
      filter: `barbearia_id = '${barbearia.id}'`
    });
    if (existingTpls.length === 0) {
      for (const tpl of DEFAULT_COLLECTION_TEMPLATES) {
        await pb.collection('templates_mensagens').create({
          barbearia_id: barbearia.id,
          ...tpl
        });
        seededCount++;
      }
    }
  } catch (e) {
    console.warn('[WhatsApp] Aviso ao semear templates_mensagens:', e?.message);
  }

  // 3. Provisiona instância isolada na Evolution API (se URL e Key configurados)
  const instanceName = getInstanceName(barbearia.id, barbearia.slug);
  let instanceResult = { skipped: true };
  if (config.isConfigured) {
    instanceResult = await createEvolutionInstance(instanceName, config);
  }

  return {
    barbearia,
    instanceName,
    seededCount,
    instanceResult
  };
}

/**
 * Grava log na coleção historico_mensagens_whatsapp com formatação padrão pt-BR.
 */
export async function logWhatsAppHistory(pb, payload) {
  const now = new Date();
  const dataEnvio = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(',', '');
  try {
    return await pb.collection('historico_mensagens_whatsapp').create({
      barbearia_id: payload.barbearia_id,
      destinatario_nome: payload.destinatario_nome || 'Cliente',
      destinatario_telefone: payload.destinatario_telefone || '',
      tipo_gatilho: payload.tipo_gatilho || 'avulso',
      mensagem: payload.mensagem || '',
      status: payload.status || 'enviado',
      template_id: payload.template_id || undefined,
      agendamento_id: payload.agendamento_id || undefined,
      cliente_id: payload.cliente_id || undefined,
      erro_detalhe: payload.erro_detalhe || undefined,
      data_envio: dataEnvio
    });
  } catch (err) {
    console.warn('[WhatsApp] Falha ao registrar histórico no PocketBase:', err?.message);
    return null;
  }
}

/**
 * Resolve o template ativo da barbearia para determinado gatilho.
 */
async function resolveTenantTemplate(pb, barbearia, triggerKey) {
  const jsonTemplates = barbearia.templates_whatsapp || {};
  const customJson = jsonTemplates[triggerKey];

  if (customJson && typeof customJson === 'object') {
    if (customJson.ativo === false) {
      return { ativo: false, texto: '' };
    }
    if (customJson.texto) {
      return { ativo: true, texto: customJson.texto };
    }
  } else if (typeof customJson === 'string' && customJson.trim()) {
    return { ativo: true, texto: customJson };
  }

  // Fallback para coleção templates_mensagens (mapeando nomes legados)
  const legacyMap = {
    lembrete_2h: 'lembrete_horario',
    pos_atendimento_avaliacao: 'pos_atendimento',
    pagamento_pix_confirmado: 'cobranca_vip'
  };
  const targetTrigger = legacyMap[triggerKey] || triggerKey;

  try {
    const tpls = await pb.collection('templates_mensagens').getFullList({
      filter: `barbearia_id = '${barbearia.id}' && (tipo_gatilho = '${triggerKey}' || tipo_gatilho = '${targetTrigger}')`
    });
    if (tpls.length > 0) {
      if (tpls[0].ativo === false) return { ativo: false, texto: '' };
      return { ativo: true, texto: tpls[0].conteudo, templateId: tpls[0].id };
    }
  } catch {}

  const fallback = DEFAULT_TEMPLATES_WHATSAPP[triggerKey];
  if (fallback) {
    return { ativo: true, texto: fallback.texto };
  }

  return { ativo: false, texto: '' };
}

/**
 * Dispara notificação WhatsApp para um agendamento existente usando o template da barbearia.
 */
export async function notifyAgendamentoWhatsApp(pb, agendamentoId, triggerKey, extraVars = {}, overrideConfig) {
  const config = overrideConfig || getEvolutionConfig();
  const agendamento = await pb.collection('agendamentos').getOne(agendamentoId);
  const barbearia = await pb.collection('barbearias').getOne(agendamento.barbearia_id);

  if (!agendamento.cliente_telefone) {
    return { success: false, skipped: true, reason: 'Agendamento sem telefone do cliente.' };
  }

  const tpl = await resolveTenantTemplate(pb, barbearia, triggerKey);
  if (!tpl.ativo || !tpl.texto) {
    return { success: false, skipped: true, reason: `Gatilho "${triggerKey}" desativado ou sem texto.` };
  }

  let barbeiroNome = 'Barbeiro';
  if (agendamento.barbeiro_id) {
    try {
      const barb = await pb.collection('profissionais').getOne(agendamento.barbeiro_id);
      barbeiroNome = barb.apelido || barb.nome || 'Barbeiro';
    } catch {}
  }

  let servicosNomes = [];
  if (Array.isArray(agendamento.servicos_ids) && agendamento.servicos_ids.length > 0) {
    try {
      const filterStr = agendamento.servicos_ids.map((sid) => `id = '${sid}'`).join(' || ');
      const srvs = await pb.collection('servicos').getFullList({ filter: filterStr });
      servicosNomes = srvs.map((s) => s.nome);
    } catch {}
  }
  const servicoTexto = agendamento.servico_nome || servicosNomes.join(', ') || 'Atendimento';

  const dataFormatada = String(agendamento.data || '').includes('-')
    ? String(agendamento.data).split('-').reverse().join('/')
    : String(agendamento.data || '');

  const appPublicUrl = (process.env.APP_PUBLIC_URL || 'https://app.navillebarber.pro').replace(/\/+$/, '');
  const linkAgendamento = `${appPublicUrl}/b/${barbearia.slug || ''}`;
  const primeiroNome = String(agendamento.cliente_nome || 'Cliente').trim().split(' ')[0];

  const vars = {
    '{cliente}': primeiroNome,
    '{cliente_nome}': agendamento.cliente_nome || primeiroNome,
    '{barbeiro}': barbeiroNome,
    '{servico}': servicoTexto,
    '{data}': dataFormatada,
    '{hora}': agendamento.horario || '',
    '{horario}': agendamento.horario || '',
    '{barbearia}': barbearia.nome || 'Barbearia',
    '{barbearia_nome}': barbearia.nome || 'Barbearia',
    '{chave_pix}': extraVars.chave_pix || barbearia.pix_chave_repasse || '',
    '{link_agendamento}': extraVars.link_agendamento || linkAgendamento,
    '{data_vencimento}': extraVars.data_vencimento || ''
  };

  const mensagemFinal = formatTemplatePlaceholders(tpl.texto, vars);
  const instanceName = getInstanceName(barbearia.id, barbearia.slug);

  let sendStatus = 'pendente';
  let erroDetalhe = '';
  let sentReal = false;

  if (config.isConfigured) {
    const conn = await getEvolutionConnectionState(instanceName, config);
    if (conn.state === 'open') {
      const sendRes = await sendEvolutionText(instanceName, agendamento.cliente_telefone, mensagemFinal, config);
      if (sendRes.success) {
        sendStatus = 'entregue';
        sentReal = true;
      } else {
        sendStatus = 'falha';
        erroDetalhe = sendRes.error || 'Erro no envio Evolution API';
      }
    } else {
      sendStatus = 'pendente';
      erroDetalhe = `Instância ${instanceName} não conectada (state=${conn.state})`;
    }
  } else {
    erroDetalhe = 'EVOLUTION_API_URL / EVOLUTION_API_KEY não configuradas no servidor';
  }

  const log = await logWhatsAppHistory(pb, {
    barbearia_id: barbearia.id,
    destinatario_nome: agendamento.cliente_nome || 'Cliente',
    destinatario_telefone: agendamento.cliente_telefone,
    tipo_gatilho: triggerKey,
    mensagem: mensagemFinal,
    status: sendStatus,
    template_id: tpl.templateId,
    agendamento_id: agendamento.id,
    erro_detalhe: erroDetalhe || undefined
  });

  return {
    success: sentReal,
    status: sendStatus,
    instanceName,
    erro: erroDetalhe || undefined,
    historicoId: log?.id
  };
}

// ============================================================
// AGENDADOR AUTOMÁTICO EM BACKGROUND (LEMBRETE 2H, PÓS, 30 DIAS)
// ============================================================

function getSaoPauloNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const minutesNow = Number(map.hour) * 60 + Number(map.minute);
  return { dateStr, minutesNow, now };
}

function parseTimeToMinutes(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

let schedulerRunning = false;

export async function runWhatsAppAutomationsCycle(pb) {
  if (schedulerRunning) return;
  const config = getEvolutionConfig();
  if (!config.isConfigured) return;

  schedulerRunning = true;
  try {
    const barbearias = await pb.collection('barbearias').getFullList({
      filter: "modulo_whatsapp = true || whatsapp_status = 'conectado'"
    });

    const { dateStr, minutesNow, now } = getSaoPauloNow();
    const appPublicUrl = (process.env.APP_PUBLIC_URL || 'https://app.navillebarber.pro').replace(/\/+$/, '');

    for (const barbearia of barbearias) {
      const instanceName = getInstanceName(barbearia.id, barbearia.slug);
      const conn = await getEvolutionConnectionState(instanceName, config);
      if (conn.state !== 'open') continue;

      // Sincroniza whatsapp_status no PocketBase caso esteja desatualizado
      if (barbearia.whatsapp_status !== 'conectado') {
        await pb.collection('barbearias').update(barbearia.id, { whatsapp_status: 'conectado' }).catch(() => {});
      }

      // Carrega histórico recente desta barbearia para evitar disparos duplicados
      let histList = [];
      try {
        histList = await pb.collection('historico_mensagens_whatsapp').getFullList({
          filter: `barbearia_id = '${barbearia.id}'`
        });
      } catch {}

      const alreadySentAgendamento = (agId, triggers) =>
        histList.some(
          (h) =>
            h.agendamento_id === agId &&
            triggers.includes(h.tipo_gatilho) &&
            h.status !== 'falha'
        );

      // 1. LEMBRETE 2 HORAS ANTES & 2. PÓS-ATENDIMENTO (agendamentos de hoje)
      let agendamentosHoje = [];
      try {
        agendamentosHoje = await pb.collection('agendamentos').getFullList({
          filter: `barbearia_id = '${barbearia.id}' && data = '${dateStr}'`
        });
      } catch {}

      for (const ag of agendamentosHoje) {
        const startMin = parseTimeToMinutes(ag.horario);
        if (startMin === null) continue;

        // 1. Lembrete 2h antes (janela de 60 a 150 minutos antes)
        if (ag.status === 'pendente' || ag.status === 'confirmado') {
          const diffBefore = startMin - minutesNow;
          if (diffBefore >= 60 && diffBefore <= 150) {
            if (!alreadySentAgendamento(ag.id, ['lembrete_2h', 'lembrete_horario'])) {
              await notifyAgendamentoWhatsApp(pb, ag.id, 'lembrete_2h', {}, config);
              await pause(1500);
            }
          }
        }

        // 2. Pós-atendimento e avaliação (45 a 180 minutos após término)
        if (ag.status === 'concluido') {
          const endMin = startMin + (Number(ag.duracao_total_minutos) || 30);
          const diffAfter = minutesNow - endMin;
          if (diffAfter >= 45 && diffAfter <= 180) {
            if (!alreadySentAgendamento(ag.id, ['pos_atendimento_avaliacao', 'pos_atendimento'])) {
              await notifyAgendamentoWhatsApp(pb, ag.id, 'pos_atendimento_avaliacao', {}, config);
              await pause(1500);
            }
          }
        }
      }

      // 3. REENGAJAMENTO CLIENTE SUMIDO (> 30 dias sem visitar) — limite anti-ban de 3 por ciclo
      try {
        const tplReengaj = await resolveTenantTemplate(pb, barbearia, 'reengajamento_sumido');
        if (tplReengaj.ativo && tplReengaj.texto) {
          const clientes = await pb.collection('clientes').getFullList({
            filter: `barbearia_id = '${barbearia.id}'`
          });
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          let sentReengaj = 0;

          for (const cli of clientes) {
            if (sentReengaj >= 3) break;
            if (!cli.telefone) continue;

            const refDateStr = cli.ultimo_atendimento || cli.updated || cli.created;
            if (!refDateStr) continue;
            const refTime = new Date(refDateStr).getTime();
            if (Number.isNaN(refTime) || now.getTime() - refTime < thirtyDaysMs) continue;

            const recentReengaj = histList.some(
              (h) =>
                (h.cliente_id === cli.id || h.destinatario_telefone === cli.telefone) &&
                h.tipo_gatilho === 'reengajamento_sumido' &&
                h.created &&
                now.getTime() - new Date(h.created).getTime() < thirtyDaysMs
            );
            if (recentReengaj) continue;

            const primeiroNome = String(cli.nome || 'Cliente').trim().split(' ')[0];
            const msg = formatTemplatePlaceholders(tplReengaj.texto, {
              '{cliente}': primeiroNome,
              '{cliente_nome}': cli.nome || primeiroNome,
              '{barbeiro}': 'nossa equipe',
              '{barbearia}': barbearia.nome || 'Barbearia',
              '{barbearia_nome}': barbearia.nome || 'Barbearia',
              '{link_agendamento}': `${appPublicUrl}/b/${barbearia.slug || ''}`
            });

            const res = await sendEvolutionText(instanceName, cli.telefone, msg, config);
            await logWhatsAppHistory(pb, {
              barbearia_id: barbearia.id,
              destinatario_nome: cli.nome || 'Cliente',
              destinatario_telefone: cli.telefone,
              tipo_gatilho: 'reengajamento_sumido',
              mensagem: msg,
              status: res.success ? 'entregue' : 'falha',
              cliente_id: cli.id,
              erro_detalhe: res.error || undefined
            });
            sentReengaj++;
            await pause(2000);
          }
        }
      } catch (errReengaj) {
        console.warn('[WhatsApp Cron] Aviso no reengajamento:', errReengaj?.message);
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Cron] Erro no ciclo automático:', err?.message);
  } finally {
    schedulerRunning = false;
  }
}

export function startWhatsAppScheduler(pb) {
  // Executa 25s após subir o servidor e depois a cada 5 minutos
  setTimeout(() => {
    runWhatsAppAutomationsCycle(pb).catch(() => {});
  }, 25 * 1000);

  return setInterval(() => {
    runWhatsAppAutomationsCycle(pb).catch(() => {});
  }, 5 * 60 * 1000);
}
