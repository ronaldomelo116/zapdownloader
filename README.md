# 🤖 WhatsApp Bot - Multi-Downloader & Gestão de Grupos

Um bot completo para WhatsApp desenvolvido em **Node.js** com a biblioteca **[@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)**. Possui um sistema inteligente de **download de mídias** com menu interativo de qualidade e um módulo de **retransmissão automática de mensagens** entre grupos.

---

## ✨ Funcionalidades Principais

* **🎬 Baixador de Mídia Inteligente:**
  * **TikTok:** Vídeos em alta qualidade e **sem marca d'água**.
  * **YouTube:** Suporte a vídeos convencionais e **YouTube Shorts**.
  * **Instagram:** Download de **Reels** e publicações públicas.
  * **Bônus:** Compatível também com **Facebook**, **Twitter/X** e **Pinterest**.

* **🎛️ Menu Interativo de Escolha (Qualidade & Formato):**
  * Ao enviar qualquer link suportado, o bot apresenta um menu para escolher:
    * `1` - 📱 **Vídeo Normal:** Otimizado para reproduzir direto no player do WhatsApp.
    * `2` - 💎 **Vídeo HD Original:** Enviado em formato de documento (`.mp4`), preservando 100% da resolução e taxa de bits original (sem a compressão padrão do WhatsApp).
    * `3` - 🎵 **Apenas Áudio (MP3):** Extrai apenas a faixa de áudio ou música do vídeo.

* **🔄 Autocura e Reconexão:**
  * Reconexão automática em caso de oscilações de rede.
  * Se a sessão for desvinculada no celular, o bot apaga as chaves antigas e gera um **novo QR Code** automaticamente no terminal.

* **📢 Retransmissão entre Grupos (Painel ➔ Comunidade):**
  * Mensagens enviadas em um grupo privado configurado são automaticamente replicadas para o grupo ou comunidade principal com confirmação de entrega.

---

## 📁 Estrutura do Projeto

```text
bot-whatsapp/
├── conexao_bot/          # Pasta gerada automaticamente com as credenciais da sessão
├── downloader.js         # Módulo responsável pela detecção de links e extração de mídias
├── index.js              # Inicialização do bot, conexão Baileys e manipulação de eventos
├── package.json          # Metadados e dependências do projeto
└── README.md             # Documentação do projeto
```

---

## 🚀 Pré-requisitos

* [Node.js](https://nodejs.org/) versão **18** ou superior.
* Conexão ativa com a internet.
* Uma conta de WhatsApp para escanear o QR Code.

---

## 📦 Instalação

1. Clone ou acesse a pasta do projeto:
   ```bash
   cd c:\Users\win10\Documents\PROJETOS\bot-whatsapp
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

---

## ⚙️ Como Usar

### 1. Iniciar o Bot
Execute no terminal:
```bash
node index.js
```

### 2. Conectar com o WhatsApp
* Na primeira execução, um **QR Code** será exibido no terminal.
* Abra o WhatsApp no celular:
  * Vá em **Configurações / Opções** ➔ **Aparelhos conectados**.
  * Toque em **Conectar um aparelho** e escaneie o código do terminal.
* Quando a mensagem `✅ BOT CONECTADO COM SUCESSO E PRONTO!` aparecer, o bot já estará ativo.

---

## 🎮 Como Usar o Menu de Download

1. Em qualquer conversa privada ou grupo onde o bot esteja presente, envie um link de vídeo:
   ```text
   https://www.tiktok.com/@usuario/video/123456789
   ```

2. O bot responderá com o menu:
   ```text
   🎬 Vídeo do TikTok detectado!

   Como deseja baixar? Responda com o número:

   1️⃣ - 📱 Vídeo Normal (Assistir direto no chat)
   2️⃣ - 💎 Vídeo HD Original (Qualidade máxima sem perda)
   3️⃣ - 🎵 Apenas Áudio (Música / MP3)

   ⏱️ Envie 1, 2 ou 3 em até 2 minutos.
   ```

3. Responda apenas com o número desejado:
   * **`1`**: Receba o vídeo direto para assistir no chat.
   * **`2`**: Receba o vídeo em alta definição sem compressão (formato de arquivo).
   * **`3`**: Receba o áudio/música extraído.

---

## 🔧 Configuração de Encaminhamento de Grupos

No arquivo `index.js`, você pode definir o ID dos seus grupos para o repasse automático:

```javascript
const ID_GRUPO_PAINEL = 'MUDE_AQUI_O_ID_DO_SEU_PAINEL'; 
const ID_GRUPO_COMUNIDADE = 'MUDE_AQUI_O_ID_DO_GRUPO_DA_COMUNIDADE';
```

> 💡 **Como descobrir o ID do grupo?**  
> Quando qualquer mensagem for enviada no grupo, o bot exibirá no terminal:  
> `📩 Mensagem recebida no chat ID: 120363xxxxxx@g.us`  
> Copie esse valor e cole nas constantes correspondentes.

---

## 🛠️ Tecnologias Utilizadas

* **[@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys):** Conexão direta com a API do WhatsApp Web via WebSockets.
* **[qrcode-terminal](https://www.npmjs.com/package/qrcode-terminal):** Exibição do QR Code de autenticação no terminal.
* **[rahad-all-downloader-v2](https://www.npmjs.com/package/rahad-all-downloader-v2):** Extração de mídias de plataformas sociais.
* **[snapsave-media-downloader](https://www.npmjs.com/package/snapsave-media-downloader):** Scraper complementar para Instagram e outras redes.
* **TikWM API:** Serviço de extração rápida de vídeos HD do TikTok sem marca d'água.

---

## 🛡️ Resolução de Problemas Comuns

* **Apareceu `Conexão fechada. Tentando reconectar...`?**  
  O bot agora trata desconexões automaticamente: se a sessão for revogada, a pasta `conexao_bot` é limpa e um novo QR Code é exibido na tela.
* **O vídeo do Instagram deu erro?**  
  Certifique-se de que a publicação ou Reel é de uma conta **pública**. Vídeos privados não podem ser baixados sem autenticação.
