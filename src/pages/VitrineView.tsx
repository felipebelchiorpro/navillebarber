import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Image as ImageIcon,
  UploadCloud,
  MapPin,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Store,
  Instagram,
  Phone,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Barbearia, barbeariasService, pb } from '../services/pocketbase';

export interface VitrineViewProps {
  barbearia: Barbearia;
  onBarbeariaUpdated?: (barbearia: Barbearia) => void;
  onOpenVitrine?: (slug: string) => void;
}

interface DiaHorario {
  key: string;
  label: string;
  aberto: boolean;
  inicio: string;
  fim: string;
}

const DIAS_PADRAO: DiaHorario[] = [
  { key: 'segunda', label: 'Segunda', aberto: true, inicio: '09:00', fim: '20:00' },
  { key: 'terca', label: 'Terça', aberto: true, inicio: '09:00', fim: '20:00' },
  { key: 'quarta', label: 'Quarta', aberto: true, inicio: '09:00', fim: '20:00' },
  { key: 'quinta', label: 'Quinta', aberto: true, inicio: '09:00', fim: '20:00' },
  { key: 'sexta', label: 'Sexta', aberto: true, inicio: '09:00', fim: '20:00' },
  { key: 'sabado', label: 'Sábado', aberto: true, inicio: '09:00', fim: '19:00' },
  { key: 'domingo', label: 'Domingo', aberto: false, inicio: '09:00', fim: '14:00' },
];

export const VitrineView: React.FC<VitrineViewProps> = ({
  barbearia,
  onBarbeariaUpdated,
  onOpenVitrine,
}) => {
  // Helper para obter URL da capa
  const getCapaSrc = (b?: Barbearia | null): string | null => {
    if (!b) return null;
    if (b.foto_capa) {
      if (b.foto_capa.startsWith('http') || b.foto_capa.startsWith('blob:') || b.foto_capa.startsWith('data:')) {
        return b.foto_capa;
      }
      return `${pb.baseUrl}/api/files/barbearias/${b.id || 'ca42u8j6x8o514w'}/${b.foto_capa}`;
    }
    return b.foto_capa_url || null;
  };

  // Helper para obter URL da logo
  const getLogoSrc = (b?: Barbearia | null): string | null => {
    if (!b) return null;
    if (b.logo) {
      if (b.logo.startsWith('http') || b.logo.startsWith('blob:') || b.logo.startsWith('data:')) {
        return b.logo;
      }
      return `${pb.baseUrl}/api/files/barbearias/${b.id || 'ca42u8j6x8o514w'}/${b.logo}`;
    }
    return b.logo_url || null;
  };

  // Estados do formulário
  const [nome, setNome] = useState(barbearia?.nome || 'Barbearia Belchior');
  const [descricao, setDescricao] = useState(
    barbearia?.descricao_espaco ||
      barbearia?.descricao ||
      'Barbearia conceito com padrão premium de atendimento.'
  );
  const [endereco, setEndereco] = useState(barbearia?.endereco || 'Rua das Flores, 123 - Centro');
  const [whatsapp, setWhatsapp] = useState(
    barbearia?.whatsapp || barbearia?.whatsapp_numero || barbearia?.telefone_proprietario || '5511999998888'
  );
  const [instagram, setInstagram] = useState(
    barbearia?.instagram || barbearia?.instagram_perfil || 'barberiagrupobelchior'
  );

  // Estados para arquivos e preview de imagens
  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [fotoCapaPreview, setFotoCapaPreview] = useState<string | null>(getCapaSrc(barbearia));
  const [logoPreview, setLogoPreview] = useState<string | null>(getLogoSrc(barbearia));

  // Parse de horários
  const [diasHorarios, setDiasHorarios] = useState<DiaHorario[]>(() => {
    if (barbearia?.horarios_funcionamento && typeof barbearia.horarios_funcionamento === 'object') {
      return DIAS_PADRAO.map((dia) => {
        const val = barbearia.horarios_funcionamento?.[dia.key];
        if (!val || val.toLowerCase() === 'fechado') {
          return { ...dia, aberto: false };
        }
        const parts = val.split('-');
        if (parts.length === 2) {
          return { ...dia, aberto: true, inicio: parts[0].trim(), fim: parts[1].trim() };
        }
        return dia;
      });
    }
    return DIAS_PADRAO;
  });

  // Feedback states
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const fileCapaRef = useRef<HTMLInputElement>(null);
  const fileLogoRef = useRef<HTMLInputElement>(null);

  // Sincroniza quando a barbearia muda ou busca direto do PocketBase
  useEffect(() => {
    let isMounted = true;
    const carregarDadosDoBanco = async () => {
      try {
        const targetId =
          barbearia?.id && barbearia.id !== 'dev_barb' && barbearia.id !== 'f248k5y236q412x'
            ? barbearia.id
            : 'ca42u8j6x8o514w';

        const record = await pb.collection('barbearias').getOne<Barbearia>(targetId);
        if (!isMounted || !record) return;

        if (record.nome) setNome(record.nome);
        if (record.descricao_espaco || record.descricao) {
          setDescricao(record.descricao_espaco || record.descricao || '');
        }
        if (record.endereco) setEndereco(record.endereco);
        if (record.whatsapp || record.whatsapp_numero || record.telefone) {
          setWhatsapp(record.whatsapp || record.whatsapp_numero || record.telefone || '');
        }
        if (record.instagram) setInstagram(record.instagram);

        const capa = getCapaSrc(record);
        if (capa) setFotoCapaPreview(capa);

        const logo = getLogoSrc(record);
        if (logo) setLogoPreview(logo);

        if (record.horarios_funcionamento && typeof record.horarios_funcionamento === 'object') {
          setDiasHorarios(
            DIAS_PADRAO.map((dia) => {
              const val = (record.horarios_funcionamento as any)?.[dia.key];
              if (!val || val.toLowerCase() === 'fechado') {
                return { ...dia, aberto: false };
              }
              const parts = val.split('-');
              if (parts.length === 2) {
                return { ...dia, aberto: true, inicio: parts[0].trim(), fim: parts[1].trim() };
              }
              return dia;
            })
          );
        }
        onBarbeariaUpdated?.(record);
      } catch (err) {
        console.warn('Sincronização PocketBase com dados locais:', err);
        // Fallback local se estiver offline
        if (barbearia && isMounted) {
          setNome(barbearia.nome || '');
          setDescricao(barbearia.descricao_espaco || barbearia.descricao || '');
          setEndereco(barbearia.endereco || '');
          setWhatsapp(barbearia.whatsapp || barbearia.whatsapp_numero || barbearia.telefone_proprietario || '');
          setInstagram(barbearia.instagram || barbearia.instagram_perfil || '');
          const capa = getCapaSrc(barbearia);
          if (capa) setFotoCapaPreview(capa);
          const logo = getLogoSrc(barbearia);
          if (logo) setLogoPreview(logo);
        }
      }
    };

    carregarDadosDoBanco();
    return () => {
      isMounted = false;
    };
  }, [barbearia?.id]);

  // Upload de capa
  const handleCapaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoCapaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload de logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle aberto/fechado
  const toggleDia = (index: number) => {
    setDiasHorarios((prev) =>
      prev.map((item, i) => (i === index ? { ...item, aberto: !item.aberto } : item))
    );
  };

  // Atualizar horário
  const updateHorario = (index: number, campo: 'inicio' | 'fim', valor: string) => {
    setDiasHorarios((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  };

  // Salvar no PocketBase com persistência garantida
  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const horariosObj: Record<string, string> = {};
      diasHorarios.forEach((d) => {
        horariosObj[d.key] = d.aberto ? `${d.inicio} - ${d.fim}` : 'fechado';
      });

      const primeiroAberto = diasHorarios.find((d) => d.aberto);

      // Define targetId (usa o ID real cadastrado no PocketBase)
      const targetId =
        (barbearia?.id && barbearia.id !== 'dev_barb' && barbearia.id !== 'f248k5y236q412x')
          ? barbearia.id
          : ((pb.authStore.record as any)?.barbearia_id || (pb.authStore.record as any)?.barbearia || 'ca42u8j6x8o514w');

      let saved: Barbearia;

      if (capaFile || logoFile) {
        const formData = new FormData();
        formData.append('nome', nome.trim());
        formData.append('descricao_espaco', descricao.trim());
        formData.append('endereco', endereco.trim());
        formData.append('whatsapp', whatsapp.trim());
        formData.append('whatsapp_numero', whatsapp.trim());
        formData.append('instagram', instagram.trim());
        formData.append('horarios_funcionamento', JSON.stringify(horariosObj));
        formData.append('horario_abertura', primeiroAberto ? primeiroAberto.inicio : '09:00');
        formData.append('horario_fechamento', primeiroAberto ? primeiroAberto.fim : '20:00');
        formData.append('e_publico', 'true');

        if (capaFile) {
          formData.append('foto_capa', capaFile);
        }
        if (logoFile) {
          formData.append('logo', logoFile);
        }

        saved = await pb.collection('barbearias').update<Barbearia>(targetId, formData);
      } else {
        saved = await pb.collection('barbearias').update<Barbearia>(targetId, {
          nome: nome.trim(),
          descricao_espaco: descricao.trim(),
          endereco: endereco.trim(),
          whatsapp: whatsapp.trim(),
          whatsapp_numero: whatsapp.trim(),
          instagram: instagram.trim(),
          horarios_funcionamento: horariosObj,
          horario_abertura: primeiroAberto ? primeiroAberto.inicio : '09:00',
          horario_fechamento: primeiroAberto ? primeiroAberto.fim : '20:00',
          e_publico: true,
        });
      }

      // Calcula novas URLs de imagens persistidas
      const finalCapa = getCapaSrc(saved);
      const finalLogo = getLogoSrc(saved);

      const updatedBarb: Barbearia = {
        ...saved,
        foto_capa_url: finalCapa || undefined,
        logo_url: finalLogo || undefined,
        endereco: saved.endereco || endereco,
      };

      // Limpa os arquivos temporários já enviados
      setCapaFile(null);
      setLogoFile(null);
      if (finalCapa) setFotoCapaPreview(finalCapa);
      if (finalLogo) setLogoPreview(finalLogo);

      // Salva em localStorage para persistência imediata
      try {
        localStorage.setItem('naville_active_barbearia', JSON.stringify(updatedBarb));
      } catch (e) {}

      onBarbeariaUpdated?.(updatedBarb);
      setMensagemSucesso(true);
      setTimeout(() => setMensagemSucesso(false), 3500);
    } catch (err: any) {
      console.error('Erro ao salvar barbearia no PocketBase:', err);
      const detalheErro = err?.data?.data 
        ? Object.entries(err.data.data).map(([k, v]: any) => `${k}: ${v.message}`).join(', ')
        : '';
      alert(
        `Erro ao salvar no servidor: ${
          detalheErro || err?.data?.message || err?.message || 'Falha de comunicação com o PocketBase'
        }`
      );
    } finally {
      setSalvando(false);
    }
  };

  const publicSlug = barbearia?.slug && barbearia.slug !== 'zero-grau' ? barbearia.slug : 'belchior';
  const vitrineUrl = `${window.location.origin}/b/${publicSlug}`;

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(vitrineUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleVerVitrine = () => {
    if (onOpenVitrine) {
      onOpenVitrine(publicSlug);
    } else {
      window.open(vitrineUrl, '_blank');
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* 1. HEADER EXATO */}
      <header className="flex items-center justify-between shrink-0 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Meu Espaço & Vitrine</h1>
          <p className="text-sm text-zinc-400">
            Configure como a sua barbearia aparece para os clientes no link de agendamento.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {mensagemSucesso && (
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-in fade-in duration-300">
              <CheckCircle2 size={14} /> Salvo com sucesso!
            </span>
          )}
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="bg-orange-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-500 transition-colors flex items-center gap-1.5 shadow-[0_0_12px_rgba(249,115,22,0.25)] disabled:opacity-60 cursor-pointer"
          >
            {salvando ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save size={14} /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. GRID DE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        {/* COLUNA ESQUERDA: IDENTIDADE E INFORMAÇÕES (Ocupa 2 espaços) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Bloco de Imagens (Capa e Logo) */}
          <div className="p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl flex flex-col gap-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="text-orange-500" size={15} /> Identidade Visual
            </h3>

            {/* Input oculto para foto de capa */}
            <input
              ref={fileCapaRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCapaUpload}
            />

            {/* Banner de Capa */}
            <div
              onClick={() => fileCapaRef.current?.click()}
              className="w-full h-48 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center hover:bg-white/[0.03] transition-colors cursor-pointer relative overflow-hidden group"
            >
              {fotoCapaPreview ? (
                <>
                  <img
                    src={fotoCapaPreview}
                    alt="Foto de Capa"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <UploadCloud className="text-orange-400 mb-1" size={28} />
                    <span className="text-xs font-semibold">Trocar foto de capa</span>
                    <span className="text-[10px] text-zinc-300 mt-0.5">Clique para selecionar nova imagem</span>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="text-zinc-500 mb-2" size={32} />
                  <p className="text-sm font-medium text-zinc-400">Clique para alterar a foto de capa</p>
                  <p className="text-xs text-zinc-600 mt-1">Recomendado: 1200x400px</p>
                </>
              )}
            </div>

            <div className="flex gap-6 items-center">
              {/* Input oculto para logo */}
              <input
                ref={fileLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />

              {/* Logo redonda */}
              <div
                onClick={() => fileLogoRef.current?.click()}
                className="w-24 h-24 rounded-full border-2 border-dashed border-white/10 bg-white/[0.01] flex items-center justify-center cursor-pointer hover:bg-white/[0.03] shrink-0 relative overflow-hidden group"
              >
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo da Barbearia"
                      className="w-full h-full object-cover rounded-full"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full text-white text-[10px] font-semibold">
                      Alterar
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-zinc-500 font-medium">Logo</span>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                    Nome da Barbearia
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bloco de Descrição e Endereço */}
          <div className="p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl flex flex-col gap-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="text-orange-500" size={16} /> Sobre o Espaço
            </h3>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                Descrição para os clientes
              </label>
              <textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                  <Phone size={12} className="text-orange-400" /> WhatsApp de Contato
                </label>
                <input
                  type="text"
                  placeholder="5511999998888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                  <Instagram size={12} className="text-orange-400" /> Instagram Oficial
                </label>
                <input
                  type="text"
                  placeholder="barberiagrupobelchior"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: HORÁRIOS E REDES SOCIAIS (Ocupa 1 espaço) */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Bloco de Horários */}
          <div className="p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="text-orange-500" size={15} /> Horários
              </h3>
              <span className="text-[11px] text-zinc-500 font-medium">Dias de Atendimento</span>
            </div>

            <div className="flex flex-col gap-4">
              {diasHorarios.map((dia, index) => {
                const isLast = index === diasHorarios.length - 1;
                return (
                  <div
                    key={dia.key}
                    className={`flex items-center justify-between pb-4 ${
                      !isLast ? 'border-b border-white/[0.05]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Switch Customizado */}
                      <div
                        onClick={() => toggleDia(index)}
                        className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
                          dia.aberto
                            ? 'bg-orange-500/20 border border-orange-500/30'
                            : 'bg-white/10'
                        }`}
                        title={dia.aberto ? 'Clique para fechar' : 'Clique para abrir'}
                      >
                        <div
                          className={`w-4 h-4 rounded-full transition-all duration-200 ${
                            dia.aberto
                              ? 'bg-orange-500 absolute right-1 top-1 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                              : 'bg-zinc-400 absolute left-1 top-1'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          dia.aberto ? 'text-white' : 'text-zinc-500'
                        }`}
                      >
                        {dia.label}
                      </span>
                    </div>

                    {dia.aberto ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={dia.inicio}
                          onChange={(e) => updateHorario(index, 'inicio', e.target.value)}
                          className="w-16 bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-center text-xs text-white focus:border-orange-500 focus:outline-none"
                        />
                        <span className="text-zinc-500 text-xs">às</span>
                        <input
                          type="text"
                          value={dia.fim}
                          onChange={(e) => updateHorario(index, 'fim', e.target.value)}
                          className="w-16 bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-center text-xs text-white focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600 font-medium">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloco de Acesso Rápido e Compartilhamento da Vitrine */}
          <div className="p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Store size={16} className="text-orange-500" /> Link de Agendamento
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Vitrine Ativa
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              Envie este link para os seus clientes ou coloque na bio do Instagram para agendamentos automáticos 24h:
            </p>

            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-lg p-1.5">
              <input
                type="text"
                readOnly
                value={vitrineUrl}
                className="bg-transparent text-xs text-zinc-300 w-full focus:outline-none px-2 font-mono truncate"
              />
              <button
                onClick={handleCopiarLink}
                className="bg-white/5 hover:bg-white/10 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Copiar Link"
              >
                {copiado ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <button
              onClick={handleVerVitrine}
              className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 py-1.5 px-3 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
            >
              <ExternalLink size={14} className="text-orange-400" /> Visualizar Vitrine Pública
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
