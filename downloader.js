import { alldl } from 'rahad-all-downloader-v2';
import { snapsave } from 'snapsave-media-downloader';

// Evita checagens desnecessárias do ytdl no GitHub que podem atrasar downloads
process.env.YTDL_NO_UPDATE = '1';

/**
 * Resolve redirecionamentos de links encurtados (ex: vm.tiktok.com, /share/, etc.)
 */
export async function resolverUrlRedirecionada(url) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        clearTimeout(timer);
        return res.url || url;
    } catch {
        return url;
    }
}

/**
 * Executa uma promise com tempo limite máximo seguro
 */
function comTimeout(promise, ms, mensagem = 'Tempo limite de download excedido') {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(mensagem)), ms))
    ]);
}

/**
 * Extrai os dados e links diretos a partir das múltiplas estruturas do alldl
 */
function extrairDadosMidia(resAll, plataforma) {
    if (!resAll || !resAll.data) return null;
    const d = resAll.data;
    const dl = d.download || {};

    // 1. Extração de vídeo normal / SD / padrão
    const videoNormal = dl.url || 
                        dl.video || 
                        dl.no_watermark || 
                        dl.sd || 
                        dl.hd || 
                        d.videoUrl || 
                        d.video || 
                        d.url || 
                        (Array.isArray(dl.videos) && dl.videos[0]?.url) || 
                        null;

    // 2. Extração de vídeo HD / máxima qualidade
    const videoHd = dl.hd || 
                    dl.no_watermark || 
                    dl.video || 
                    dl.url || 
                    d.videoUrl || 
                    (Array.isArray(dl.videos) && dl.videos[dl.videos.length - 1]?.url) || 
                    videoNormal;

    // 3. Extração de áudio MP3
    const audio = dl.music || 
                  dl.audio || 
                  d.audioUrl || 
                  d.audio || 
                  videoNormal;

    if (!videoNormal) return null;

    return {
        titulo: (d.title || d.caption || d.desc || `Vídeo do ${plataforma}`).slice(0, 100).trim(),
        autor: d.author || d.uploader || d.owner?.nickname || d.owner?.username || plataforma,
        videoUrl: videoNormal,
        videoHdUrl: videoHd,
        audioUrl: audio,
        plataforma
    };
}

/**
 * Identifica a plataforma a partir da mensagem ou texto
 */
export function identificarPlataforma(texto) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = texto.match(urlRegex);
    if (!matches || matches.length === 0) return null;

    let url = matches[0].replace(/[),;.]+$/, '');

    if (/tiktok\.com/i.test(url)) return { plataforma: 'TikTok', url };
    if (/instagram\.com/i.test(url)) return { plataforma: 'Instagram', url };
    if (/youtube\.com\/(shorts|watch)|youtu\.be/i.test(url)) return { plataforma: 'YouTube', url };
    if (/facebook\.com|fb\.watch/i.test(url)) return { plataforma: 'Facebook', url };
    if (/twitter\.com|x\.com/i.test(url)) return { plataforma: 'Twitter', url };
    if (/pinterest\.com|pin\.it/i.test(url)) return { plataforma: 'Pinterest', url };
    if (/threads\.net/i.test(url)) return { plataforma: 'Threads', url };
    if (/kwai\.com|kuaishou\.com/i.test(url)) return { plataforma: 'Kwai', url };

    return null;
}

/**
 * Baixa mídia com sistema multi-fallback e tratamento resiliente de erros
 */
export async function baixarVideo(url, plataforma) {
    let urlFinal = url;

    // Se for link encurtado de compartilhamento móvel, resolve para o link canônico
    if (/(?:vm|vt)\.tiktok\.com|\/t\/|instagram\.com\/share|fb\.watch|pin\.it/i.test(url)) {
        urlFinal = await resolverUrlRedirecionada(url);
    }

    // 1. TIKTOK - Tenta primeiro via TikWM (Sem marca d'água e ultra rápido)
    if (plataforma === 'TikTok') {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 7000);
            const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(urlFinal)}`, { 
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            clearTimeout(timer);
            const json = await res.json();

            if (json?.data?.play) {
                const hdUrl = json.data.hdplay 
                    ? (json.data.hdplay.startsWith('http') ? json.data.hdplay : `https://www.tikwm.com${json.data.hdplay}`)
                    : json.data.play;

                return {
                    titulo: json.data.title || 'Vídeo do TikTok',
                    autor: json.data.author?.nickname || json.data.author?.unique_id || 'TikTok',
                    videoUrl: json.data.play,
                    videoHdUrl: hdUrl,
                    audioUrl: json.data.music || null,
                    plataforma: 'TikTok'
                };
            }
        } catch (e) {
            console.log('TikWM indisponível ou expirou, acionando fallback para TikTok...');
        }
    }

    // 2. INSTAGRAM - Tenta primeiro SnapSave
    if (plataforma === 'Instagram') {
        try {
            const resSnap = await comTimeout(snapsave(urlFinal), 8000);
            if (resSnap?.success && resSnap.data?.media?.length > 0) {
                const videoItem = resSnap.data.media.find(m => m.type === 'video') || resSnap.data.media[0];
                if (videoItem?.url) {
                    return {
                        titulo: resSnap.data.description || 'Reels do Instagram',
                        autor: 'Instagram',
                        videoUrl: videoItem.url,
                        videoHdUrl: videoItem.url,
                        audioUrl: videoItem.url,
                        plataforma: 'Instagram'
                    };
                }
            }
        } catch (e) {
            console.log('SnapSave indisponível para Instagram, acionando motor principal...');
        }
    }

    // 3. MOTOR PRINCIPAL MULTIPLATAFORMA (YouTube, Instagram fallback, Facebook, Twitter, Pinterest, etc.)
    try {
        const resAll = await comTimeout(alldl(urlFinal, { quality: '1080p' }), 25000);
        const dados = extrairDadosMidia(resAll, plataforma);

        if (dados && dados.videoUrl) {
            return dados;
        }
    } catch (e) {
        console.error(`Erro no extrator para ${plataforma}:`, e.message);
    }

    // Mensagens de erro específicas e amigáveis por plataforma
    if (plataforma === 'Instagram') {
        throw new Error('O Instagram bloqueou o acesso direto a este conteúdo. O perfil pode ser privado, o link pode ter expirado ou o vídeo foi removido.');
    }
    if (plataforma === 'TikTok') {
        throw new Error('Não foi possível obter o vídeo do TikTok. Verifique se o vídeo não é privado ou restrito.');
    }
    if (plataforma === 'YouTube') {
        throw new Error('Não foi possível obter o vídeo do YouTube. Pode conter restrição de idade ou direitos de transmissão.');
    }

    throw new Error(`Não foi possível obter o link de download direto do vídeo do ${plataforma}.`);
}
