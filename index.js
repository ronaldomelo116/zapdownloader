import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import { identificarPlataforma, baixarVideo } from './downloader.js';

// Configurações importantes do seu Bot
const ID_GRUPO_PAINEL = 'MUDE_AQUI_O_ID_DO_SEU_PAINEL'; 
const ID_GRUPO_COMUNIDADE = 'MUDE_AQUI_O_ID_DO_GRUPO_DA_COMUNIDADE';

// Armazena solicitações ativas do menu: { 'chat_autor': { url, plataforma, criadoEm } }
const pedidosPendentes = new Map();

async function ligarBot() {
    // 1. Salva a conexão para você não precisar escanear o QR Code toda vez
    const { state, saveCreds } = await useMultiFileAuthState('conexao_bot');

    // CORREÇÃO AQUI: Chamando a função diretamente sem o .default
    const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false 
    });

    // 2. Mostra o QR Code no terminal quando o bot ligar
    socket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('\n👉 ESCANEIE O QR CODE ACIMA COM O WHATSAPP DO SEU BOT!');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const foiDesconectado = statusCode === DisconnectReason.loggedOut;

            if (foiDesconectado) {
                console.log('\n⚠️ A sessão expirou ou o bot foi desconectado no WhatsApp.');
                console.log('🔄 Limpando sessão antiga para gerar um novo QR Code...\n');
                try {
                    fs.rmSync('conexao_bot', { recursive: true, force: true });
                } catch (e) {}
                ligarBot();
            } else {
                console.log('⚠️ Conexão oscilou. Reconectando em 3 segundos...');
                setTimeout(ligarBot, 3000);
            }
        } else if (connection === 'open') {
            console.log('\n✅ BOT CONECTADO COM SUCESSO E PRONTO!');
            console.log('Fique atento aos logs abaixo para capturar os IDs dos seus grupos...');
        }
    });

    // 3. Salva as credenciais sempre que houver alteração
    socket.ev.on('creds.update', saveCreds);

    // 4. LÓGICA DO BOT: Ouvir as mensagens recebidas
    socket.ev.on('messages.upsert', async (m) => {
        // Pega a primeira mensagem do pacote de atualizações
        const msg = m.messages[0]; 
        
        // Ignora se não for uma mensagem válida ou se for enviada pelo próprio bot
        if (!msg || !msg.message || msg.key.fromMe) return;

        // PEGA O ID DO GRUPO OU CHAT (O famoso JID que precisamos)
        const deOndeVeio = msg.key.remoteJid;
        
        // Pega o texto que foi digitado
        const textoRecebido = msg.message.conversation || msg.message.extendedTextMessage?.text;

        // TRUQUE DO ID: Toda vez que chegar qualquer mensagem, o bot vai cuspir o ID no terminal
        if (textoRecebido) {
            console.log(`----------------------------------------`);
            console.log(`📩 Mensagem recebida no chat ID: ${deOndeVeio}`);
            console.log(`💬 Texto digitado: "${textoRecebido}"`);
            console.log(`----------------------------------------`);
        }

        if (!textoRecebido) return;

        const autorMsg = msg.key.participant || deOndeVeio;
        const chaveUsuario = `${deOndeVeio}_${autorMsg}`;
        const textoLimpo = textoRecebido.trim();

        // 1️⃣ O USUÁRIO RESPONDEU AO MENU (Opções 1, 2 ou 3)
        const matchOpcao = textoLimpo.match(/^[1-3]/) || (['1', '2', '3'].includes(textoLimpo) ? [textoLimpo] : null);
        if (pedidosPendentes.has(chaveUsuario) && matchOpcao) {
            const opcaoEscolhida = matchOpcao[0];
            const pedido = pedidosPendentes.get(chaveUsuario);
            pedidosPendentes.delete(chaveUsuario); // Consome a solicitação

            try {
                if (opcaoEscolhida === '1') {
                    // OPÇÃO 1: Vídeo Normal (player padrão do WhatsApp)
                    await socket.sendMessage(deOndeVeio, { 
                        text: `⏳ *Baixando Vídeo Normal (${pedido.plataforma})...*\nAguarde alguns instantes!` 
                    }, { quoted: msg });

                    const dados = await baixarVideo(pedido.url, pedido.plataforma);

                    await socket.sendMessage(deOndeVeio, {
                        video: { url: dados.videoUrl },
                        caption: `🎬 *${dados.titulo}*\n📌 *Fonte:* ${dados.plataforma}\n👤 *Autor:* ${dados.autor}\n\n✅ _Vídeo pronto para assistir!_`
                    }, { quoted: msg });
                } 
                else if (opcaoEscolhida === '2') {
                    // OPÇÃO 2: Vídeo HD Original (Documento sem nenhuma compressão)
                    await socket.sendMessage(deOndeVeio, { 
                        text: `⏳ *Baixando em Qualidade Máxima HD (${pedido.plataforma})...*\nEnviaremos como arquivo original para não perder nitidez!` 
                    }, { quoted: msg });

                    const dados = await baixarVideo(pedido.url, pedido.plataforma);
                    const urlFinal = dados.videoHdUrl || dados.videoUrl;
                    const nomeArquivo = (dados.titulo.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'video') + '.mp4';

                    await socket.sendMessage(deOndeVeio, {
                        document: { url: urlFinal },
                        mimetype: 'video/mp4',
                        fileName: nomeArquivo,
                        caption: `🎬 *${dados.titulo}*\n📌 *Fonte:* ${dados.plataforma} (HD Máxima)\n👤 *Autor:* ${dados.autor}\n\n💎 _Arquivo 100% original sem compressão do WhatsApp!_`
                    }, { quoted: msg });
                } 
                else if (opcaoEscolhida === '3') {
                    // OPÇÃO 3: Apenas Áudio (MP3 / Música)
                    await socket.sendMessage(deOndeVeio, { 
                        text: `⏳ *Extraindo Áudio (${pedido.plataforma})...*\nAguarde alguns instantes!` 
                    }, { quoted: msg });

                    const dados = await baixarVideo(pedido.url, pedido.plataforma);
                    const urlAudio = dados.audioUrl || dados.videoUrl;
                    const nomeArquivo = (dados.titulo.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'audio') + '.mp3';

                    await socket.sendMessage(deOndeVeio, {
                        audio: { url: urlAudio },
                        mimetype: 'audio/mp4',
                        fileName: nomeArquivo,
                        ptt: false
                    }, { quoted: msg });
                }

                console.log(`✅ Pedido (opção ${opcaoEscolhida}) do ${pedido.plataforma} finalizado com sucesso!`);
                return;
            } catch (erro) {
                console.error('❌ Erro ao processar opção do menu:', erro.message);
                await socket.sendMessage(deOndeVeio, { 
                    text: `❌ *Falha ao baixar na opção ${opcaoEscolhida}.*\n\nMotivo: ${erro.message || 'Erro inesperado'}\n_Dica: O vídeo pode ser privado ou ter direitos protegidos._` 
                }, { quoted: msg });
                return;
            }
        }

        // 2️⃣ DETECÇÃO DE LINK (Dispara o Menu Interativo)
        const infoMidia = identificarPlataforma(textoRecebido);
        if (infoMidia) {
            console.log(`\n📥 Link detectado do ${infoMidia.plataforma}: ${infoMidia.url}`);

            // Registra a solicitação do usuário
            pedidosPendentes.set(chaveUsuario, {
                url: infoMidia.url,
                plataforma: infoMidia.plataforma,
                criadoEm: Date.now()
            });

            // Expira automaticamente em 2 minutos se o usuário não responder
            setTimeout(() => {
                if (pedidosPendentes.has(chaveUsuario)) {
                    const p = pedidosPendentes.get(chaveUsuario);
                    if (Date.now() - p.criadoEm >= 115000) {
                        pedidosPendentes.delete(chaveUsuario);
                    }
                }
            }, 2 * 60 * 1000);

            const menuTexto = 
`🎬 *Vídeo do ${infoMidia.plataforma} detectado!*

Como deseja baixar? Responda com o *número*:

1️⃣ - 📱 *Vídeo Normal* (Assistir direto no chat)
2️⃣ - 💎 *Vídeo HD Original* (Qualidade máxima sem perda)
3️⃣ - 🎵 *Apenas Áudio* (Música / MP3)

⏱️ _Envie 1, 2 ou 3 em até 2 minutos._`;

            await socket.sendMessage(deOndeVeio, { text: menuTexto }, { quoted: msg });
            return;
        }

        // SE a mensagem veio do seu grupo privado (Painel)
        if (deOndeVeio === ID_GRUPO_PAINEL) {
            console.log(`\n📢 Novo artigo recebido no painel. Repassando...`);
            
            // Envia exatamente o mesmo texto para o grupo da comunidade
            await socket.sendMessage(ID_GRUPO_COMUNIDADE, { text: textoRecebido });
            
            // Avisa no seu painel privado que deu certo
            await socket.sendMessage(ID_GRUPO_PAINEL, { text: '✅ Artigo enviado com sucesso para a comunidade!' }, { quoted: msg });
        }
    });
}

ligarBot();