# Maratona Bíblica

A Bíblia no formato de plataforma de streaming: **cada livro é uma série** e **cada grupo de capítulos é um episódio**. Troque a maratona de séries pela maratona da Palavra.

## Recursos

- **66 séries, 383 episódios** cobrindo os 1.189 capítulos, organizados no cânon evangélico (Pentateuco, Históricos, Poéticos, Profetas Maiores e Menores, Evangelhos, Atos, Cartas e Apocalipse), cada um com título, sinopse e duração estimada.
- **Arte própria gerada por código** para cada livro (pôster, banner e miniatura) e para cada episódio, com emblema e cenário ligados ao enredo.
- **Versões NVI, ARA e ARC** pela API [ABíbliaDigital](https://www.abibliadigital.com.br) (`/api/versions`, `/api/books`, `/api/verses/{versão}/{livro}/{capítulo}`). Se ela ficar fora do ar ou atingir o limite de requisições, o app passa sozinho para uma fonte JSON alternativa. Os capítulos lidos ficam guardados em IndexedDB e funcionam offline.
- **Perfis locais** no estilo "Quem está lendo?", com avatar, PIN opcional e versão preferida. Os dados ficam só no navegador, com exportação e importação de backup.
- **Leitor no estilo player**: barra de progresso dividida por capítulo, "Anteriormente em…", pular recapitulação, próximo episódio com contagem regressiva, temas escuro, sépia e claro, tamanho da fonte e atalhos (`N`, `P`, `Esc`).
- **Progresso automático**: o capítulo é marcado como lido quando você chega ao fim dele. O app também mostra "Continuar lendo", sequência de dias, meta diária, mapa de atividade e conquistas.
- **Devocionais** escritas como uma crítica da própria maratona, com nota de 1 a 5 estrelas, humor, versículo marcante e perguntas-guia.
- **Compartilhamento**: gera imagens para Stories (9:16) e Feed (1:1) com o progresso de uma série, um episódio concluído, a maratona geral, uma devocional ou um versículo. Dá para baixar, compartilhar pelo menu do sistema, enviar no WhatsApp ou copiar.
- Busca por livros, episódios e referências (`Jo 3:16`, `1 Samuel 17`), lista pessoal, avaliação 👍/❤️ e PWA instalável.

## Rodando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # produção em dist/
```

### Token da ABíbliaDigital (opcional)

Sem token, a API limita as requisições por hora. Cadastre-se no site da ABíbliaDigital e cole o token em **Configurações → Fonte dos textos**.

## Publicação

O workflow `.github/workflows/deploy.yml` publica no GitHub Pages a cada push na `main`. Para ativar, vá em *Settings → Pages → Source: GitHub Actions*.

## Estrutura

```
src/data/books.ts      catálogo: livros, sinopses, episódios, paletas e emblemas
src/lib/api.ts         ABíbliaDigital + fonte alternativa + cache
src/lib/art.ts         gerador procedural de arte (SVG)
src/lib/share.ts       imagens para redes sociais (canvas)
src/lib/store.tsx      perfis, progresso, lista, devocionais (localStorage)
src/pages/             Perfis, Início, Leitor, Diário, Minha maratona, Busca, Configurações
```
