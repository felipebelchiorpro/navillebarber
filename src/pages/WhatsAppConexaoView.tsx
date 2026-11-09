import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Smartphone, QrCode, CheckCircle2, AlertTriangle, RefreshCw, Power, ShieldCheck } from 'lucide-react';

export default function WhatsAppConexaoView() {
  // Puxa a barbearia real que foi carregada no layout
  const { barbearia } = useOutletContext<any>(); 
  
  const [status, setStatus] = useState<'desconectado' | 'carregando' | 'conectado'>('desconectado');
  const [qrCode, setQrCode] = useState<string | null>(null);

  const handleGenerateQR = async () => {
    setStatus('carregando');
    // NOME DA INSTÂNCIA ISOLADA: naville_inst_[ID_DA_BARBEARIA]
    const instanceName = `naville_inst_${barbearia?.id}`;
    console.log(`Solicitando QR Code para a instância: ${instanceName}`);
    
    // AQUI ENTRA A INTEGRAÇÃO REAL COM A EVOLUTION API / WAHA
    // Simulando o tempo de requisição à VPS...
    setTimeout(() => {
      // Quando a Evolution devolver o base64, você seta aqui:
      setQrCode('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ExemploQRcodeNaville'); // Placeholder
      setStatus('desconectado');
    }, 2000);
  };

  const handleDisconnect = () => {
    // Lógica para deletar a instância/logout na Evolution API
    setStatus('desconectado');
    setQrCode(null);
  };

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <header className="flex items-center justify-between shrink-0 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Conexão WhatsApp</h1>
          <p className="text-sm text-zinc-400 mt-1">Sincronize seu aparelho para ativar notificações e lembretes automáticos.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
           <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Instância ID:</span>
           <span className="text-xs font-mono text-emerald-500">{barbearia?.id || 'Desconhecida'}</span>
        </div>
      </header>

      {/* CORPO: DIVIDIDO EM 2 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUNA ESQUERDA: STATUS E INSTRUÇÕES */}
        <div className="flex flex-col gap-6">
          
          {/* Card de Status */}
          <div className="p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl relative overflow-hidden">
            {/* Linha de status no topo */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${status === 'conectado' ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${status === 'conectado' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'}`}>
                <Smartphone size={28}/>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {status === 'conectado' ? 'Aparelho Conectado' : 'Aguardando Conexão'}
                </h2>
                <p className={`text-sm font-medium ${status === 'conectado' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {status === 'conectado' ? 'Disparos automáticos ativados' : 'Escaneie o QR Code para iniciar'}
                </p>
              </div>
            </div>

            {status === 'conectado' ? (
              <button onClick={handleDisconnect} className="w-full py-1.5 px-3.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-semibold border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <Power size={14}/> Desconectar Aparelho
              </button>
            ) : (
              <button onClick={handleGenerateQR} disabled={status === 'carregando'} className="w-full py-1.5 px-3.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(249,115,22,0.3)] cursor-pointer">
                {status === 'carregando' ? <RefreshCw className="animate-spin" size={14}/> : <QrCode size={14}/>}
                {status === 'carregando' ? 'Gerando Sessão Segura...' : 'Gerar QR Code'}
              </button>
            )}
          </div>

          {/* Card de Informações/Segurança */}
          <div className="p-6 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="text-emerald-500" size={18}/> Sistema Anti-Ban Ativo</h3>
            <ul className="flex flex-col gap-3 text-sm text-zinc-400">
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={16}/> Suas mensagens são enviadas com atraso dinâmico para simular digitação humana.</li>
              <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" size={16}/> A instância roda em um servidor isolado dedicado apenas à sua barbearia.</li>
              <li className="flex gap-3"><AlertTriangle className="text-amber-500 shrink-0" size={16}/> O celular conectado precisa estar com internet para que o sistema consiga disparar as mensagens.</li>
            </ul>
          </div>
        </div>

        {/* COLUNA DIREITA: O QR CODE */}
        <div className="p-8 rounded-[2rem] backdrop-blur-md bg-white/[0.02] border border-white/[0.05] shadow-xl flex flex-col items-center justify-center text-center min-h-[400px]">
          
          {status === 'conectado' ? (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={48}/>
              </div>
              <h3 className="text-2xl font-bold text-white">Sincronizado!</h3>
              <p className="text-sm text-zinc-400 max-w-[250px]">Seu WhatsApp está pronto para enviar lembretes aos clientes automaticamente.</p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-300">
              <div className="bg-white p-4 rounded-3xl shadow-2xl">
                 <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56 object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Abra o WhatsApp no celular</h3>
                <ol className="text-sm text-zinc-400 text-left flex flex-col gap-2 max-w-[280px]">
                  <li>1. Toque em <strong>Mais opções</strong> (3 pontos) no Android, ou <strong>Configurações</strong> no iPhone.</li>
                  <li>2. Toque em <strong>Aparelhos conectados</strong> e depois em <strong>Conectar um aparelho</strong>.</li>
                  <li>3. Aponte a câmera do celular para esta tela.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 opacity-30">
              <QrCode className="text-zinc-500" size={64}/>
              <p className="text-sm font-medium text-zinc-400">Clique em "Gerar QR Code" para iniciar a conexão da sua barbearia.</p>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

