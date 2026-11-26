import { alldl } from 'rahad-all-downloader-v2';
import { snapsave } from 'snapsave-media-downloader';

/**
 * Identifica a plataforma a partir da URL
 */
export function identificarPlataforma(texto) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = texto.match(urlRegex);
    if (!matches || matches.length === 0) return null;

    const url = matches[0];

    if (/tiktok\.com/i.test(url)) return { plataforma: 'TikTok', url };
    if (/instagram\.com\/(reel|p|reels)\//i.test(url)) return { plataforma: 'Instagram', url };
    if (/youtube\.com\/(shorts|watch)|youtu\.be/i.test(url)) return { plataforma: 'YouTube', url };
    if (/facebook\.com|fb\.watch/i.test(url)) return { plataforma: 'Facebook', url };
    if (/twitter\.com|x\.com/i.test(url)) return { plataforma: 'Twitter', url };

    return null;
}

/**
 * Baixa mídia de qualquer uma das redes suportadas
 */
export async function baixarVideo(url, plataforma) {
    // 1. TIKTOK - Mais rápido via TikWM (Sem marca d'água)
    if (plataforma === 'TikTok') {
        try {
            const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
            const json = await res.json();
            if (json?.data?.play) {
                const hdUrl = json.data.hdplay 
                    ? (json.data.hdplay.startsWith('http') ? json.data.hdplay : `https://www.tikwm.com${json.data.hdplay}`)
                    : json.data.play;

                return {
                    titulo: json.data.title || 'Vídeo do TikTok',
                    autor: json.data.author?.nickname || json.data.author?.unique_id || 'TikTok',
                    videoUrl: json.data.play, // Normal
                    videoHdUrl: hdUrl, // Máxima qualidade HD
                    audioUrl: json.data.music || null, // Áudio MP3
                    plataforma: 'TikTok'
                };
            }
        } catch (e) {
            console.log('TikWM falhou, tentando fallback...');
        }
    }

    // 2. INSTAGRAM - Tenta SnapSave primeiro
    if (plataforma === 'Instagram') {
        try {
            const resSnap = await snapsave(url);
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
            console.log('SnapSave falhou no Instagram, tentando fallback...');
        }
    }

    // 3. MULTIPLATAFORMA (YouTube, Instagram fallback, Facebook, Twitter, etc.)
    try {
        const resAll = await alldl(url, { quality: '1080p' });
        const videoNormal = resAll?.data?.videoUrl || 
                            resAll?.data?.download?.no_watermark || 
                            resAll?.data?.download?.sd || 
                            resAll?.data?.download?.hd;
        const videoHd = resAll?.data?.download?.hd || 
                        resAll?.data?.download?.no_watermark || 
                        resAll?.data?.videoUrl;
        const audio = resAll?.data?.download?.music || null;

        if (videoNormal) {
            return {
                titulo: resAll.data.title || `Vídeo do ${plataforma}`,
                autor: resAll.data.uploader || resAll.data.owner?.nickname || plataforma,
                videoUrl: videoNormal,
                videoHdUrl: videoHd,
                audioUrl: audio || videoNormal,
                plataforma: plataforma
            };
        }
    } catch (e) {
        console.error(`Erro no downloader para ${plataforma}:`, e.message);
    }

    throw new Error('Não foi possível obter o link de download direto do vídeo.');
}
