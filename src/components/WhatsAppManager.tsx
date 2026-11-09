import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Sliders,
  Clock,
  Eye,
  Check,
  CheckCheck,
  XCircle,
  HelpCircle,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Power,
  ShieldCheck,
  BatteryCharging,
  Wifi,
  Copy,
  User,
  Phone,
  FileText,
  Settings,
  Key,
  Globe
} from 'lucide-react';
import {
  Barbearia,
  TemplateMensagem,
  HistoricoMensagemWhatsapp,
  TipoGatilhoWhatsapp,
  StatusMensagemWhatsapp,
  Cliente,
  whatsappService,
  clientesService
} from '../services/pocketbase';
import { evolutionApi } from '../services/evolutionApi';
import MensagensConfigView from './MensagensConfigView';

interface WhatsAppManagerProps {
  barbearia: Barbearia;
  onBarbeariaUpdated?: (updated: Barbearia) => void;
}

type SubTab = 'emparelhamento' | 'notificacoes_auto' | 'templates' | 'historico';

const GATILHOS_LABEL: Record<TipoGatilhoWhatsapp, { label: string; cor: string; desc: string }> = {
  confirmacao_agendamento: {
    label: 'Confirmação',
    cor: '#38bdf8',
    desc: 'Disparado logo após o cliente agendar um horário'
  },
  lembrete_horario: {
    label: 'Lembrete (2h antes)',
    cor: '#fbbf24',
    desc: 'Disparado automaticamente 2 horas antes do atendimento'
  },
  cancelamento_agendamento: {
    label: 'Cancelamento',
    cor: '#f87171',
    desc: 'Disparado quando um agendamento é desmarcado'
  },
  pos_atendimento: {
    label: 'Pós-Atendimento',
    cor: '#34d399',
    desc: 'Agradecimento e solicitação de avaliação pós-corte'
  },
  cobranca_vip: {
    label: 'Renovação Clube VIP',
    cor: '#c084fc',
    desc: 'Aviso de vencimento de plano aos assinantes'
  },
  avulso: {
    label: 'Avulso / Informativo',
    cor: '#94a3b8',
    desc: 'Disparos manuais informativos ou de campanhas'
  }
};

export const WhatsAppManager: React.FC<WhatsAppManagerProps> = ({
  barbearia,
  onBarbeariaUpdated
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('emparelhamento');

  // Instância Dedicada Evolution API
  const instanceName = useMemo(() => {
    return evolutionApi.getInstanceName(barbearia?.id || 'barber', barbearia?.slug);
  }, [barbearia?.id, barbearia?.slug]);

  // Estados de Conexão WhatsApp
  const [connectionStatus, setConnectionStatus] = useState<'desconectado' | 'qrcode' | 'conectado'>(
    barbearia.whatsapp_status || 'desconectado'
  );
  const [connectedNumber, setConnectedNumber] = useState<string>(
    barbearia.whatsapp_numero || ''
  );
  const [qrCodeTimer, setQrCodeTimer] = useState<number>(45);

  // Estados de QR Code Oficial
  const [realQrCodeBase64, setRealQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState<boolean>(false);
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);

  // Estados do Modal de Configuração da Evolution API
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configApiUrl, setConfigApiUrl] = useState<string>(() => evolutionApi.getConfig().apiUrl);
  const [configApiKey, setConfigApiKey] = useState<string>(() => evolutionApi.getConfig().apiKey);
  const [isTestingConfig, setIsTestingConfig] = useState<boolean>(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados de Templates
  const [templates, setTemplates] = useState<TemplateMensagem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMensagem | null>(null);
  const [editingTitulo, setEditingTitulo] = useState<string>('');
  const [editingConteudo, setEditingConteudo] = useState<string>('');
  const [editingAtivo, setEditingAtivo] = useState<boolean>(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<boolean>(false);

  // Estados do Modal de Criação de Template
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState<boolean>(false);
  const [newTipoGatilho, setNewTipoGatilho] = useState<TipoGatilhoWhatsapp>('confirmacao_agendamento');
  const [newTitulo, setNewTitulo] = useState<string>('');
  const [newConteudo, setNewConteudo] = useState<string>('');

  // Estados de Histórico
  const [historico, setHistorico] = useState<HistoricoMensagemWhatsapp[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMensagemVisualizar, setSelectedMensagemVisualizar] = useState<HistoricoMensagemWhatsapp | null>(null);

  // Estados do Modal de Disparo Teste
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testNome, setTestNome] = useState<string>('Lucas Albuquerque');
  const [testTelefone, setTestTelefone] = useState<string>('11999998888');
  const [testTemplateId, setTestTemplateId] = useState<string>('');
  const [testMensagemCustom, setTestMensagemCustom] = useState<string>('');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testSuccess, setTestSuccess] = useState<boolean>(false);

  // Lista de Clientes para auto-preenchimento no teste
  const [clientesList, setClientesList] = useState<Cliente[]>([]);

  // Sincroniza com as props de barbearia
  useEffect(() => {
    if (barbearia.whatsapp_status) {
      setConnectionStatus(barbearia.whatsapp_status);
    }
    if (barbearia.whatsapp_numero) {
      setConnectedNumber(barbearia.whatsapp_numero);
    }
  }, [barbearia.whatsapp_status, barbearia.whatsapp_numero]);

  // Carrega templates, histórico e clientes da barbearia
  const loadData = async () => {
    try {
      const [tpls, hist, clis] = await Promise.all([
        whatsappService.listTemplates(barbearia.id).catch((err) => {
          console.warn('Falha controlada ao listar templates WhatsApp:', err);
          return [] as TemplateMensagem[];
        }),
        whatsappService.listHistorico(barbearia.id).catch((err) => {
          console.warn('Falha controlada ao listar histórico WhatsApp:', err);
          return [] as HistoricoMensagemWhatsapp[];
        }),
        clientesService.list(barbearia.id).catch((err) => {
          console.warn('Falha controlada ao listar clientes:', err);
          return [] as Cliente[];
        })
      ]);
      setTemplates(tpls);
      setHistorico(hist);
      setClientesList(clis);

      if (tpls.length > 0 && !selectedTemplate) {
        setSelectedTemplate(tpls[0]);
        setEditingTitulo(tpls[0].titulo);
        setEditingConteudo(tpls[0].conteudo);
        setEditingAtivo(tpls[0].ativo);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do WhatsApp:', err);
    }
  };

  useEffect(() => {
    if (barbearia?.id) {
      loadData();
    }
  }, [barbearia?.id]);

  // Busca o QR Code oficial da Evolution API
  const fetchOfficialQRCode = async () => {
    const config = evolutionApi.getConfig();
    if (!config.isConfigured) {
      setQrErrorMessage('A Evolution API ainda não foi configurada. Informe a URL e Chave da API.');
      setIsConfigModalOpen(true);
      return;
    }

    setIsLoadingQR(true);
    setQrErrorMessage(null);
    try {
      const res = await evolutionApi.getQRCode(instanceName);
      if (res.success && res.data) {
        setRealQrCodeBase64(res.data.base64 || null);
        setPairingCode(res.data.pairingCode || null);
        setQrCodeTimer(45);
      } else {
        setQrErrorMessage(res.error || 'Não foi possível obter o QR Code da Evolution API.');
      }
    } catch (err: any) {
      setQrErrorMessage(err?.message || 'Falha na comunicação com o servidor Evolution API.');
    } finally {
      setIsLoadingQR(false);
    }
  };

  // Timer do QR Code e auto-renovação
  useEffect(() => {
    let interval: any;
    if (connectionStatus === 'qrcode' && qrCodeTimer > 0) {
      interval = setInterval(() => {
        setQrCodeTimer((prev) => {
          if (prev <= 1) {
            // Renova automaticamente o QR Code ao expirar
            fetchOfficialQRCode();
            return 45;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [connectionStatus, qrCodeTimer]);

  // Polling de verificação de conexão real via Evolution API
  useEffect(() => {
    if (connectionStatus !== 'qrcode') return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const stateRes = await evolutionApi.getConnectionState(instanceName);
        if (!isSubscribed) return;

        if (stateRes.state === 'open') {
          // Conectado com sucesso pelo celular!
          const info = await evolutionApi.fetchInstanceInfo(instanceName);
          const finalPhone = info.phone || connectedNumber || '5511999998888';
          setConnectedNumber(finalPhone);
          setConnectionStatus('conectado');
          setRealQrCodeBase64(null);

          const updated = await whatsappService.updateStatusConexao(
            barbearia.id,
            'conectado',
            finalPhone
          );
          if (onBarbeariaUpdated) {
            onBarbeariaUpdated(updated);
          }
        }
      } catch (err) {
        console.warn('Erro na checagem de estado do WhatsApp:', err);
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [connectionStatus, instanceName, barbearia.id, connectedNumber, onBarbeariaUpdated]);

  // Ações de Conexão / Emparelhamento
  const handleStartPairing = () => {
    const config = evolutionApi.getConfig();
    if (!config.isConfigured) {
      setIsConfigModalOpen(true);
      return;
    }
    setConnectionStatus('qrcode');
    setQrCodeTimer(45);
    fetchOfficialQRCode();
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Deseja realmente desconectar a instância oficial do WhatsApp desta barbearia?')) {
      return;
    }
    try {
      await evolutionApi.logoutInstance(instanceName);
      const updated = await whatsappService.updateStatusConexao(barbearia.id, 'desconectado', '');
      setConnectionStatus('desconectado');
      setRealQrCodeBase64(null);
      setPairingCode(null);
      if (onBarbeariaUpdated) {
        onBarbeariaUpdated(updated);
      }
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    }
  };

  // Salvar e testar configurações da Evolution API
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configApiUrl.trim() || !configApiKey.trim()) {
      setConfigFeedback({ type: 'error', text: 'Preencha a URL da API e a Chave de Autenticação.' });
      return;
    }
    evolutionApi.saveConfig(configApiUrl, configApiKey);
    setConfigFeedback({ type: 'success', text: 'Configuração salva com sucesso!' });
    setTimeout(() => {
      setIsConfigModalOpen(false);
      setConfigFeedback(null);
      if (connectionStatus === 'qrcode') {
        fetchOfficialQRCode();
      }
    }, 1200);
  };

  const handleTestConfig = async () => {
    if (!configApiUrl.trim() || !configApiKey.trim()) {
      setConfigFeedback({ type: 'error', text: 'Preencha a URL e a API Key antes de testar.' });
      return;
    }
    setIsTestingConfig(true);
    setConfigFeedback(null);
    try {
      evolutionApi.saveConfig(configApiUrl, configApiKey);
      const res = await evolutionApi.createInstance('naville_ping_test');
      if (res.success) {
        setConfigFeedback({ type: 'success', text: 'Conexão com a Evolution API estabelecida com sucesso!' });
      } else {
        setConfigFeedback({ type: 'error', text: `Falha: ${res.error || 'Não foi possível autenticar.'}` });
      }
    } catch (e: any) {
      setConfigFeedback({ type: 'error', text: `Erro: ${e?.message || 'Falha na requisição.'}` });
    } finally {
      setIsTestingConfig(false);
    }
  };

  // Seleção e Edição de Template
  const handleSelectTemplate = (tpl: TemplateMensagem) => {
    setSelectedTemplate(tpl);
    setEditingTitulo(tpl.titulo);
    setEditingConteudo(tpl.conteudo);
    setEditingAtivo(tpl.ativo);
    setTemplateSaveSuccess(false);
  };

  const handleInsertVariable = (tag: string) => {
    setEditingConteudo((prev) => prev + ' ' + tag);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setIsSavingTemplate(true);
    setTemplateSaveSuccess(false);
    try {
      const updated = await whatsappService.updateTemplate(selectedTemplate.id, {
        titulo: editingTitulo,
        conteudo: editingConteudo,
        ativo: editingAtivo
      });
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTemplate(updated);
      setTemplateSaveSuccess(true);
      setTimeout(() => setTemplateSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar template:', err);
      alert('Erro ao salvar alterações no PocketBase.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleCreateNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitulo.trim() || !newConteudo.trim()) {
      alert('Preencha o título e o conteúdo do template.');
      return;
    }
    try {
      const created = await whatsappService.createTemplate({
        barbearia_id: barbearia.id,
        tipo_gatilho: newTipoGatilho,
        titulo: newTitulo.trim(),
        conteudo: newConteudo.trim(),
        ativo: true,
        variaveis_disponiveis: [
          '{cliente_nome}',
          '{barbearia_nome}',
          '{barbeiro}',
          '{data}',
          '{horario}',
          '{servico}',
          '{data_vencimento}'
        ]
      });
      setTemplates((prev) => [...prev, created]);
      setSelectedTemplate(created);
      setEditingTitulo(created.titulo);
      setEditingConteudo(created.conteudo);
      setEditingAtivo(created.ativo);
      setIsNewTemplateModalOpen(false);
      setNewTitulo('');
      setNewConteudo('');
    } catch (err) {
      console.error('Erro ao criar template:', err);
      alert('Erro ao criar template no PocketBase.');
    }
  };

  // Preview formatado do WhatsApp
  const previewText = useMemo(() => {
    const raw = editingConteudo || selectedTemplate?.conteudo || '';
    return whatsappService.formatPlaceholder(raw, {
      '{cliente_nome}': 'Lucas Albuquerque',
      '{barbearia_nome}': barbearia.nome || 'Barbearia Zero Grau',
      '{barbeiro}': 'Marcão da Navalha',
      '{data}': '29/10/2026',
      '{horario}': '15:30',
      '{servico}': 'Corte Degradê + Barboterapia',
      '{data_vencimento}': '15/11/2026'
    });
  }, [editingConteudo, selectedTemplate, barbearia.nome]);

  // Disparo de Teste Manual
  const handleOpenTestModal = () => {
    if (templates.length > 0) {
      const firstTpl = templates[0];
      setTestTemplateId(firstTpl.id);
      setTestMensagemCustom(
        whatsappService.formatPlaceholder(firstTpl.conteudo, {
          '{cliente_nome}': testNome,
          '{barbearia_nome}': barbearia.nome,
          '{barbeiro}': 'Marcão da Navalha',
          '{data}': 'Hoje',
          '{horario}': '16:00',
          '{servico}': 'Corte & Barba',
          '{data_vencimento}': '30/11/2026'
        })
      );
    }
    setTestSuccess(false);
    setIsTestModalOpen(true);
  };

  const handleTemplateSelectionForTest = (tplId: string) => {
    setTestTemplateId(tplId);
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      setTestMensagemCustom(
        whatsappService.formatPlaceholder(found.conteudo, {
          '{cliente_nome}': testNome,
          '{barbearia_nome}': barbearia.nome,
          '{barbeiro}': 'Marcão da Navalha',
          '{data}': 'Hoje',
          '{horario}': '16:00',
          '{servico}': 'Corte & Barba',
          '{data_vencimento}': '30/11/2026'
        })
      );
    }
  };

  const handleSelectClienteForTest = (cli: Cliente) => {
    setTestNome(cli.nome);
    setTestTelefone(cli.telefone);
    const found = templates.find((t) => t.id === testTemplateId) || templates[0];
    if (found) {
      setTestMensagemCustom(
        whatsappService.formatPlaceholder(found.conteudo, {
          '{cliente_nome}': cli.nome,
          '{barbearia_nome}': barbearia.nome,
          '{barbeiro}': 'Marcão da Navalha',
          '{data}': 'Hoje',
          '{horario}': '16:00',
          '{servico}': 'Corte & Barba',
          '{data_vencimento}': cli.data_vencimento || '30/11/2026'
        })
      );
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTelefone.trim() || !testMensagemCustom.trim()) {
      alert('Informe o telefone e a mensagem.');
      return;
    }

    setIsSendingTest(true);
    try {
      const selectedTpl = templates.find((t) => t.id === testTemplateId);
      let realSendStatus: StatusMensagemWhatsapp = 'enviado';

      // Se a conexão estiver ativa na Evolution API, efetua o disparo oficial em tempo real
      if (connectionStatus === 'conectado') {
        const sendResult = await evolutionApi.sendTextMessage(
          instanceName,
          testTelefone.trim(),
          testMensagemCustom.trim()
        );

        if (sendResult.success) {
          realSendStatus = 'entregue';
        } else {
          realSendStatus = 'falha';
          alert(`Aviso: O envio oficial via Evolution API retornou: ${sendResult.error || 'Erro desconhecido'}`);
        }
      }

      const novoEnvio = await whatsappService.registrarEnvio({
        barbearia_id: barbearia.id,
        destinatario_nome: testNome.trim(),
        destinatario_telefone: testTelefone.trim(),
        tipo_gatilho: selectedTpl ? selectedTpl.tipo_gatilho : 'avulso',
        mensagem: testMensagemCustom.trim(),
        template_id: testTemplateId || undefined,
        status: realSendStatus
      });

      setHistorico((prev) => [novoEnvio, ...prev]);
      if (realSendStatus !== 'falha') {
        setTestSuccess(true);
        setTimeout(() => {
          setIsTestModalOpen(false);
          setTestSuccess(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Erro ao registrar envio de teste:', err);
      alert('Erro ao registrar mensagem no histórico do PocketBase.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filtragem do Histórico
  const filteredHistorico = useMemo(() => {
    return historico.filter((item) => {
      const matchesStatus = filterStatus === 'todos' || item.status === filterStatus;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        item.destinatario_nome.toLowerCase().includes(q) ||
        item.destinatario_telefone.includes(q) ||
        item.mensagem.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [historico, filterStatus, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      
      {/* Top Banner Status Bar */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '3.2rem',
            height: '3.2rem',
            borderRadius: '1rem',
            background: connectionStatus === 'conectado' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${connectionStatus === 'conectado' ? 'rgba(37, 211, 102, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: connectionStatus === 'conectado' ? '#25d366' : '#f87171'
          }}>
            <MessageSquare style={{ width: '1.75rem', height: '1.75rem' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                WhatsApp & Notificações Automáticas
              </h3>
              {connectionStatus === 'conectado' ? (
                <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                  Instância Online
                </span>
              ) : (
                <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8' }} />
                  Desconectado
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Confirmações de agenda, lembretes de 2h antes, avisos de pós-atendimento e cobrança VIP.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleOpenTestModal}
            className="btn-primary"
            style={{ fontSize: '0.75rem', padding: '0.38rem 0.85rem' }}
          >
            <Send style={{ width: '0.85rem', height: '0.85rem' }} />
            <span>Disparo de Teste</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
        <button
          onClick={() => setActiveSubTab('emparelhamento')}
          className={`nav-tab-btn ${activeSubTab === 'emparelhamento' ? 'active' : ''}`}
        >
          <QrCode style={{ width: '1.05rem', height: '1.05rem' }} />
          <span>Emparelhamento & Instância</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notificacoes_auto')}
          className={`nav-tab-btn ${activeSubTab === 'notificacoes_auto' ? 'active' : ''}`}
        >
          <Sparkles style={{ width: '1.05rem', height: '1.05rem', color: '#10b981' }} />
          <span>Gatilhos Automáticos (6)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`nav-tab-btn ${activeSubTab === 'templates' ? 'active' : ''}`}
        >
          <Sliders style={{ width: '1.05rem', height: '1.05rem' }} />
          <span>Editor de Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('historico')}
          className={`nav-tab-btn ${activeSubTab === 'historico' ? 'active' : ''}`}
        >
          <Clock style={{ width: '1.05rem', height: '1.05rem' }} />
          <span>Histórico de Envios ({historico.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* ABA 1: EMPARELHAMENTO & QR CODE MOCK LOCAL                   */}
      {/* ============================================================ */}
      {activeSubTab === 'emparelhamento' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          
          {/* Card de Conexão Principal */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="gold-badge" style={{ marginBottom: '0.65rem' }}>
                  <Sparkles style={{ width: '0.75rem', height: '0.75rem' }} />
                  Instância Dedicada • {instanceName}
                </span>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Conexão WhatsApp Web
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Vincule o número comercial da barbearia via QR Code oficial para autorizar disparos.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  title="Configurar servidor Evolution API"
                >
                  <Settings style={{ width: '0.9rem', height: '0.9rem' }} />
                  <span>Configurar API</span>
                </button>

                {connectionStatus === 'conectado' && (
                  <button
                    onClick={handleDisconnect}
                    className="btn-danger"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
                    title="Desconectar sessão atual"
                  >
                    <Power style={{ width: '0.9rem', height: '0.9rem' }} />
                    <span>Desconectar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Estado 1: Desconectado */}
            {connectionStatus === 'desconectado' && (
              <div style={{
                textAlign: 'center',
                padding: '2.5rem 1.5rem',
                border: '2px dashed var(--border-subtle)',
                borderRadius: '1rem',
                background: 'rgba(0, 0, 0, 0.2)'
              }}>
                <div style={{
                  width: '4rem',
                  height: '4rem',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  color: 'var(--text-dim)'
                }}>
                  <Smartphone style={{ width: '2rem', height: '2rem' }} />
                </div>

                <h5 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Nenhum aparelho conectado
                </h5>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '340px', margin: '0 auto 1.5rem' }}>
                  Gere o QR Code oficial da Evolution API e faça a leitura com seu aplicativo WhatsApp comercial da barbearia.
                </p>

                <button
                  onClick={handleStartPairing}
                  className="btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                >
                  <QrCode style={{ width: '0.9rem', height: '0.9rem' }} />
                  <span>Gerar QR Code de Conexão</span>
                </button>
              </div>
            )}

            {/* Estado 2: Gerando ou Aguardando Leitura do QR Code Oficial */}
            {connectionStatus === 'qrcode' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1.75rem',
                background: 'rgba(13, 19, 34, 0.85)',
                border: '1px solid rgba(217, 119, 6, 0.35)',
                borderRadius: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <span className="badge badge-amber" style={{ animation: 'pulse 2s infinite' }}>
                    <RefreshCw style={{ width: '0.85rem', height: '0.85rem', animation: 'spin 4s linear infinite' }} />
                    Aguardando Leitura • {qrCodeTimer}s
                  </span>
                </div>

                {isLoadingQR ? (
                  <div style={{
                    width: '210px',
                    height: '210px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.85rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '0.75rem',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <RefreshCw style={{ width: '2rem', height: '2rem', color: 'var(--brand-primary, #f59e0b)', animation: 'spin 1.2s linear infinite' }} />
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 0.5rem' }}>
                      Gerando QR Code Oficial via Evolution API...
                    </span>
                  </div>
                ) : qrErrorMessage ? (
                  <div style={{
                    width: '100%',
                    maxWidth: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '1.25rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '0.75rem',
                    marginBottom: '1.25rem',
                    gap: '0.75rem',
                    textAlign: 'center'
                  }}>
                    <AlertTriangle style={{ width: '1.75rem', height: '1.75rem', color: '#f87171' }} />
                    <p style={{ fontSize: '0.82rem', color: '#fca5a5' }}>
                      {qrErrorMessage}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                      <button
                        onClick={fetchOfficialQRCode}
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        Tentar Novamente
                      </button>
                      <button
                        onClick={() => setIsConfigModalOpen(true)}
                        className="btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Settings style={{ width: '0.75rem', height: '0.75rem' }} />
                        Configurar API
                      </button>
                    </div>
                  </div>
                ) : realQrCodeBase64 ? (
                  <div style={{
                    background: '#ffffff',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                    position: 'relative',
                    width: '210px',
                    height: '210px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem'
                  }}>
                    <img
                      src={realQrCodeBase64}
                      alt="QR Code WhatsApp Oficial"
                      style={{ width: '180px', height: '180px', objectFit: 'contain', borderRadius: '4px' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '210px',
                    height: '210px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '0.75rem',
                    marginBottom: '1.25rem'
                  }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Nenhum QR Code gerado</span>
                  </div>
                )}

                {pairingCode && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}>
                    Código de Conexão: <span style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{pairingCode}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', maxWidth: '320px' }}>
                  <div style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    lineHeight: '1.4'
                  }}>
                    Abra o WhatsApp no celular ➔ <strong>Dispositivos Conectados</strong> ➔ <strong>Conectar Dispositivo</strong> e aponte a câmera.
                  </div>

                  <button
                    onClick={fetchOfficialQRCode}
                    disabled={isLoadingQR}
                    className="btn-secondary"
                    style={{ width: '100%', fontSize: '0.82rem', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <RefreshCw style={{ width: '0.85rem', height: '0.85rem', animation: isLoadingQR ? 'spin 1s linear infinite' : 'none' }} />
                    <span>Atualizar QR Code</span>
                  </button>

                  <button
                    onClick={() => {
                      setConnectionStatus('desconectado');
                      setRealQrCodeBase64(null);
                    }}
                    className="btn-secondary"
                    style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem', opacity: 0.8 }}
                  >
                    Cancelar Leitura
                  </button>
                </div>
              </div>
            )}

            {/* Estado 3: Conectado */}
            {connectionStatus === 'conectado' && (
              <div style={{
                background: 'rgba(37, 211, 102, 0.05)',
                border: '1px solid rgba(37, 211, 102, 0.25)',
                borderRadius: '1rem',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    background: '#25d366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)'
                  }}>
                    <ShieldCheck style={{ width: '1.75rem', height: '1.75rem' }} />
                  </div>

                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                      Sessão Ativa & Operacional
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#86efac' }}>
                      Número: {connectedNumber ? `+${connectedNumber}` : '+55 (11) 99999-8888'}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '1rem'
                }}>
                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.65rem 0.85rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Wifi style={{ width: '0.75rem', height: '0.75rem', color: '#38bdf8' }} /> Latência
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                      18 ms
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.65rem 0.85rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <BatteryCharging style={{ width: '0.75rem', height: '0.75rem', color: '#34d399' }} /> Bateria
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>
                      96% ⚡
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.65rem 0.85rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCheck style={{ width: '0.75rem', height: '0.75rem', color: '#fbbf24' }} /> Entregas
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                      100% Taxa
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  * As mensagens configuradas nos templates serão disparadas utilizando esta conexão.
                </div>
              </div>
            )}
          </div>

          {/* Guia de Instruções & Checklist */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Como Funciona a Integração
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: 'rgba(217, 119, 6, 0.15)',
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Emparelhe o Aparelho:</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Ao clicar em Gerar QR Code, uma sessão segura é inicializada via socket local. No ambiente de testes, utilize o mock interativo.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: 'rgba(217, 119, 6, 0.15)',
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Gatilhos Automatizados:</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Cada ação na barbearia (agendamento criado na agenda, 2h antes do atendimento, comanda concluída no PDV ou plano VIP vencendo) aciona o template correspondente.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: 'rgba(217, 119, 6, 0.15)',
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Placeholders Dinâmicos:</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Substitua variáveis como <code>{'{cliente_nome}'}</code>, <code>{'{horario}'}</code> e <code>{'{barbeiro}'}</code> em tempo real no editor visual.
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 'auto',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '0.75rem',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <CheckCircle2 style={{ width: '1.25rem', height: '1.25rem', color: '#38bdf8', flexShrink: 0 }} />
              <div style={{ fontSize: '0.82rem', color: '#e0f2fe' }}>
                <strong>Garantia Local:</strong> O status da conexão é persistido em <code>barbearias.whatsapp_status</code> no PocketBase.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* ABA: TEMPLATES DE NOTIFICAÇÕES AUTOMÁTICAS (6 GATILHOS)     */}
      {/* ============================================================ */}
      {activeSubTab === 'notificacoes_auto' && (
        <MensagensConfigView
          barbearia={barbearia}
          onBarbeariaUpdated={onBarbeariaUpdated}
        />
      )}

      {/* ============================================================ */}
      {/* ABA 2: EDITOR DE TEMPLATES COM PREVIEW WHATSAPP AO VIVO      */}
      {/* ============================================================ */}
      {activeSubTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Coluna Esquerda: Lista de Templates */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Templates ({templates.length})
              </h4>
              <button
                onClick={() => setIsNewTemplateModalOpen(true)}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
              >
                <Plus style={{ width: '0.85rem', height: '0.85rem' }} />
                <span>Novo</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '580px', overflowY: 'auto' }}>
              {templates.map((tpl) => {
                const info = GATILHOS_LABEL[tpl.tipo_gatilho] || { label: tpl.tipo_gatilho, cor: '#94a3b8' };
                const isSelected = selectedTemplate?.id === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '0.75rem',
                      border: `1px solid ${isSelected ? 'rgba(217, 119, 6, 0.5)' : 'var(--border-subtle)'}`,
                      background: isSelected ? 'rgba(217, 119, 6, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: info.cor,
                          background: `${info.cor}15`,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}
                      >
                        {info.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: tpl.ativo ? '#34d399' : 'var(--text-dim)',
                          fontWeight: 600
                        }}
                      >
                        {tpl.ativo ? '● Ativo' : '○ Inativo'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isSelected ? '#fbbf24' : 'var(--text-main)' }}>
                      {tpl.titulo}
                    </div>

                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {tpl.conteudo}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Editor + Preview WhatsApp */}
          {selectedTemplate ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
              
              {/* Formulário do Editor */}
              <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{
                      fontSize: '0.72rem',
                      color: GATILHOS_LABEL[selectedTemplate.tipo_gatilho]?.cor || '#94a3b8',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {GATILHOS_LABEL[selectedTemplate.tipo_gatilho]?.label}
                    </span>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                      Editar Mensagem
                    </h4>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={editingAtivo}
                      onChange={(e) => setEditingAtivo(e.target.checked)}
                      style={{ accentColor: '#d97706', width: '1rem', height: '1rem' }}
                    />
                    <span>Disparo Ativo</span>
                  </label>
                </div>

                <div>
                  <label className="field-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Título Identificador
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingTitulo}
                    onChange={(e) => setEditingTitulo(e.target.value)}
                    placeholder="Ex: Confirmação de Agendamento"
                  />
                </div>

                {/* Tags Dinâmicas Rápidas */}
                <div>
                  <label className="field-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Inserir Variável Dinâmica</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Clique para adicionar</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {[
                      { tag: '{cliente_nome}', desc: 'Nome do cliente' },
                      { tag: '{barbearia_nome}', desc: 'Nome da barbearia' },
                      { tag: '{barbeiro}', desc: 'Nome do barbeiro' },
                      { tag: '{data}', desc: 'Data (DD/MM)' },
                      { tag: '{horario}', desc: 'Horário (HH:mm)' },
                      { tag: '{servico}', desc: 'Serviço agendado' },
                      { tag: '{data_vencimento}', desc: 'Vencimento VIP' }
                    ].map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertVariable(item.tag)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: '#38bdf8',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#38bdf8';
                          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        }}
                      >
                        + {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="field-label" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
                    Texto da Mensagem (Suporta *negrito*, _itálico_ e quebras de linha)
                  </label>
                  <textarea
                    rows={8}
                    className="input-field"
                    style={{ resize: 'vertical', lineHeight: '1.45', fontFamily: 'inherit' }}
                    value={editingConteudo}
                    onChange={(e) => setEditingConteudo(e.target.value)}
                    placeholder="Digite a mensagem..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {templateSaveSuccess && (
                    <span style={{ color: '#34d399', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 style={{ width: '0.9rem', height: '0.9rem' }} />
                      Salvo com sucesso no PocketBase!
                    </span>
                  )}
                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="btn-primary"
                      style={{ padding: '0.65rem 1.25rem' }}
                    >
                      {isSavingTemplate ? (
                        <>
                          <RefreshCw style={{ width: '0.9rem', height: '0.9rem', animation: 'spin 1s linear infinite' }} />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Check style={{ width: '0.9rem', height: '0.9rem' }} />
                          <span>Salvar Alterações</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Balão Realista do WhatsApp Web */}
              <div className="glass-panel" style={{
                borderRadius: '1.25rem',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                height: '520px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
              }}>
                {/* Header do WhatsApp */}
                <div style={{
                  background: '#202c33',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{
                    width: '2.4rem',
                    height: '2.4rem',
                    borderRadius: '50%',
                    background: '#111b21',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: '1px solid #d97706'
                  }}>
                    NB
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e9edef' }}>
                      {barbearia.nome}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#8696a0' }}>
                      online
                    </div>
                  </div>
                </div>

                {/* Área de Conversa com Wallpaper WhatsApp */}
                <div style={{
                  flex: 1,
                  background: '#0b141a',
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(37, 211, 102, 0.02) 0%, transparent 60%)`,
                  padding: '1.25rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  overflowY: 'auto'
                }}>
                  {/* Tag de Data */}
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <span style={{
                      background: 'rgba(32, 44, 51, 0.85)',
                      color: '#8696a0',
                      fontSize: '0.68rem',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '6px',
                      textTransform: 'uppercase'
                    }}>
                      Hoje
                    </span>
                  </div>

                  {/* Balão de Mensagem Enviada (Verde WhatsApp #005c4b) */}
                  <div style={{
                    alignSelf: 'flex-end',
                    background: '#005c4b',
                    color: '#e9edef',
                    padding: '0.75rem 0.85rem 0.5rem',
                    borderRadius: '0.65rem 0.15rem 0.65rem 0.65rem',
                    maxWidth: '92%',
                    fontSize: '0.82rem',
                    lineHeight: '1.4',
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-line'
                  }}>
                    {previewText}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.25rem',
                      marginTop: '0.35rem',
                      fontSize: '0.65rem',
                      color: '#8696a0'
                    }}>
                      <span>15:30</span>
                      <CheckCheck style={{ width: '0.85rem', height: '0.85rem', color: '#53bdeb' }} />
                    </div>
                  </div>
                </div>

                {/* Footer Mock do WhatsApp */}
                <div style={{
                  background: '#202c33',
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#8696a0',
                  fontSize: '0.75rem'
                }}>
                  <div style={{
                    flex: 1,
                    background: '#2a3942',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    color: '#8696a0'
                  }}>
                    Mensagem automatizada
                  </div>
                  <Send style={{ width: '1rem', height: '1rem', color: '#8696a0' }} />
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
              Selecione um template na lista lateral para editar.
            </div>
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 3: HISTÓRICO DE ENVIOS & AUDITORIA                       */}
      {/* ============================================================ */}
      {activeSubTab === 'historico' && (
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Barra de Filtros */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                <Search style={{ width: '1rem', height: '1rem', position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '2.3rem' }}
                  placeholder="Pesquisar por cliente, telefone ou texto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="input-field"
                style={{ width: '160px' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="todos">Todos Status</option>
                <option value="entregue">Entregue</option>
                <option value="lido">Lido</option>
                <option value="enviado">Enviado</option>
                <option value="falha">Falha</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={loadData}
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 0.9rem' }}
                title="Recarregar histórico do PocketBase"
              >
                <RefreshCw style={{ width: '0.9rem', height: '0.9rem' }} />
                <span>Atualizar</span>
              </button>

              <button
                onClick={handleOpenTestModal}
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 0.95rem' }}
              >
                <Send style={{ width: '0.9rem', height: '0.9rem' }} />
                <span>Novo Envio</span>
              </button>
            </div>
          </div>

          {/* Tabela do Histórico */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Data/Hora</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Destinatário</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Gatilho</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Mensagem Disparada</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistorico.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                      Nenhum registro de disparo encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredHistorico.map((item) => {
                    const infoGatilho = GATILHOS_LABEL[item.tipo_gatilho] || { label: item.tipo_gatilho, cor: '#94a3b8' };

                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {item.data_envio || item.created?.slice(0, 16) || 'Recente'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {item.destinatario_nome}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {item.destinatario_telefone}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: infoGatilho.cor,
                              background: `${infoGatilho.cor}18`,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px'
                            }}
                          >
                            {infoGatilho.label}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', maxWidth: '320px' }}>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-muted)'
                          }}>
                            {item.mensagem}
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                          {item.status === 'entregue' && (
                            <span className="badge badge-green">
                              <CheckCheck style={{ width: '0.8rem', height: '0.8rem' }} />
                              Entregue
                            </span>
                          )}
                          {item.status === 'lido' && (
                            <span className="badge badge-blue">
                              <CheckCheck style={{ width: '0.8rem', height: '0.8rem', color: '#38bdf8' }} />
                              Lido
                            </span>
                          )}
                          {item.status === 'enviado' && (
                            <span className="badge badge-gray">
                              <Check style={{ width: '0.8rem', height: '0.8rem' }} />
                              Enviado
                            </span>
                          )}
                          {item.status === 'falha' && (
                            <span className="badge badge-amber" style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.15)' }}>
                              <XCircle style={{ width: '0.8rem', height: '0.8rem' }} />
                              Falha
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedMensagemVisualizar(item)}
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            title="Ver mensagem completa"
                          >
                            <Eye style={{ width: '0.85rem', height: '0.85rem' }} />
                            <span>Ver</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NOVO TEMPLATE                                         */}
      {/* ============================================================ */}
      {isNewTemplateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '520px' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Criar Novo Template
              </h3>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="field-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
                  Gatilho de Disparo
                </label>
                <select
                  className="input-field"
                  value={newTipoGatilho}
                  onChange={(e) => setNewTipoGatilho(e.target.value as TipoGatilhoWhatsapp)}
                >
                  <option value="confirmacao_agendamento">Confirmação de Agendamento</option>
                  <option value="lembrete_horario">Lembrete de Horário (2h antes)</option>
                  <option value="pos_atendimento">Pós-Atendimento & Agradecimento</option>
                  <option value="cancelamento_agendamento">Cancelamento de Horário</option>
                  <option value="cobranca_vip">Renovação / Cobrança Clube VIP</option>
                  <option value="avulso">Mensagem Avulsa / Informativa</option>
                </select>
              </div>

              <div>
                <label className="field-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
                  Título Identificador
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Ex: Lembrete VIP de Quinta-feira"
                  value={newTitulo}
                  onChange={(e) => setNewTitulo(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
                  Conteúdo da Mensagem
                </label>
                <textarea
                  required
                  rows={5}
                  className="input-field"
                  placeholder="Olá {cliente_nome}! Seu horário na {barbearia_nome}..."
                  value={newConteudo}
                  onChange={(e) => setNewConteudo(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Criar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DISPARO MANUAL DE TESTE                               */}
      {/* ============================================================ */}
      {isTestModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '580px' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="gold-badge" style={{ marginBottom: '0.35rem' }}>
                  Simulador de Envio
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Novo Disparo de Teste
                </h3>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTestMessage} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              
              {/* Seleção rápida de cliente */}
              {clientesList.length > 0 && (
                <div>
                  <label className="field-label" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.35rem', display: 'block' }}>
                    Preencher com Cliente Cadastrado (Opcional):
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
                    {clientesList.slice(0, 4).map((cli) => (
                      <button
                        key={cli.id}
                        type="button"
                        onClick={() => handleSelectClienteForTest(cli)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: '#f8fafc',
                          padding: '0.3rem 0.65rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cli.nome} ({cli.telefone})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="field-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
                    Nome do Destinatário
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={testNome}
                    onChange={(e) => setTestNome(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={testTelefone}
                    onChange={(e) => setTestTelefone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="field-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
                  Carregar Template
                </label>
                <select
                  className="input-field"
                  value={testTemplateId}
                  onChange={(e) => handleTemplateSelectionForTest(e.target.value)}
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.titulo} ({GATILHOS_LABEL[tpl.tipo_gatilho]?.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" style={{ fontSize: '0.82rem', marginBottom: '0.35rem', display: 'block' }}>
                  Mensagem Final para Envio
                </label>
                <textarea
                  rows={4}
                  required
                  className="input-field"
                  style={{ lineHeight: '1.4' }}
                  value={testMensagemCustom}
                  onChange={(e) => setTestMensagemCustom(e.target.value)}
                />
              </div>

              {testSuccess && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  color: '#4ade80',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle2 style={{ width: '1.1rem', height: '1.1rem' }} />
                  Mensagem registrada no histórico com sucesso!
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="btn-primary"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw style={{ width: '0.9rem', height: '0.9rem', animation: 'spin 1s linear infinite' }} />
                      <span>{connectionStatus === 'conectado' ? 'Disparando via WhatsApp...' : 'Registrando Disparo...'}</span>
                    </>
                  ) : (
                    <>
                      <Send style={{ width: '0.9rem', height: '0.9rem' }} />
                      <span>{connectionStatus === 'conectado' ? 'Disparar Mensagem Oficial' : 'Simular Envio (Demonstração)'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIGURAÇÃO DA EVOLUTION API (OFICIAL)               */}
      {/* ============================================================ */}
      {isConfigModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '520px' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.65rem',
                  background: 'rgba(217, 119, 6, 0.15)',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary, #f59e0b)'
                }}>
                  <Settings style={{ width: '1.35rem', height: '1.35rem' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    Servidor Evolution API
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                    Integração oficial de WhatsApp Web (v2)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsConfigModalOpen(false);
                  setConfigFeedback(null);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.65rem',
                padding: '0.85rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                lineHeight: '1.45'
              }}>
                A <strong>Evolution API v2</strong> gerencia a conexão WebSocket com os servidores oficiais do WhatsApp. O sistema criará a instância dedicada <code>{instanceName}</code> automaticamente.
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.45rem' }}>
                  <Globe style={{ width: '0.95rem', height: '0.95rem', color: '#38bdf8' }} />
                  URL do Servidor Evolution API:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: http://localhost:8080 ou https://api.suadominio.com"
                  className="input-field"
                  value={configApiUrl}
                  onChange={(e) => setConfigApiUrl(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                  Endereço onde a sua Evolution API está rodando.
                </span>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.45rem' }}>
                  <Key style={{ width: '0.95rem', height: '0.95rem', color: '#fbbf24' }} />
                  Chave de Autenticação (Global API Key):
                </label>
                <input
                  type="password"
                  required
                  placeholder="AUTHENTICATION_API_KEY da sua Evolution API"
                  className="input-field"
                  value={configApiKey}
                  onChange={(e) => setConfigApiKey(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                  Chave secreta configurada no arquivo de ambiente (.env) do servidor.
                </span>
              </div>

              {configFeedback && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: configFeedback.type === 'success' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${configFeedback.type === 'success' ? 'rgba(37, 211, 102, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  color: configFeedback.type === 'success' ? '#86efac' : '#fca5a5'
                }}>
                  {configFeedback.type === 'success' ? (
                    <CheckCircle2 style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  )}
                  <span>{configFeedback.text}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleTestConfig}
                  disabled={isTestingConfig}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <RefreshCw style={{ width: '0.85rem', height: '0.85rem', animation: isTestingConfig ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{isTestingConfig ? 'Testando...' : 'Testar Conexão'}</span>
                </button>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfigModalOpen(false);
                      setConfigFeedback(null);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.55rem 0.9rem' }}
                  >
                    Fechar
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.55rem 1rem' }}
                  >
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: VISUALIZAR MENSAGEM DO HISTÓRICO                      */}
      {/* ============================================================ */}
      {selectedMensagemVisualizar && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-green" style={{ marginBottom: '0.25rem' }}>
                  Status: {selectedMensagemVisualizar.status}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Mensagem Disparada
                </h3>
              </div>
              <button
                onClick={() => setSelectedMensagemVisualizar(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Destinatário:</div>
                <div style={{ fontWeight: 600 }}>
                  {selectedMensagemVisualizar.destinatario_nome} ({selectedMensagemVisualizar.destinatario_telefone})
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Gatilho:</div>
                <div style={{ fontWeight: 600, color: GATILHOS_LABEL[selectedMensagemVisualizar.tipo_gatilho]?.cor || '#fff' }}>
                  {GATILHOS_LABEL[selectedMensagemVisualizar.tipo_gatilho]?.label}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>Texto Completo:</div>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.65rem',
                  padding: '1rem',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line'
                }}>
                  {selectedMensagemVisualizar.mensagem}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedMensagemVisualizar(null)}
                  className="btn-secondary"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
