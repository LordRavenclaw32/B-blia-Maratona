# BíbliaFlix

**Seu app de maratona bíblica.** A Bíblia no formato de plataforma de streaming: **cada livro é uma série** e **cada grupo de capítulos é um episódio**. Troque a maratona de séries pela maratona da Palavra.

## Recursos

- **66 séries, 383 episódios** cobrindo os 1.189 capítulos, organizados no cânon evangélico (Pentateuco, Históricos, Poéticos, Profetas Maiores e Menores, Evangelhos, Atos, Cartas e Apocalipse), cada um com título, sinopse e duração estimada.
- **Arte bíblica real**: cada série e cada episódio usa uma pintura ou gravura em domínio público do Wikimedia Commons (Tissot, Doré, Rembrandt, Caravaggio, Michelangelo, John Martin, William Blake…). A curadoria fica em `src/data/artQueries.ts`; o workflow *Resolver arte bíblica* busca as obras e grava `src/data/artManifest.json` (revisão em `scripts/art-report.md`). Os créditos aparecem no app.
- **Versões NVI, ARA e ARC** pela API [ABíbliaDigital](https://www.abibliadigital.com.br) (`/api/versions`, `/api/books`, `/api/verses/{versão}/{livro}/{capítulo}`). Se ela ficar fora do ar ou atingir o limite de requisições, o app passa sozinho para uma fonte JSON alternativa. Os capítulos lidos ficam guardados em IndexedDB e funcionam offline.
- **Perfis locais** no estilo "Quem está lendo?", com avatar, PIN opcional e versão preferida. Os dados ficam só no navegador, com exportação e importação de backup.
- **Leitor no estilo player**: barra de progresso dividida por capítulo, "Anteriormente em…", pular recapitulação, próximo episódio com contagem regressiva, temas escuro, sépia e claro, tamanho da fonte e atalhos (`N`, `P`, `Esc`).
- **Progresso automático**: o capítulo é marcado como lido quando você chega ao fim dele. O app também mostra "Continuar lendo", sequência de dias, meta diária, mapa de atividade e conquistas.
- **Devocionais** escritas como uma crítica da própria maratona, com nota de 1 a 5 estrelas, humor, versículo marcante e perguntas-guia.
- **Compartilhamento**: gera imagens para Stories (9:16) e Feed (1:1) com o progresso de uma série, um episódio concluído, a maratona geral, uma devocional ou um versículo. Dá para baixar, compartilhar pelo menu do sistema, enviar no WhatsApp ou copiar.
- Busca por livros, episódios e referências (`Jo 3:16`, `1 Samuel 17`), lista pessoal, avaliação 👍/❤️ e PWA instalável.

## Testar agora

- **Link de teste (direto do repositório):** https://raw.githack.com/LordRavenclaw32/BibliaFlix-Maratona/gh-pages/index.html
- **Link oficial (GitHub Pages):** https://lordravenclaw32.github.io/BibliaFlix-Maratona/ — se ainda não abrir, ative uma vez em *Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `gh-pages` / root*.

No celular, abra o link e use **Adicionar à tela inicial** para instalar como app (PWA).

## Novidades

- 🎵 **Louvor de fundo** na barra superior com **YouTube Music**: cole o link de uma playlist ou música (ou escolha uma sugestão). A música continua enquanto você navega e lê; o painel recolhe e fica só o controle ▶/⏸ na barra.
- ⚙️ **Configurações rápidas**: tela cheia, volume do louvor, fazer/carregar backup, importar outra versão da Bíblia em JSON (66 livros) e sair da conta/app.
- **Temporadas ilustradas**: cada coleção (Pentateuco, Históricos, Poéticos, Profetas, Evangelhos, Cartas…) tem um banner temático.
- 🎨 **Capas personalizadas**: em cada série (botão *Personalizar capa*) e em cada episódio (ícone de imagem na miniatura), escolha uma arte da galeria bíblica do app ou envie a sua, com estilos *Bíblico, Cinema, Dourado, Noite e P&B*. A capa vale no app e nas imagens de compartilhamento, e entra no backup.
- **Imagens locais**: todas as obras são baixadas para `public/art/c` pelo workflow, sem depender de links externos.

## Louvor de fundo (YouTube Music)

No painel 🎵, **Entrar no YouTube Music** abre o login da sua conta Google (com YouTube Premium, sem anúncios). Aceita links `music.youtube.com/playlist?list=…`, `music.youtube.com/browse/VL…`, `music.youtube.com/watch?v=…`, `youtube.com/watch?v=…&list=…` e `youtu.be/…`. Faixas que as gravadoras bloqueiam fora do YouTube são puladas automaticamente; se a playlist inteira for bloqueada, use **Abrir no YouTube Music**.

## Rodando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # produção em dist/
```

### Token da ABíbliaDigital (opcional)

Sem token, a API limita as requisições por hora. Cadastre-se no site da ABíbliaDigital e cole o token em **Configurações → Fonte dos textos**.

## Publicação

O workflow `.github/workflows/deploy.yml` gera o build e publica no branch `gh-pages` a cada push (e após cada atualização das artes). Para instalar localmente:

```bash
git clone https://github.com/LordRavenclaw32/BibliaFlix-Maratona.git
cd BibliaFlix-Maratona
npm install
npm run dev
```

## Estrutura

```
src/data/books.ts      catálogo: livros, sinopses, episódios, paletas e emblemas
src/lib/api.ts         ABíbliaDigital + fonte alternativa + cache
src/data/artQueries.ts curadoria das obras por livro/episódio
src/lib/paintings.ts   obras do Wikimedia Commons (com arte vetorial reserva)
src/lib/share.ts       imagens para redes sociais (canvas)
src/lib/store.tsx      perfis, progresso, lista, devocionais (localStorage)
src/pages/             Perfis, Início, Leitor, Diário, Minha maratona, Busca, Configurações
```
