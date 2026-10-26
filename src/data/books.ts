import { VERSE_COUNTS } from './verseCounts';

export type Testament = 'AT' | 'NT';
export type Group =
  | 'Pentateuco'
  | 'Históricos'
  | 'Poéticos'
  | 'Profetas Maiores'
  | 'Profetas Menores'
  | 'Evangelhos'
  | 'Igreja Primitiva'
  | 'Cartas Paulinas'
  | 'Cartas Gerais'
  | 'Profecia';

export type Scene = 'garden' | 'desert' | 'sea' | 'mountain' | 'city' | 'night' | 'temple' | 'field' | 'storm' | 'dawn';

export interface Episode {
  /** 1-based index within the book */
  n: number;
  start: number;
  end: number;
  title: string;
  synopsis: string;
}

export interface Book {
  id: string;
  /** abreviação usada pela ABíbliaDigital */
  abbrev: string;
  /** posição canônica 0..65 */
  index: number;
  name: string;
  testament: Testament;
  group: Group;
  author: string;
  date: string;
  tags: string[];
  tagline: string;
  synopsis: string;
  keyVerse: string;
  motif: string;
  scene: Scene;
  palette: [string, string, string];
  chapters: number;
  episodes: Episode[];
}

type Ep = [number, number, string, string];
type Raw = Omit<Book, 'index' | 'chapters' | 'episodes'> & { eps: Ep[] };

const RAW: Raw[] = [
  // ───────────────────────── PENTATEUCO ─────────────────────────
  {
    id: 'gn', abbrev: 'gn', name: 'Gênesis', testament: 'AT', group: 'Pentateuco', author: 'Moisés', date: 'c. 1445 a.C.',
    tags: ['Épico', 'Origens', 'Drama familiar'], tagline: 'No princípio, tudo começou com uma palavra.',
    synopsis: 'Da criação do universo à formação de uma família escolhida. Gênesis acompanha a queda da humanidade, o dilúvio, a torre de Babel e as jornadas de Abraão, Isaque, Jacó e José — uma saga de promessas, traições e reconciliação.',
    keyVerse: 'Gênesis 1:1', motif: 'tree', scene: 'garden', palette: ['#0d2b1d', '#2f7a4c', '#f4c95d'],
    eps: [
      [1, 2, 'A Criação', 'Em sete dias, Deus forma céus, terra e a humanidade à sua imagem.'],
      [3, 5, 'A Queda', 'A serpente, o fruto proibido e o primeiro assassinato da história.'],
      [6, 9, 'O Dilúvio', 'Noé constrói a arca enquanto o mundo afunda em violência.'],
      [10, 11, 'A Torre de Babel', 'A humanidade tenta alcançar o céu e Deus confunde as línguas.'],
      [12, 14, 'O Chamado de Abrão', 'Um homem deixa tudo para trás rumo a uma terra desconhecida.'],
      [15, 17, 'A Aliança', 'Estrelas incontáveis, uma promessa impossível e um novo nome.'],
      [18, 20, 'Sodoma e Gomorra', 'Abraão intercede, mas o fogo cai sobre as cidades da planície.'],
      [21, 23, 'O Filho da Promessa', 'Isaque nasce, e Abraão enfrenta o maior teste de sua fé no monte Moriá.'],
      [24, 26, 'Uma Noiva para Isaque', 'Rebeca no poço, os gêmeos rivais e uma primogenitura vendida.'],
      [27, 30, 'Jacó, o Enganador', 'Uma bênção roubada, uma escada até o céu e um casamento armado.'],
      [31, 33, 'A Luta com Deus', 'Jacó luta a noite inteira e sai mancando — e abençoado.'],
      [34, 36, 'De Volta a Betel', 'Violência em Siquém e o retorno ao lugar do encontro com Deus.'],
      [37, 39, 'José, o Sonhador', 'Vendido pelos irmãos, José vai parar no Egito.'],
      [40, 41, 'Do Cárcere ao Palácio', 'Sonhos interpretados levam um prisioneiro ao trono do Egito.'],
      [42, 45, 'O Reencontro', 'A fome traz os irmãos ao Egito — e José revela quem é.'],
      [46, 50, 'Israel no Egito', 'Jacó abençoa os filhos: "Vocês planejaram o mal, Deus o tornou em bem."'],
    ],
  },
  {
    id: 'ex', abbrev: 'ex', name: 'Êxodo', testament: 'AT', group: 'Pentateuco', author: 'Moisés', date: 'c. 1445 a.C.',
    tags: ['Épico', 'Libertação', 'Aventura'], tagline: 'Deixa o meu povo ir.',
    synopsis: 'Escravizado no Egito, Israel clama — e Deus levanta Moisés. Pragas, a Páscoa, a travessia do Mar Vermelho e a entrega da Lei no Sinai transformam um povo de escravos na nação da aliança.',
    keyVerse: 'Êxodo 3:14', motif: 'tablets', scene: 'sea', palette: ['#0a1f3a', '#1f6aa5', '#f2b134'],
    eps: [
      [1, 2, 'Nasce um Libertador', 'Um bebê hebreu escapa da morte num cesto sobre o Nilo.'],
      [3, 4, 'A Sarça Ardente', '"EU SOU O QUE SOU" — Moisés recebe sua missão.'],
      [5, 6, 'Mais Tijolos, Menos Palha', 'Faraó endurece, o povo sofre e Deus renova sua promessa.'],
      [7, 10, 'As Pragas', 'Sangue, rãs, gafanhotos e trevas: o Egito sente o braço do Senhor.'],
      [11, 13, 'A Páscoa', 'O sangue do cordeiro nos umbrais e a saída de madrugada.'],
      [14, 15, 'O Mar Vermelho', 'Encurralados entre o exército e o mar, eles atravessam a pé enxuto.'],
      [16, 18, 'Pão do Céu', 'Maná no deserto, água da rocha e a primeira batalha.'],
      [19, 20, 'Os Dez Mandamentos', 'Trovões no Sinai e as palavras que mudaram o mundo.'],
      [21, 24, 'O Livro da Aliança', 'Leis para a vida em comunidade e o pacto selado com sangue.'],
      [25, 27, 'A Planta do Tabernáculo', 'Arca, mesa e candelabro: Deus quer habitar no meio do povo.'],
      [28, 31, 'Sacerdotes Consagrados', 'Vestes sagradas, ofertas e o sábado como sinal.'],
      [32, 34, 'O Bezerro de Ouro', 'Idolatria ao pé do monte, intercessão e a glória que passa.'],
      [35, 40, 'A Glória Enche a Tenda', 'O Tabernáculo é erguido e a nuvem de Deus desce sobre ele.'],
    ],
  },
  {
    id: 'lv', abbrev: 'lv', name: 'Levítico', testament: 'AT', group: 'Pentateuco', author: 'Moisés', date: 'c. 1445 a.C.',
    tags: ['Santidade', 'Liturgia', 'Leis'], tagline: 'Sede santos, porque eu sou santo.',
    synopsis: 'O manual de santidade de Israel. Ofertas, sacerdócio, pureza, o Dia da Expiação e as festas revelam como um povo imperfeito pode se aproximar de um Deus santo.',
    keyVerse: 'Levítico 19:2', motif: 'altar', scene: 'temple', palette: ['#2b0f0a', '#8c3b1f', '#ffcf70'],
    eps: [
      [1, 7, 'As Ofertas', 'Holocaustos, ofertas de paz e pelo pecado: o caminho da aproximação.'],
      [8, 10, 'A Consagração', 'Arão e seus filhos são ordenados — e o fogo estranho custa caro.'],
      [11, 15, 'Puro e Impuro', 'Alimentos, doenças e purificação: santidade no cotidiano.'],
      [16, 17, 'O Dia da Expiação', 'O bode emissário leva embora os pecados do povo.'],
      [18, 22, 'Sede Santos', '"Ame o seu próximo como a si mesmo" no coração da Lei.'],
      [23, 25, 'Festas e Jubileu', 'O calendário sagrado e o ano em que tudo é restaurado.'],
      [26, 27, 'Bênçãos e Votos', 'As promessas da obediência e o valor dos votos.'],
    ],
  },
  {
    id: 'nm', abbrev: 'nm', name: 'Números', testament: 'AT', group: 'Pentateuco', author: 'Moisés', date: 'c. 1405 a.C.',
    tags: ['Jornada', 'Deserto', 'Drama'], tagline: 'Quarenta anos. Uma geração. Uma promessa.',
    synopsis: 'Israel marcha pelo deserto rumo à Terra Prometida, mas a incredulidade transforma onze dias de viagem em quarenta anos. Rebeliões, milagres e a fidelidade de Deus a uma nova geração.',
    keyVerse: 'Números 6:24-26', motif: 'tent', scene: 'desert', palette: ['#2a1a07', '#b0702b', '#ffe3a3'],
    eps: [
      [1, 4, 'O Censo', 'As tribos são contadas e organizadas ao redor do Tabernáculo.'],
      [5, 8, 'O Acampamento', 'Votos de nazireu e a bênção sacerdotal: "O Senhor te abençoe e te guarde".'],
      [9, 10, 'A Nuvem se Move', 'Quando a nuvem se levanta, o povo parte.'],
      [11, 12, 'Murmurações', 'Codornizes, setenta anciãos e o ciúme de Miriã e Arão.'],
      [13, 14, 'Os Doze Espias', 'Gigantes na terra, medo no coração — e quarenta anos no deserto.'],
      [15, 17, 'A Rebelião de Corá', 'A terra se abre e a vara de Arão floresce.'],
      [18, 20, 'Água da Rocha', 'Moisés fere a rocha e perde a entrada em Canaã.'],
      [21, 21, 'A Serpente de Bronze', 'Olhar para a serpente erguida é escolher viver.'],
      [22, 24, 'Balaão e a Jumenta', 'Um profeta contratado para amaldiçoar só consegue abençoar.'],
      [25, 27, 'Uma Nova Geração', 'O pecado de Baal-Peor, novo censo e Josué como sucessor.'],
      [28, 30, 'Ofertas e Votos', 'O ritmo das ofertas e a seriedade das promessas.'],
      [31, 33, 'Às Margens do Jordão', 'Tribos se estabelecem a leste e o diário da jornada.'],
      [34, 36, 'As Fronteiras da Herança', 'Limites da terra, cidades de refúgio e as filhas de Zelofeade.'],
    ],
  },
  {
    id: 'dt', abbrev: 'dt', name: 'Deuteronômio', testament: 'AT', group: 'Pentateuco', author: 'Moisés', date: 'c. 1405 a.C.',
    tags: ['Discurso', 'Aliança', 'Despedida'], tagline: 'Escolhe, pois, a vida.',
    synopsis: 'Às portas de Canaã, Moisés faz seus últimos discursos. Ele relembra a jornada, renova a aliança e chama Israel a amar o Senhor de todo o coração — antes de contemplar a terra do alto do monte Nebo.',
    keyVerse: 'Deuteronômio 6:4-5', motif: 'scroll', scene: 'mountain', palette: ['#1d1430', '#6b4fa0', '#f7d38a'],
    eps: [
      [1, 3, 'Olhando para Trás', 'Moisés relembra quarenta anos de jornada.'],
      [4, 6, 'Ouve, ó Israel', 'O Shemá: amar a Deus de todo o coração, alma e força.'],
      [7, 11, 'Não Só de Pão', 'Uma terra boa espera — mas não se esqueça de quem a deu.'],
      [12, 16, 'O Lugar Escolhido', 'Adoração, dízimos, o ano da remissão e as festas.'],
      [17, 20, 'Reis, Profetas e Juízes', 'Justiça para a nação e a promessa de um profeta como Moisés.'],
      [21, 26, 'Leis para a Vida', 'Família, compaixão e justiça no dia a dia.'],
      [27, 28, 'Bênçãos e Maldições', 'Do monte Gerizim e do monte Ebal ecoam as consequências.'],
      [29, 30, 'Escolhe a Vida', 'A renovação da aliança: vida e morte diante de você.'],
      [31, 34, 'O Adeus de Moisés', 'O cântico, a bênção das tribos e a morte no monte Nebo.'],
    ],
  },
  // ───────────────────────── HISTÓRICOS ─────────────────────────
  {
    id: 'js', abbrev: 'js', name: 'Josué', testament: 'AT', group: 'Históricos', author: 'Josué', date: 'c. 1390 a.C.',
    tags: ['Conquista', 'Batalhas', 'Coragem'], tagline: 'Seja forte e corajoso.',
    synopsis: 'Josué lidera Israel na conquista de Canaã. Muralhas que caem, o sol que para e a divisão da herança mostram que Deus cumpre cada promessa que faz.',
    keyVerse: 'Josué 1:9', motif: 'walls', scene: 'city', palette: ['#2b1608', '#a5521f', '#ffd27a'],
    eps: [
      [1, 2, 'Forte e Corajoso', 'Um novo líder e uma espiã improvável: Raabe e o cordão vermelho.'],
      [3, 5, 'Atravessando o Jordão', 'As águas se abrem e Israel pisa a Terra Prometida.'],
      [6, 6, 'As Muralhas de Jericó', 'Sete dias, sete voltas, um grito — e os muros caem.'],
      [7, 8, 'Acã e Ai', 'Um pecado escondido derrota um exército inteiro.'],
      [9, 12, 'O Sol Parado', 'Um pacto enganoso e o dia em que o sol se deteve.'],
      [13, 17, 'Repartindo a Terra', 'Calebe, aos 85 anos, pede a sua montanha.'],
      [18, 21, 'Cidades de Refúgio', 'Nenhuma promessa falhou: todas se cumpriram.'],
      [22, 24, 'Eu e a Minha Casa', 'O desafio final de Josué: a quem vocês vão servir?'],
    ],
  },
  {
    id: 'jz', abbrev: 'jz', name: 'Juízes', testament: 'AT', group: 'Históricos', author: 'Samuel (tradição)', date: 'c. 1050 a.C.',
    tags: ['Ação', 'Heróis improváveis', 'Ciclos'], tagline: 'Cada um fazia o que achava certo.',
    synopsis: 'Sem um rei, Israel entra num ciclo de pecado, opressão, clamor e livramento. Débora, Gideão e Sansão são heróis falhos usados por um Deus que nunca desiste do seu povo.',
    keyVerse: 'Juízes 21:25', motif: 'sword', scene: 'storm', palette: ['#1a0d0d', '#7a1f1f', '#e8a35a'],
    eps: [
      [1, 2, 'O Ciclo Começa', 'Uma nova geração que não conhecia o Senhor.'],
      [3, 3, 'Otniel, Eúde e Sangar', 'Um juiz canhoto e uma aguilhada de bois.'],
      [4, 5, 'Débora e Baraque', 'Uma profetisa, um general hesitante e a estaca de Jael.'],
      [6, 8, 'Gideão', 'Velo de lã, trezentos homens e cântaros quebrados.'],
      [9, 10, 'Abimeleque', 'Um rei autoproclamado e a parábola das árvores.'],
      [11, 12, 'Jefté', 'Rejeitado pelos irmãos, chamado para liderar — e um voto trágico.'],
      [13, 14, 'O Nascimento de Sansão', 'Um nazireu desde o ventre e um leão nas vinhas.'],
      [15, 16, 'Sansão e Dalila', 'Força, traição e uma última oração entre as colunas.'],
      [17, 18, 'Mica e os Danitas', 'Ídolos domésticos e uma tribo sem rumo.'],
      [19, 21, 'Sem Rei em Israel', 'O ponto mais sombrio de uma nação que perdeu o norte.'],
    ],
  },
  {
    id: 'rt', abbrev: 'rt', name: 'Rute', testament: 'AT', group: 'Históricos', author: 'Desconhecido', date: 'c. 1000 a.C.',
    tags: ['Romance', 'Lealdade', 'Redenção'], tagline: 'O teu povo será o meu povo.',
    synopsis: 'Em tempos de fome e luto, uma estrangeira moabita escolhe a lealdade. Nos campos de Boaz, Rute encontra redenção — e entra na linhagem do rei Davi.',
    keyVerse: 'Rute 1:16', motif: 'wheat', scene: 'field', palette: ['#2a1c05', '#c08a2c', '#fff0b8'],
    eps: [
      [1, 1, 'O Teu Povo é o Meu Povo', 'Noemi volta para casa amargurada, e Rute se recusa a deixá-la.'],
      [2, 2, 'Nos Campos de Boaz', 'Uma colheita de favor inesperado.'],
      [3, 3, 'Na Eira', 'Um pedido ousado à meia-noite.'],
      [4, 4, 'O Resgatador', 'Boaz redime Rute — e nasce o avô de Davi.'],
    ],
  },
  {
    id: '1sm', abbrev: '1sm', name: '1 Samuel', testament: 'AT', group: 'Históricos', author: 'Samuel e outros', date: 'c. 930 a.C.',
    tags: ['Drama', 'Realeza', 'Ascensão e queda'], tagline: 'O homem vê a aparência; o Senhor vê o coração.',
    synopsis: 'Do clamor de Ana ao trágico fim de Saul. Israel pede um rei, recebe Saul, mas Deus escolhe um jovem pastor chamado Davi. Gigantes, amizades leais e perseguições no deserto.',
    keyVerse: '1 Samuel 16:7', motif: 'sling', scene: 'mountain', palette: ['#0f1e2a', '#3c6e71', '#e9c46a'],
    eps: [
      [1, 3, 'Ana e o Menino Samuel', 'Uma oração silenciosa e uma voz que chama de noite.'],
      [4, 7, 'A Arca Capturada', 'Os filisteus levam a arca — e descobrem que não podem ficar com ela.'],
      [8, 10, 'Queremos um Rei', 'Israel quer ser como as nações; Saul é ungido.'],
      [11, 12, 'Saul é Confirmado', 'Vitória em Jabes e o discurso de despedida de Samuel.'],
      [13, 15, 'A Rejeição de Saul', '"Obedecer é melhor do que sacrificar."'],
      [16, 17, 'Davi e Golias', 'Um pastor ungido, uma funda e cinco pedras lisas.'],
      [18, 20, 'Davi e Jônatas', 'Ciúme no palácio e uma amizade selada diante de Deus.'],
      [21, 24, 'Fugitivo', 'Cavernas, fome e o manto de Saul cortado em silêncio.'],
      [25, 27, 'Abigail e a Lança Poupada', 'Sabedoria que evita sangue e misericórdia ao inimigo.'],
      [28, 31, 'O Fim de Saul', 'A médium de En-Dor e a batalha no monte Gilboa.'],
    ],
  },
  {
    id: '2sm', abbrev: '2sm', name: '2 Samuel', testament: 'AT', group: 'Históricos', author: 'Natã e Gade (tradição)', date: 'c. 930 a.C.',
    tags: ['Drama político', 'Realeza', 'Família'], tagline: 'Um reino eterno, um rei imperfeito.',
    synopsis: 'Davi se torna rei de todo Israel, conquista Jerusalém e recebe a promessa de um trono eterno. Mas o pecado com Bate-Seba desencadeia tragédias dentro de sua própria casa.',
    keyVerse: '2 Samuel 7:16', motif: 'crown', scene: 'city', palette: ['#1f0d29', '#6a2c70', '#f7c548'],
    eps: [
      [1, 4, 'Lamento e Guerra Civil', '"Como caíram os valentes!" — e a disputa pelo trono.'],
      [5, 7, 'O Rei em Jerusalém', 'A conquista de Sião, a dança diante da arca e a aliança davídica.'],
      [8, 10, 'Bondade a Mefibosete', 'Vitórias militares e um lugar à mesa do rei.'],
      [11, 12, 'Davi e Bate-Seba', 'Um terraço, um crime e o profeta: "Você é esse homem!"'],
      [13, 14, 'Amnom, Tamar e Absalão', 'A ferida na família real se aprofunda.'],
      [15, 18, 'A Revolta de Absalão', 'O filho rouba o coração do povo; o pai foge chorando.'],
      [19, 20, 'O Retorno do Rei', 'Lágrimas por Absalão e um reino a ser reunido.'],
      [21, 24, 'Os Últimos Feitos', 'Os valentes de Davi, seu cântico e a eira de Araúna.'],
    ],
  },
  {
    id: '1rs', abbrev: '1rs', name: '1 Reis', testament: 'AT', group: 'Históricos', author: 'Jeremias (tradição)', date: 'c. 560 a.C.',
    tags: ['Épico', 'Sabedoria', 'Profetas'], tagline: 'Glória, divisão e fogo do céu.',
    synopsis: 'Salomão constrói o Templo e brilha em sabedoria, mas seu coração se divide — e o reino também. Então surge Elias, o profeta do fogo, contra Acabe, Jezabel e os profetas de Baal.',
    keyVerse: '1 Reis 18:21', motif: 'temple', scene: 'temple', palette: ['#20160a', '#8a6a2a', '#ffe28a'],
    eps: [
      [1, 2, 'Salomão é Coroado', 'Intrigas palacianas e as últimas palavras de Davi.'],
      [3, 4, 'A Sabedoria de Salomão', 'Um pedido que agrada a Deus e o julgamento das duas mães.'],
      [5, 8, 'O Templo', 'Cedros, ouro e a glória que enche a casa do Senhor.'],
      [9, 11, 'Glória e Queda', 'A rainha de Sabá se maravilha; mil mulheres desviam o coração do rei.'],
      [12, 14, 'O Reino Dividido', 'Roboão, Jeroboão e os bezerros de ouro.'],
      [15, 16, 'Reis em Sequência', 'Golpes, dinastias e a chegada de Acabe.'],
      [17, 18, 'Elias no Carmelo', 'Corvos, uma viúva e fogo que cai do céu.'],
      [19, 19, 'A Voz Mansa', 'Esgotado, Elias encontra Deus num sussurro.'],
      [20, 22, 'A Vinha de Nabote', 'Ganância real, justiça divina e o fim de Acabe.'],
    ],
  },
  {
    id: '2rs', abbrev: '2rs', name: '2 Reis', testament: 'AT', group: 'Históricos', author: 'Jeremias (tradição)', date: 'c. 560 a.C.',
    tags: ['Épico', 'Milagres', 'Tragédia'], tagline: 'Do carro de fogo ao exílio.',
    synopsis: 'Elias sobe num redemoinho e Eliseu herda porção dobrada. Reis bons e maus se alternam até que Israel cai diante da Assíria e Judá é levado para a Babilônia.',
    keyVerse: '2 Reis 2:11', motif: 'flame', scene: 'storm', palette: ['#250a05', '#b23a1a', '#ffb547'],
    eps: [
      [1, 2, 'O Carro de Fogo', 'Elias é levado ao céu e o manto passa a Eliseu.'],
      [3, 4, 'Os Milagres de Eliseu', 'Azeite que não acaba e um menino que volta à vida.'],
      [5, 7, 'Naamã e o Cerco', 'Sete mergulhos no Jordão e um exército invisível de fogo.'],
      [8, 10, 'Jeú', 'Uma carruagem furiosa e o fim da casa de Acabe.'],
      [11, 13, 'Joás, o Menino Rei', 'Escondido no templo por seis anos, coroado aos sete.'],
      [14, 17, 'A Queda de Samaria', 'O Reino do Norte é levado cativo pela Assíria.'],
      [18, 20, 'Ezequias', 'Uma carta estendida diante do Senhor e um anjo que salva Jerusalém.'],
      [21, 23, 'Josias e o Livro da Lei', 'Um livro esquecido é encontrado e um rei rasga as vestes.'],
      [24, 25, 'Exílio na Babilônia', 'Jerusalém cai, o Templo arde — mas uma luz fica acesa.'],
    ],
  },
  {
    id: '1cr', abbrev: '1cr', name: '1 Crônicas', testament: 'AT', group: 'Históricos', author: 'Esdras (tradição)', date: 'c. 430 a.C.',
    tags: ['História', 'Adoração', 'Legado'], tagline: 'A história de Israel contada a partir do louvor.',
    synopsis: 'Escrito para os que voltaram do exílio, 1 Crônicas reconta a história de Davi com foco na adoração, na arca e nos preparativos para o Templo — lembrando que Deus ainda tem um plano.',
    keyVerse: '1 Crônicas 16:34', motif: 'harp', scene: 'dawn', palette: ['#0f1a2e', '#3a5a98', '#f6d365'],
    eps: [
      [1, 9, 'As Genealogias', 'De Adão aos exilados — e a oração de Jabez no meio do caminho.'],
      [10, 12, 'Davi se Torna Rei', 'A queda de Saul e os valentes que se unem a Davi.'],
      [13, 16, 'A Arca em Jerusalém', 'Uma procissão interrompida, retomada com música e alegria.'],
      [17, 20, 'Aliança e Vitórias', 'Deus promete edificar uma casa para Davi.'],
      [21, 22, 'Preparando o Templo', 'Um censo errado e o lugar escolhido para a casa de Deus.'],
      [23, 27, 'Levitas e Oficiais', 'Músicos, porteiros e o serviço organizado.'],
      [28, 29, 'O Legado de Davi', '"Tua é a grandeza, o poder e a glória."'],
    ],
  },
  {
    id: '2cr', abbrev: '2cr', name: '2 Crônicas', testament: 'AT', group: 'Históricos', author: 'Esdras (tradição)', date: 'c. 430 a.C.',
    tags: ['História', 'Reavivamento', 'Reis'], tagline: 'Se o meu povo se humilhar...',
    synopsis: 'Do Templo de Salomão ao decreto de Ciro. Reis que buscam a Deus prosperam; reis que o abandonam caem. Uma história de reavivamentos e da graça que sempre oferece um recomeço.',
    keyVerse: '2 Crônicas 7:14', motif: 'temple', scene: 'dawn', palette: ['#1b1206', '#9c6b1e', '#ffe9a8'],
    eps: [
      [1, 5, 'Salomão Constrói o Templo', 'Sabedoria, riquezas e a arca levada ao Santo dos Santos.'],
      [6, 9, 'A Oração e a Glória', 'Fogo do céu e a promessa: "Se o meu povo se humilhar".'],
      [10, 13, 'O Reino se Divide', 'Roboão ouve os jovens e perde dez tribos.'],
      [14, 16, 'Asa', 'Um rei que começa confiando em Deus.'],
      [17, 20, 'Josafá', '"A batalha não é de vocês, mas de Deus."'],
      [21, 24, 'Atalia e Joás', 'Uma rainha usurpadora e um menino escondido.'],
      [25, 28, 'Reis em Declínio', 'Uzias, o orgulho e a lepra; Acaz fecha o templo.'],
      [29, 32, 'Ezequias Restaura', 'Portas abertas, Páscoa celebrada e um anjo contra a Assíria.'],
      [33, 35, 'Manassés e Josias', 'O pior rei se arrepende; o mais jovem reforma a nação.'],
      [36, 36, 'Destruição e Esperança', 'O exílio — e o decreto de Ciro anunciando a volta.'],
    ],
  },
  {
    id: 'ed', abbrev: 'ed', name: 'Esdras', testament: 'AT', group: 'Históricos', author: 'Esdras', date: 'c. 440 a.C.',
    tags: ['Retorno', 'Reconstrução', 'Fé'], tagline: 'A volta para casa.',
    synopsis: 'Após setenta anos de exílio, os judeus retornam a Jerusalém para reconstruir o Templo. Décadas depois, o escriba Esdras chega para restaurar o povo pela Palavra.',
    keyVerse: 'Esdras 7:10', motif: 'scroll', scene: 'dawn', palette: ['#14202b', '#4a7b8c', '#f2d49b'],
    eps: [
      [1, 2, 'O Decreto de Ciro', 'Um rei pagão é movido por Deus a libertar os cativos.'],
      [3, 4, 'Os Alicerces', 'Choro e júbilo se misturam; a oposição para a obra.'],
      [5, 6, 'O Templo Concluído', 'Profetas encorajam e o templo é dedicado com alegria.'],
      [7, 8, 'Esdras Chega', 'Um escriba dedicado a estudar, praticar e ensinar a Lei.'],
      [9, 10, 'Arrependimento', 'Uma oração de confissão que leva o povo às lágrimas.'],
    ],
  },
  {
    id: 'ne', abbrev: 'ne', name: 'Neemias', testament: 'AT', group: 'Históricos', author: 'Neemias', date: 'c. 430 a.C.',
    tags: ['Liderança', 'Reconstrução', 'Oposição'], tagline: 'Levantemo-nos e edifiquemos.',
    synopsis: 'Copeiro do rei da Pérsia, Neemias ouve que os muros de Jerusalém estão em ruínas. Com oração e coragem, lidera a reconstrução em 52 dias contra toda oposição.',
    keyVerse: 'Neemias 8:10', motif: 'walls', scene: 'city', palette: ['#1c1a12', '#7d6b3d', '#f5e1a4'],
    eps: [
      [1, 2, 'Oração e Coragem', 'Lágrimas no palácio e uma inspeção noturna dos muros.'],
      [3, 4, 'Reconstruindo os Muros', 'Uma mão na obra, a outra na espada.'],
      [5, 7, 'Oposição e Vitória', 'Injustiça interna, intrigas externas e o muro concluído.'],
      [8, 10, 'A Leitura da Lei', '"A alegria do Senhor é a nossa força."'],
      [11, 13, 'Dedicação e Reformas', 'Coros sobre os muros e um líder que não negocia.'],
    ],
  },
  {
    id: 'et', abbrev: 'et', name: 'Ester', testament: 'AT', group: 'Históricos', author: 'Desconhecido', date: 'c. 470 a.C.',
    tags: ['Suspense', 'Corte real', 'Coragem'], tagline: 'Para um momento como este.',
    synopsis: 'Uma jovem judia se torna rainha da Pérsia enquanto um conspirador planeja exterminar seu povo. O nome de Deus não aparece no livro, mas sua mão está em cada reviravolta.',
    keyVerse: 'Ester 4:14', motif: 'crown', scene: 'night', palette: ['#1a0a24', '#7b2d8b', '#f9c74f'],
    eps: [
      [1, 2, 'Uma Nova Rainha', 'Vasti é deposta e Ester encontra favor diante do rei.'],
      [3, 4, 'Para um Momento Como Este', 'O decreto de Hamã e o desafio de Mardoqueu.'],
      [5, 7, 'O Banquete', 'Uma noite sem sono e a forca preparada para o próprio Hamã.'],
      [8, 10, 'Purim', 'O luto vira festa e o povo é salvo.'],
    ],
  },
  // ───────────────────────── POÉTICOS ─────────────────────────
  {
    id: 'job', abbrev: 'jó', name: 'Jó', testament: 'AT', group: 'Poéticos', author: 'Desconhecido', date: 'Data incerta',
    tags: ['Drama', 'Sofrimento', 'Filosófico'], tagline: 'Eu sei que o meu Redentor vive.',
    synopsis: 'Um homem justo perde tudo num único dia. Diante de amigos que tentam explicar sua dor, Jó questiona, lamenta e espera — até que Deus responde do meio do redemoinho.',
    keyVerse: 'Jó 19:25', motif: 'storm', scene: 'storm', palette: ['#0c0f17', '#3b4a63', '#c9d6ea'],
    eps: [
      [1, 2, 'O Teste', 'No céu, uma acusação; na terra, perdas devastadoras.'],
      [3, 7, 'Por que Nasci?', 'O lamento de Jó e a primeira resposta de Elifaz.'],
      [8, 14, 'O Primeiro Debate', 'Bildade e Zofar insistem: o sofrimento é castigo.'],
      [15, 21, 'Meu Redentor Vive', 'No fundo do poço, uma esperança inabalável.'],
      [22, 27, 'O Terceiro Ciclo', 'Os amigos se calam; Jó mantém sua integridade.'],
      [28, 31, 'Onde Está a Sabedoria?', 'O hino à sabedoria e a defesa final de Jó.'],
      [32, 37, 'Eliú', 'Um jovem fala de um Deus que ensina pela dor.'],
      [38, 41, 'Do Meio do Redemoinho', '"Onde você estava quando lancei os fundamentos da terra?"'],
      [42, 42, 'A Restauração', 'Jó vê a Deus com os próprios olhos — e é restaurado.'],
    ],
  },
  {
    id: 'sl', abbrev: 'sl', name: 'Salmos', testament: 'AT', group: 'Poéticos', author: 'Davi e outros', date: 'c. 1000–400 a.C.',
    tags: ['Poesia', 'Louvor', 'Lamento'], tagline: 'Tudo o que tem fôlego louve ao Senhor.',
    synopsis: 'Cento e cinquenta cânticos que atravessam todas as emoções humanas: alegria, medo, culpa, saudade e esperança. O hinário de Israel e a oração da Igreja há três mil anos.',
    keyVerse: 'Salmos 23:1', motif: 'harp', scene: 'night', palette: ['#0b1433', '#2c4f9e', '#ffd166'],
    eps: [
      [1, 10, 'Bem-Aventurado', 'Dois caminhos, um Rei ungido e o clamor dos aflitos.'],
      [11, 20, 'Os Céus Proclamam', 'A glória de Deus na criação e na sua Lei.'],
      [21, 30, 'O Senhor é o Meu Pastor', 'Do "Deus meu, por que me abandonaste?" ao vale da sombra.'],
      [31, 41, 'Confia no Senhor', 'Confissão, perdão e a espera paciente.'],
      [42, 50, 'Como a Corça', 'Sede de Deus e a fortaleza que não se abala.'],
      [51, 60, 'Cria em Mim um Coração Puro', 'O salmo do arrependimento e refúgio na tempestade.'],
      [61, 72, 'Rocha Mais Alta', 'Minha alma tem sede de ti; o reinado do Rei justo.'],
      [73, 83, 'Os Salmos de Asafe', 'Quase escorreguei — até entrar no santuário.'],
      [84, 89, 'Quão Amáveis', 'Um dia nos teus átrios vale mais que mil.'],
      [90, 100, 'À Sombra do Onipotente', 'Ensina-nos a contar os nossos dias.'],
      [101, 106, 'Bendize, ó Minha Alma', 'Não te esqueças de nenhum dos seus benefícios.'],
      [107, 118, 'Rendei Graças', 'Este é o dia que o Senhor fez.'],
      [119, 119, 'Lâmpada para os Meus Pés', 'O maior capítulo da Bíblia, um acróstico de amor à Palavra.'],
      [120, 134, 'Cânticos de Romagem', 'Elevo os olhos para os montes — a caminho de Jerusalém.'],
      [135, 150, 'Tudo que Tem Fôlego', 'Do exílio ao aleluia final.'],
    ],
  },
  {
    id: 'pv', abbrev: 'pv', name: 'Provérbios', testament: 'AT', group: 'Poéticos', author: 'Salomão e outros', date: 'c. 950–700 a.C.',
    tags: ['Sabedoria', 'Vida prática', 'Conselhos'], tagline: 'O temor do Senhor é o princípio da sabedoria.',
    synopsis: 'Conselhos curtos e afiados sobre trabalho, dinheiro, palavras, amizades e família. Provérbios ensina a viver com sabedoria no mundo real, diante de Deus.',
    keyVerse: 'Provérbios 3:5-6', motif: 'lamp', scene: 'dawn', palette: ['#1e1606', '#a17a1c', '#fff2b0'],
    eps: [
      [1, 4, 'O Princípio da Sabedoria', 'Um pai aconselha o filho: confia no Senhor de todo o coração.'],
      [5, 9, 'A Sabedoria Clama', 'Duas mulheres chamam nas ruas: a Sabedoria e a Insensatez.'],
      [10, 15, 'Provérbios de Salomão I', 'O justo e o perverso em contrastes certeiros.'],
      [16, 22, 'Provérbios de Salomão II', 'O coração planeja, mas o Senhor dirige os passos.'],
      [23, 24, 'Palavras dos Sábios', 'Trinta ditos para guardar no coração.'],
      [25, 29, 'A Coletânea de Ezequias', 'Palavras ditas a seu tempo são maçãs de ouro.'],
      [30, 31, 'Agur, Lemuel e a Mulher Virtuosa', 'O retrato final da sabedoria em ação.'],
    ],
  },
  {
    id: 'ec', abbrev: 'ec', name: 'Eclesiastes', testament: 'AT', group: 'Poéticos', author: 'Salomão (tradição)', date: 'c. 935 a.C.',
    tags: ['Filosófico', 'Existencial', 'Sabedoria'], tagline: 'Há tempo para tudo debaixo do sol.',
    synopsis: 'Um rei que provou tudo — prazer, riqueza, sabedoria — chega à conclusão de que tudo é vapor sem Deus. Uma reflexão honesta e surpreendentemente atual sobre o sentido da vida.',
    keyVerse: 'Eclesiastes 3:1', motif: 'hourglass', scene: 'desert', palette: ['#1b1712', '#6e5c45', '#e9d8b4'],
    eps: [
      [1, 2, 'Vaidade de Vaidades', 'Nada de novo debaixo do sol.'],
      [3, 4, 'Tempo para Tudo', 'Deus pôs a eternidade no coração humano.'],
      [5, 8, 'Temor e Prudência', 'Promessas, riquezas e os limites da sabedoria.'],
      [9, 10, 'Aproveite a Vida', 'Coma seu pão com alegria; tudo o que fizer, faça com força.'],
      [11, 12, 'Lembra-te do Criador', 'Antes que venham os dias maus: teme a Deus.'],
    ],
  },
  {
    id: 'ct', abbrev: 'ct', name: 'Cânticos', testament: 'AT', group: 'Poéticos', author: 'Salomão', date: 'c. 965 a.C.',
    tags: ['Romance', 'Poesia', 'Amor'], tagline: 'O amor é forte como a morte.',
    synopsis: 'Um poema de amor entre um noivo e sua amada. Cânticos celebra o amor, o desejo e a fidelidade como dons de Deus — e aponta para o amor que Ele tem pelo seu povo.',
    keyVerse: 'Cânticos 8:6-7', motif: 'heart', scene: 'garden', palette: ['#2a0a16', '#a8325e', '#ffc2d1'],
    eps: [
      [1, 2, 'O Amado', 'Eu sou do meu amado, e o meu amado é meu.'],
      [3, 4, 'O Casamento', 'O cortejo do rei e um jardim fechado.'],
      [5, 6, 'Procura e Reencontro', 'Uma noite de busca pelas ruas da cidade.'],
      [7, 8, 'Forte Como a Morte', 'As muitas águas não podem apagar o amor.'],
    ],
  },
  // ───────────────────────── PROFETAS MAIORES ─────────────────────────
  {
    id: 'is', abbrev: 'is', name: 'Isaías', testament: 'AT', group: 'Profetas Maiores', author: 'Isaías', date: 'c. 740–680 a.C.',
    tags: ['Profecia', 'Messiânico', 'Épico'], tagline: 'Um menino nos nasceu.',
    synopsis: 'O "evangelho do Antigo Testamento". Isaías denuncia o pecado de Judá, anuncia juízo às nações e revela, séculos antes, o Messias: o Emanuel, o Servo sofredor e o Rei de novos céus e nova terra.',
    keyVerse: 'Isaías 53:5', motif: 'sun', scene: 'dawn', palette: ['#1c0f05', '#c2571a', '#ffe08a'],
    eps: [
      [1, 5, 'A Vinha Estéril', 'Venham, vamos discutir: ainda que seus pecados sejam como a escarlata.'],
      [6, 8, 'Eis-me Aqui', 'Serafins, brasas vivas e o sinal do Emanuel.'],
      [9, 12, 'Um Menino nos Nasceu', 'Maravilhoso Conselheiro e o rebento do tronco de Jessé.'],
      [13, 18, 'Oráculos às Nações', 'Babilônia, Moabe e Damasco sob o juízo de Deus.'],
      [19, 23, 'O Senhor dos Exércitos', 'Egito, Tiro e a chave da casa de Davi.'],
      [24, 27, 'O Apocalipse de Isaías', 'Ele destruirá a morte para sempre.'],
      [28, 31, 'Ais e Alianças', 'Uma pedra angular em Sião e o perigo de confiar no Egito.'],
      [32, 35, 'O Deserto Florescerá', 'Os olhos dos cegos se abrirão no caminho santo.'],
      [36, 39, 'Ezequias e Senaqueribe', 'A Assíria cerca Jerusalém; o rei ora.'],
      [40, 43, 'Consolai o Meu Povo', 'Os que esperam no Senhor renovam as forças.'],
      [44, 48, 'Ciro, o Ungido', 'Não há outro Deus; ídolos não salvam.'],
      [49, 52, 'O Servo do Senhor', 'Luz para as nações: quão formosos são os pés do que anuncia.'],
      [53, 55, 'O Servo Sofredor', 'Ferido pelas nossas transgressões — e o convite gratuito.'],
      [56, 59, 'O Jejum que Eu Escolhi', 'Justiça, sábado e o braço do Senhor que salva.'],
      [60, 62, 'Levanta-te, Resplandece', 'O Espírito do Senhor está sobre mim.'],
      [63, 66, 'Novos Céus e Nova Terra', 'Deus cria tudo de novo.'],
    ],
  },
  {
    id: 'jr', abbrev: 'jr', name: 'Jeremias', testament: 'AT', group: 'Profetas Maiores', author: 'Jeremias', date: 'c. 627–580 a.C.',
    tags: ['Drama', 'Profecia', 'Lágrimas'], tagline: 'Eu sei os planos que tenho para vocês.',
    synopsis: 'O profeta chorão anuncia por quarenta anos a queda de Jerusalém a um povo que não quer ouvir. Preso, rejeitado e jogado numa cisterna, Jeremias também revela a promessa de uma nova aliança.',
    keyVerse: 'Jeremias 29:11', motif: 'jar', scene: 'storm', palette: ['#160e0b', '#704030', '#f0b88a'],
    eps: [
      [1, 3, 'O Profeta Menino', '"Antes de formá-lo no ventre eu o escolhi."'],
      [4, 6, 'O Alarme', 'Um inimigo vem do norte; perguntem pelos caminhos antigos.'],
      [7, 10, 'O Sermão do Templo', 'Não confiem em palavras enganosas.'],
      [11, 13, 'O Cinto Apodrecido', 'Conspirações e um povo que se tornou inútil.'],
      [14, 17, 'Seca e Lamento', 'Maldito o que confia no homem; bendito o que confia no Senhor.'],
      [18, 20, 'Na Casa do Oleiro', 'Como o barro nas mãos do oleiro — e um fogo nos ossos.'],
      [21, 24, 'Os Dois Cestos de Figos', 'O Renovo justo e os reis infiéis.'],
      [25, 26, 'Setenta Anos', 'A taça da ira e um profeta à beira da morte.'],
      [27, 29, 'O Jugo e a Carta', 'Planos de paz para os exilados na Babilônia.'],
      [30, 33, 'A Nova Aliança', 'Escreverei a minha lei no coração deles.'],
      [34, 36, 'O Rolo Queimado', 'O rei corta e queima a Palavra; ela é reescrita.'],
      [37, 39, 'Na Cisterna', 'Preso na lama — e Jerusalém cai.'],
      [40, 45, 'Fuga para o Egito', 'Um remanescente que pede direção e não obedece.'],
      [46, 49, 'Oráculos às Nações', 'Egito, Filístia, Moabe, Amom e Edom.'],
      [50, 52, 'Babilônia Cairá', 'O opressor também será julgado.'],
    ],
  },
  {
    id: 'lm', abbrev: 'lm', name: 'Lamentações', testament: 'AT', group: 'Profetas Maiores', author: 'Jeremias', date: 'c. 586 a.C.',
    tags: ['Poesia', 'Luto', 'Esperança'], tagline: 'As suas misericórdias se renovam cada manhã.',
    synopsis: 'Cinco poemas sobre as ruínas de Jerusalém. No meio das cinzas e lágrimas, surge uma das declarações de esperança mais belas da Bíblia: grande é a tua fidelidade.',
    keyVerse: 'Lamentações 3:22-23', motif: 'drop', scene: 'night', palette: ['#0d1117', '#3a4556', '#b8c4d6'],
    eps: [
      [1, 2, 'Como Jaz Solitária', 'A cidade que era cheia de gente chora de noite.'],
      [3, 3, 'Grande é a Tua Fidelidade', 'As misericórdias do Senhor não têm fim.'],
      [4, 5, 'Restaura-nos', 'Faze-nos voltar a ti, Senhor, e voltaremos.'],
    ],
  },
  {
    id: 'ez', abbrev: 'ez', name: 'Ezequiel', testament: 'AT', group: 'Profetas Maiores', author: 'Ezequiel', date: 'c. 593–571 a.C.',
    tags: ['Visões', 'Fantástico', 'Profecia'], tagline: 'Ossos secos, ouvi a palavra do Senhor.',
    synopsis: 'Exilado na Babilônia, o sacerdote Ezequiel vê a glória de Deus em rodas de fogo, encena profecias impressionantes e anuncia um coração novo, ossos que revivem e um rio que traz vida.',
    keyVerse: 'Ezequiel 36:26', motif: 'wheel', scene: 'storm', palette: ['#0b0d1f', '#3b3f8f', '#9ff0ff'],
    eps: [
      [1, 3, 'A Visão da Glória', 'Querubins, rodas cheias de olhos e um rolo para comer.'],
      [4, 7, 'Atos Proféticos', 'Um tijolo, uma navalha e o fim que se aproxima.'],
      [8, 11, 'A Glória Deixa o Templo', 'Idolatria escondida e a partida da presença de Deus.'],
      [12, 15, 'Bagagem de Exílio', 'Falsos profetas e paredes caiadas.'],
      [16, 19, 'Parábolas de Infidelidade', 'A noiva infiel e as uvas verdes.'],
      [20, 24, 'O Juízo de Jerusalém', 'A espada afiada e a panela no fogo.'],
      [25, 28, 'Contra as Nações', 'A queda de Tiro e a lamentação sobre seu rei.'],
      [29, 32, 'O Egito', 'O grande crocodilo do Nilo é derrubado.'],
      [33, 34, 'O Atalaia e o Pastor', 'Eu mesmo buscarei as minhas ovelhas.'],
      [35, 36, 'Um Coração Novo', 'Tirarei de vocês o coração de pedra.'],
      [37, 37, 'O Vale dos Ossos Secos', 'Um exército renasce pelo sopro de Deus.'],
      [38, 39, 'Gogue e Magogue', 'A batalha final contra o povo restaurado.'],
      [40, 43, 'O Novo Templo', 'A glória volta pelo portão oriental.'],
      [44, 48, 'O Rio da Vida', 'Águas que brotam do templo e curam tudo por onde passam.'],
    ],
  },
  {
    id: 'dn', abbrev: 'dn', name: 'Daniel', testament: 'AT', group: 'Profetas Maiores', author: 'Daniel', date: 'c. 535 a.C.',
    tags: ['Aventura', 'Visões', 'Fidelidade'], tagline: 'Fiéis em terra estrangeira.',
    synopsis: 'Jovens hebreus levados à Babilônia permanecem fiéis num império pagão: fornalha ardente, cova dos leões e uma mão que escreve na parede. Depois, visões de reinos e do Filho do Homem.',
    keyVerse: 'Daniel 3:17-18', motif: 'lion', scene: 'night', palette: ['#1a0f05', '#8a4b12', '#ffc75f'],
    eps: [
      [1, 1, 'Fiéis na Babilônia', 'Legumes e água: quatro jovens que não se contaminam.'],
      [2, 2, 'A Estátua dos Sonhos', 'Ouro, prata, bronze, ferro — e uma pedra que enche a terra.'],
      [3, 3, 'A Fornalha Ardente', 'Três se recusam a se curvar; um quarto aparece no fogo.'],
      [4, 4, 'A Loucura do Rei', 'Nabucodonosor aprende quem governa de verdade.'],
      [5, 5, 'A Escrita na Parede', 'Mene, Mene, Tequel, Parsim.'],
      [6, 6, 'Na Cova dos Leões', 'Uma janela aberta para Jerusalém, uma noite com os leões.'],
      [7, 8, 'Os Quatro Animais', 'Reinos em forma de feras e o Filho do Homem nas nuvens.'],
      [9, 9, 'As Setenta Semanas', 'Uma oração de confissão e a visita de Gabriel.'],
      [10, 12, 'O Tempo do Fim', 'Batalhas celestiais e os que brilharão como estrelas.'],
    ],
  },
  // ───────────────────────── PROFETAS MENORES ─────────────────────────
  {
    id: 'os', abbrev: 'os', name: 'Oseias', testament: 'AT', group: 'Profetas Menores', author: 'Oseias', date: 'c. 750–715 a.C.',
    tags: ['Drama', 'Amor', 'Fidelidade'], tagline: 'Um amor que não desiste.',
    synopsis: 'Deus manda Oseias se casar com uma mulher infiel para encenar seu amor por Israel. Uma história dolorosa e bela sobre um Deus que persegue seu povo com amor leal.',
    keyVerse: 'Oseias 6:6', motif: 'heart', scene: 'field', palette: ['#220b12', '#8f2d4a', '#ffd1dc'],
    eps: [
      [1, 3, 'Um Casamento Profético', 'Gômer, os filhos e um amor que compra de volta.'],
      [4, 7, 'Conhecer o Senhor', 'Misericórdia quero, e não sacrifício.'],
      [8, 10, 'Semearam Vento', 'Colherão tempestade.'],
      [11, 14, 'Com Laços de Amor', 'Como te deixaria, ó Efraim? Eu curarei a sua infidelidade.'],
    ],
  },
  {
    id: 'jl', abbrev: 'jl', name: 'Joel', testament: 'AT', group: 'Profetas Menores', author: 'Joel', date: 'Data incerta',
    tags: ['Profecia', 'Avivamento', 'Curta'], tagline: 'Derramarei o meu Espírito.',
    synopsis: 'Uma praga de gafanhotos vira alerta do Dia do Senhor. Joel chama ao arrependimento e promete restauração — e o derramar do Espírito sobre toda carne.',
    keyVerse: 'Joel 2:28', motif: 'trumpet', scene: 'field', palette: ['#16200a', '#5f7f1f', '#e6f59a'],
    eps: [
      [1, 1, 'Os Gafanhotos', 'Uma terra devastada e um chamado ao luto.'],
      [2, 2, 'Rasguem o Coração', 'Restituirei os anos — e derramarei o meu Espírito.'],
      [3, 3, 'O Vale da Decisão', 'As nações são julgadas e Sião é restaurada.'],
    ],
  },
  {
    id: 'am', abbrev: 'am', name: 'Amós', testament: 'AT', group: 'Profetas Menores', author: 'Amós', date: 'c. 760 a.C.',
    tags: ['Justiça social', 'Profecia', 'Denúncia'], tagline: 'Corra a justiça como um rio.',
    synopsis: 'Um boiadeiro de Tecoa denuncia a injustiça social de Israel em tempos de prosperidade. Amós mostra que religião sem justiça não agrada a Deus.',
    keyVerse: 'Amós 5:24', motif: 'plumb', scene: 'field', palette: ['#1d1a0b', '#7c6d22', '#f3e7a1'],
    eps: [
      [1, 2, 'Por Três Transgressões', 'O leão ruge de Sião contra as nações — e contra Israel.'],
      [3, 6, 'Prepara-te', 'Vacas de Basã, festas vazias e o rio da justiça.'],
      [7, 9, 'Visões e Restauração', 'O prumo, o cesto de frutos e a tenda de Davi reerguida.'],
    ],
  },
  {
    id: 'ob', abbrev: 'ob', name: 'Obadias', testament: 'AT', group: 'Profetas Menores', author: 'Obadias', date: 'c. 586 a.C.',
    tags: ['Curta', 'Juízo', 'Orgulho'], tagline: 'O orgulho do teu coração te enganou.',
    synopsis: 'O menor livro do Antigo Testamento. Edom se alegrou com a queda de Jerusalém, mas o Senhor anuncia que o reino será dele.',
    keyVerse: 'Obadias 1:15', motif: 'mountain', scene: 'mountain', palette: ['#1e0f0a', '#7a3b22', '#f2b48a'],
    eps: [[1, 1, 'A Queda de Edom', 'Ainda que subas como a águia, de lá te derrubarei.']],
  },
  {
    id: 'jn', abbrev: 'jn', name: 'Jonas', testament: 'AT', group: 'Profetas Menores', author: 'Jonas', date: 'c. 760 a.C.',
    tags: ['Aventura', 'Comédia dramática', 'Graça'], tagline: 'Fugir de Deus nunca dá certo.',
    synopsis: 'Enviado para pregar a Nínive, Jonas embarca no sentido oposto. Uma tempestade, um grande peixe e uma cidade arrependida revelam um Deus cuja compaixão vai além das fronteiras.',
    keyVerse: 'Jonas 4:11', motif: 'fish', scene: 'sea', palette: ['#03141f', '#0f5e7a', '#8be9fd'],
    eps: [
      [1, 1, 'Fugindo de Deus', 'Um navio para Társis e uma tempestade com nome.'],
      [2, 2, 'No Ventre do Peixe', 'Três dias no escuro e uma oração do fundo do mar.'],
      [3, 3, 'Nínive se Arrepende', 'Quarenta dias — e uma cidade inteira se humilha.'],
      [4, 4, 'A Planta e a Compaixão', 'Um profeta irritado e um Deus misericordioso.'],
    ],
  },
  {
    id: 'mq', abbrev: 'mq', name: 'Miqueias', testament: 'AT', group: 'Profetas Menores', author: 'Miqueias', date: 'c. 735–700 a.C.',
    tags: ['Justiça', 'Messiânico', 'Profecia'], tagline: 'Pratique a justiça, ame a misericórdia.',
    synopsis: 'Miqueias denuncia a corrupção de líderes e profetas, mas anuncia que de Belém sairá o governante de Israel. E resume o que Deus espera: justiça, misericórdia e humildade.',
    keyVerse: 'Miqueias 6:8', motif: 'star', scene: 'night', palette: ['#0a0f24', '#2d3a7c', '#ffe9a3'],
    eps: [
      [1, 3, 'Ouvi, Todos os Povos', 'Juízo sobre Samaria, Jerusalém e líderes corruptos.'],
      [4, 5, 'De Belém Sairá', 'Espadas em arados e um Pastor nascido numa pequena cidade.'],
      [6, 7, 'O que o Senhor Pede', 'Ele lançará os nossos pecados nas profundezas do mar.'],
    ],
  },
  {
    id: 'na', abbrev: 'na', name: 'Naum', testament: 'AT', group: 'Profetas Menores', author: 'Naum', date: 'c. 650 a.C.',
    tags: ['Juízo', 'Poesia', 'Curta'], tagline: 'O Senhor é bom, um refúgio na angústia.',
    synopsis: 'Cem anos após o arrependimento em Nínive, a Assíria voltou à crueldade. Naum anuncia sua queda e consola Judá: o Senhor é lento para irar-se, mas não deixa o culpado impune.',
    keyVerse: 'Naum 1:7', motif: 'shield', scene: 'storm', palette: ['#170a0a', '#6b1d1d', '#ff9f80'],
    eps: [
      [1, 1, 'Um Refúgio na Angústia', 'O Deus zeloso e as boas-novas sobre os montes.'],
      [2, 3, 'A Queda de Nínive', 'Carros nas ruas e o fim do império cruel.'],
    ],
  },
  {
    id: 'hc', abbrev: 'hc', name: 'Habacuque', testament: 'AT', group: 'Profetas Menores', author: 'Habacuque', date: 'c. 605 a.C.',
    tags: ['Diálogo', 'Fé', 'Perguntas'], tagline: 'O justo viverá pela fé.',
    synopsis: 'Um profeta questiona Deus: até quando a injustiça? A resposta o surpreende — e o leva a uma das maiores declarações de fé da Bíblia: ainda que a figueira não floresça.',
    keyVerse: 'Habacuque 2:4', motif: 'tower', scene: 'dawn', palette: ['#14100a', '#6d5530', '#f7deb0'],
    eps: [
      [1, 2, 'Até Quando?', 'O profeta sobe à torre de vigia e espera a resposta.'],
      [3, 3, 'Ainda que a Figueira', 'Uma oração que termina em alegria no Deus da salvação.'],
    ],
  },
  {
    id: 'sf', abbrev: 'sf', name: 'Sofonias', testament: 'AT', group: 'Profetas Menores', author: 'Sofonias', date: 'c. 630 a.C.',
    tags: ['Juízo', 'Esperança', 'Curta'], tagline: 'Ele se deleitará em você com alegria.',
    synopsis: 'Sofonias anuncia o grande Dia do Senhor sobre Judá e as nações, mas termina com uma das imagens mais ternas da Bíblia: Deus cantando de alegria sobre o seu povo.',
    keyVerse: 'Sofonias 3:17', motif: 'sun', scene: 'dawn', palette: ['#1d0d05', '#a3471a', '#ffd59e'],
    eps: [
      [1, 2, 'O Dia do Senhor', 'Busquem a justiça, busquem a humildade.'],
      [3, 3, 'Ele Cantará Sobre Ti', 'O Senhor está no meio de ti, poderoso para salvar.'],
    ],
  },
  {
    id: 'ag', abbrev: 'ag', name: 'Ageu', testament: 'AT', group: 'Profetas Menores', author: 'Ageu', date: '520 a.C.',
    tags: ['Reconstrução', 'Prioridades', 'Curta'], tagline: 'Considerem os seus caminhos.',
    synopsis: 'Os exilados voltaram, mas o Templo continua em ruínas enquanto cada um cuida da própria casa. Ageu desafia o povo a colocar Deus em primeiro lugar.',
    keyVerse: 'Ageu 1:5', motif: 'temple', scene: 'city', palette: ['#16130c', '#5e5034', '#efe0b9'],
    eps: [
      [1, 1, 'Considerem os Seus Caminhos', 'Casas forradas e a casa de Deus em ruínas.'],
      [2, 2, 'A Glória da Segunda Casa', 'A glória desta casa será maior que a da primeira.'],
    ],
  },
  {
    id: 'zc', abbrev: 'zc', name: 'Zacarias', testament: 'AT', group: 'Profetas Menores', author: 'Zacarias', date: 'c. 520–480 a.C.',
    tags: ['Visões', 'Messiânico', 'Esperança'], tagline: 'Não por força, mas pelo meu Espírito.',
    synopsis: 'Oito visões noturnas encorajam os reconstrutores do Templo. Zacarias anuncia o Rei humilde montado num jumento, o pastor traspassado e o dia em que o Senhor reinará sobre toda a terra.',
    keyVerse: 'Zacarias 4:6', motif: 'menorah', scene: 'night', palette: ['#0c0b1e', '#4a3a8a', '#ffd86b'],
    eps: [
      [1, 6, 'Oito Visões Noturnas', 'Cavalos, chifres, um candelabro de ouro e um rolo voador.'],
      [7, 8, 'Jejum e Alegria', 'Os jejuns se transformarão em festas.'],
      [9, 11, 'Eis que o Teu Rei Vem', 'Humilde, montado num jumento — e trinta moedas de prata.'],
      [12, 14, 'Naquele Dia', 'Olharão para aquele a quem traspassaram.'],
    ],
  },
  {
    id: 'ml', abbrev: 'ml', name: 'Malaquias', testament: 'AT', group: 'Profetas Menores', author: 'Malaquias', date: 'c. 430 a.C.',
    tags: ['Diálogo', 'Aliança', 'Final de temporada'], tagline: 'Nascerá o Sol da Justiça.',
    synopsis: 'A última voz profética antes de 400 anos de silêncio. Em diálogos diretos, Deus confronta um povo apático e promete enviar seu mensageiro — e o Sol da Justiça com cura em suas asas.',
    keyVerse: 'Malaquias 4:2', motif: 'sun', scene: 'dawn', palette: ['#1a0c08', '#8d3a20', '#ffc48a'],
    eps: [
      [1, 2, 'Eu Vos Amei', 'Ofertas defeituosas e sacerdotes infiéis.'],
      [3, 4, 'O Sol da Justiça', 'O mensageiro, o dízimo e a promessa de Elias.'],
    ],
  },
  // ───────────────────────── EVANGELHOS ─────────────────────────
  {
    id: 'mt', abbrev: 'mt', name: 'Mateus', testament: 'NT', group: 'Evangelhos', author: 'Mateus', date: 'c. 60 d.C.',
    tags: ['Biografia', 'Reino', 'Ensino'], tagline: 'O Rei prometido chegou.',
    synopsis: 'Escrito por um ex-cobrador de impostos, Mateus apresenta Jesus como o Messias prometido nas Escrituras. Do Sermão do Monte à Grande Comissão, o Reino dos céus se aproxima.',
    keyVerse: 'Mateus 28:19-20', motif: 'star', scene: 'night', palette: ['#0b1026', '#25408f', '#ffe08a'],
    eps: [
      [1, 2, 'O Rei Nasce', 'Genealogia, um anjo em sonho e magos guiados por uma estrela.'],
      [3, 4, 'Batismo e Deserto', 'A voz do céu e quarenta dias de tentação.'],
      [5, 7, 'O Sermão do Monte', 'Bem-aventuranças, o Pai Nosso e a casa sobre a rocha.'],
      [8, 10, 'Milagres e Missão', 'Tempestade acalmada e doze enviados.'],
      [11, 13, 'Parábolas do Reino', 'O semeador, o joio e a pérola de grande valor.'],
      [14, 17, 'Sobre as Águas', 'Cinco pães, Pedro no mar e a transfiguração.'],
      [18, 20, 'Os Últimos Serão os Primeiros', 'Perdão setenta vezes sete e os trabalhadores da vinha.'],
      [21, 23, 'Hosana!', 'A entrada triunfal, o templo purificado e os ais aos fariseus.'],
      [24, 25, 'O Sermão Profético', 'Sinais do fim, as dez virgens e os talentos.'],
      [26, 27, 'A Paixão', 'Getsêmani, a negação de Pedro e a cruz.'],
      [28, 28, 'Ressuscitou!', 'O túmulo vazio e a Grande Comissão.'],
    ],
  },
  {
    id: 'mc', abbrev: 'mc', name: 'Marcos', testament: 'NT', group: 'Evangelhos', author: 'João Marcos', date: 'c. 55 d.C.',
    tags: ['Ação', 'Biografia', 'Ritmo acelerado'], tagline: 'Imediatamente.',
    synopsis: 'O Evangelho mais curto e mais rápido. Marcos mostra Jesus em movimento: curando, expulsando demônios, acalmando tempestades — o Servo que veio para dar a vida em resgate de muitos.',
    keyVerse: 'Marcos 10:45', motif: 'ship', scene: 'sea', palette: ['#06161c', '#1c6a73', '#ffd38a'],
    eps: [
      [1, 3, 'O Princípio do Evangelho', 'Um paralítico pelo telhado e os doze escolhidos.'],
      [4, 5, 'Até o Vento e o Mar', 'Parábolas, uma tempestade e uma legião expulsa.'],
      [6, 8, 'Quem Dizem Que Eu Sou?', 'Pães multiplicados e a confissão de Pedro.'],
      [9, 10, 'O Caminho da Cruz', 'A transfiguração e o cego Bartimeu.'],
      [11, 13, 'Em Jerusalém', 'A figueira, a oferta da viúva e o fim dos tempos.'],
      [14, 15, 'A Paixão', 'O perfume derramado, a última ceia e a crucificação.'],
      [16, 16, 'O Túmulo Vazio', 'Ele não está aqui; ressuscitou!'],
    ],
  },
  {
    id: 'lc', abbrev: 'lc', name: 'Lucas', testament: 'NT', group: 'Evangelhos', author: 'Lucas', date: 'c. 60 d.C.',
    tags: ['Biografia', 'Compaixão', 'Investigação'], tagline: 'Veio buscar e salvar o perdido.',
    synopsis: 'Um médico investiga tudo com cuidado e escreve uma narrativa ordenada. Lucas destaca a compaixão de Jesus por pobres, mulheres, estrangeiros e pecadores, com parábolas inesquecíveis.',
    keyVerse: 'Lucas 19:10', motif: 'lamp', scene: 'field', palette: ['#1a1206', '#8a6b2b', '#ffe7b0'],
    eps: [
      [1, 2, 'O Nascimento', 'Anjos, pastores e um bebê numa manjedoura.'],
      [3, 4, 'O Espírito Sobre Mim', 'Batismo, tentação e a rejeição em Nazaré.'],
      [5, 7, 'Pescadores de Homens', 'Redes cheias, o centurião e a mulher que muito amou.'],
      [8, 9, 'Quem é Este?', 'Semeador, tempestade e a transfiguração.'],
      [10, 12, 'O Bom Samaritano', 'Marta e Maria, o Pai Nosso e o rico insensato.'],
      [13, 14, 'O Grande Banquete', 'A porta estreita e os convidados que recusaram.'],
      [15, 16, 'O Filho Pródigo', 'A ovelha, a moeda e o filho que voltou para casa.'],
      [17, 19, 'Zaqueu', 'Dez leprosos e um baixinho no sicômoro.'],
      [20, 21, 'No Templo', 'Perguntas armadilha e a oferta da viúva.'],
      [22, 23, 'A Paixão', '"Pai, perdoa-lhes" e "Hoje estarás comigo no paraíso".'],
      [24, 24, 'O Caminho de Emaús', 'Corações ardendo enquanto Ele explicava as Escrituras.'],
    ],
  },
  {
    id: 'jo', abbrev: 'jo', name: 'João', testament: 'NT', group: 'Evangelhos', author: 'João', date: 'c. 90 d.C.',
    tags: ['Biografia', 'Teológico', 'Sinais'], tagline: 'Porque Deus amou o mundo de tal maneira.',
    synopsis: 'O discípulo amado escreve para que você creia. Sete sinais, sete "Eu Sou" e a revelação de Jesus como o Verbo que se fez carne, a luz do mundo e a ressurreição e a vida.',
    keyVerse: 'João 3:16', motif: 'dove', scene: 'dawn', palette: ['#0c1424', '#2f5a8a', '#fff3c4'],
    eps: [
      [1, 2, 'O Verbo se Fez Carne', 'O Cordeiro de Deus e a água transformada em vinho.'],
      [3, 4, 'Nascer de Novo', 'Nicodemos à noite e a samaritana ao meio-dia.'],
      [5, 6, 'O Pão da Vida', 'Um paralítico em Betesda e cinco mil alimentados.'],
      [7, 8, 'A Luz do Mundo', 'Rios de água viva e a verdade que liberta.'],
      [9, 10, 'O Bom Pastor', 'Um cego de nascença vê; as ovelhas ouvem a voz.'],
      [11, 12, 'Lázaro, Vem para Fora!', 'Eu sou a ressurreição e a vida.'],
      [13, 17, 'No Cenáculo', 'Pés lavados, o Caminho, a Videira e a oração sacerdotal.'],
      [18, 19, 'Está Consumado', 'Prisão, julgamento e a cruz.'],
      [20, 21, 'Ele Vive', 'Maria no jardim, Tomé e "Tu me amas?"'],
    ],
  },
  // ───────────────────────── IGREJA PRIMITIVA ─────────────────────────
  {
    id: 'at', abbrev: 'at', name: 'Atos', testament: 'NT', group: 'Igreja Primitiva', author: 'Lucas', date: 'c. 62 d.C.',
    tags: ['Aventura', 'Viagens', 'Expansão'], tagline: 'Até os confins da terra.',
    synopsis: 'O Espírito Santo desce em Pentecostes e um pequeno grupo de discípulos vira o mundo de cabeça para baixo. Perseguições, conversões, viagens missionárias e um naufrágio a caminho de Roma.',
    keyVerse: 'Atos 1:8', motif: 'flame', scene: 'sea', palette: ['#1b0a05', '#b5401c', '#ffcc70'],
    eps: [
      [1, 2, 'Pentecostes', 'A ascensão, línguas de fogo e três mil batizados.'],
      [3, 5, 'Ousadia', 'Um coxo anda, prisões e portas que se abrem.'],
      [6, 7, 'Estêvão', 'O primeiro mártir vê os céus abertos.'],
      [8, 9, 'A Estrada de Damasco', 'Filipe e o eunuco; Saulo é derrubado pela luz.'],
      [10, 12, 'Cornélio', 'O evangelho chega aos gentios e Pedro escapa da prisão.'],
      [13, 14, 'A Primeira Viagem', 'Barnabé e Paulo são enviados de Antioquia.'],
      [15, 16, 'O Concílio e Filipos', 'Graça para todos e um terremoto à meia-noite.'],
      [17, 18, 'Atenas e Corinto', 'Ao Deus desconhecido e um ano e meio em Corinto.'],
      [19, 20, 'Éfeso', 'Um tumulto pela deusa Diana e a despedida dos presbíteros.'],
      [21, 23, 'Preso em Jerusalém', 'Uma multidão furiosa e um plano de emboscada.'],
      [24, 26, 'Diante dos Governadores', 'Félix, Festo e o rei Agripa ouvem Paulo.'],
      [27, 28, 'Naufrágio e Roma', 'Tempestade, uma víbora e o evangelho anunciado sem impedimento.'],
    ],
  },
  // ───────────────────────── CARTAS PAULINAS ─────────────────────────
  {
    id: 'rm', abbrev: 'rm', name: 'Romanos', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 57 d.C.',
    tags: ['Teológico', 'Graça', 'Carta'], tagline: 'Nenhuma condenação há.',
    synopsis: 'A obra-prima teológica de Paulo. Todos pecaram, mas somos justificados pela fé. Romanos percorre a graça, a vida no Espírito, o plano de Deus para Israel e a vida transformada.',
    keyVerse: 'Romanos 8:28', motif: 'letter', scene: 'city', palette: ['#1d0b0b', '#8c2a2a', '#ffd4a3'],
    eps: [
      [1, 3, 'Todos Pecaram', 'Não me envergonho do evangelho.'],
      [4, 5, 'Justificados pela Fé', 'Abraão creu; temos paz com Deus.'],
      [6, 8, 'A Vida no Espírito', 'Nada nos separará do amor de Deus.'],
      [9, 11, 'O Mistério de Israel', 'Ó profundidade da riqueza e da sabedoria de Deus!'],
      [12, 13, 'Sacrifício Vivo', 'Não se amoldem a este mundo; transformem-se.'],
      [14, 16, 'Acolham-se Uns aos Outros', 'Fortes e fracos, e saudações finais.'],
    ],
  },
  {
    id: '1co', abbrev: '1co', name: '1 Coríntios', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 55 d.C.',
    tags: ['Igreja', 'Conselhos', 'Amor'], tagline: 'O maior destes é o amor.',
    synopsis: 'Uma igreja talentosa e problemática recebe uma carta corajosa. Divisões, imoralidade, dons espirituais e a ressurreição — e no centro, o hino ao amor.',
    keyVerse: '1 Coríntios 13:13', motif: 'heart', scene: 'city', palette: ['#160b1c', '#5d2f7a', '#ffc8e0'],
    eps: [
      [1, 4, 'A Loucura da Cruz', 'Divisões na igreja e a sabedoria de Deus.'],
      [5, 7, 'Templo do Espírito', 'Pureza, tribunais e casamento.'],
      [8, 10, 'Liberdade e Amor', 'Tudo para todos, para ganhar alguns.'],
      [11, 14, 'Dons e o Caminho Excelente', 'A ceia, o corpo de Cristo e o amor.'],
      [15, 16, 'A Ressurreição', 'Onde está, ó morte, a tua vitória?'],
    ],
  },
  {
    id: '2co', abbrev: '2co', name: '2 Coríntios', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 56 d.C.',
    tags: ['Pessoal', 'Ministério', 'Fraqueza'], tagline: 'Minha graça te basta.',
    synopsis: 'A carta mais pessoal de Paulo. Ele abre o coração sobre sofrimento, ministério e generosidade, e descobre que o poder de Deus se aperfeiçoa na fraqueza.',
    keyVerse: '2 Coríntios 12:9', motif: 'jar', scene: 'dawn', palette: ['#171008', '#6f5326', '#f5ddae'],
    eps: [
      [1, 4, 'Tesouro em Vasos de Barro', 'Consolo na tribulação e a glória da nova aliança.'],
      [5, 7, 'Nova Criação', 'Embaixadores de Cristo e o ministério da reconciliação.'],
      [8, 9, 'Generosidade', 'Deus ama quem dá com alegria.'],
      [10, 13, 'Poder na Fraqueza', 'O espinho na carne e a graça que basta.'],
    ],
  },
  {
    id: 'gl', abbrev: 'gl', name: 'Gálatas', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 49 d.C.',
    tags: ['Liberdade', 'Graça', 'Urgente'], tagline: 'Foi para a liberdade que Cristo nos libertou.',
    synopsis: 'Paulo escreve com urgência a igrejas tentadas a trocar a graça pela Lei. Gálatas é a carta da liberdade cristã e do fruto do Espírito.',
    keyVerse: 'Gálatas 2:20', motif: 'chain', scene: 'mountain', palette: ['#0f1a14', '#2f6b4f', '#d6f5c4'],
    eps: [
      [1, 2, 'Outro Evangelho?', 'Paulo defende seu chamado e confronta Pedro.'],
      [3, 4, 'Filhos, Não Escravos', 'Abraão, a Lei e a promessa.'],
      [5, 6, 'O Fruto do Espírito', 'Liberdade, amor e levar as cargas uns dos outros.'],
    ],
  },
  {
    id: 'ef', abbrev: 'ef', name: 'Efésios', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 60 d.C.',
    tags: ['Identidade', 'Igreja', 'Batalha espiritual'], tagline: 'Pela graça sois salvos.',
    synopsis: 'Escrita da prisão, Efésios revela as riquezas que temos em Cristo e como viver à altura delas: unidade, nova vida, família e a armadura de Deus.',
    keyVerse: 'Efésios 2:8-9', motif: 'shield', scene: 'night', palette: ['#0a1022', '#2a3f7a', '#e0e8ff'],
    eps: [
      [1, 3, 'Riquezas em Cristo', 'Escolhidos, salvos pela graça, unidos num só corpo.'],
      [4, 6, 'A Armadura de Deus', 'Vida nova, família e a batalha espiritual.'],
    ],
  },
  {
    id: 'fp', abbrev: 'fp', name: 'Filipenses', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 61 d.C.',
    tags: ['Alegria', 'Contentamento', 'Carta'], tagline: 'Alegrem-se sempre no Senhor.',
    synopsis: 'Da prisão, Paulo escreve a carta mais alegre do Novo Testamento. Para ele, viver é Cristo — e tudo pode naquele que o fortalece.',
    keyVerse: 'Filipenses 4:13', motif: 'sun', scene: 'dawn', palette: ['#1f1205', '#b0671c', '#ffe6a3'],
    eps: [
      [1, 2, 'Viver é Cristo', 'Alegria na prisão e o hino da humildade de Jesus.'],
      [3, 4, 'Prossigo para o Alvo', 'Esquecendo o que fica para trás; a paz que excede o entendimento.'],
    ],
  },
  {
    id: 'cl', abbrev: 'cl', name: 'Colossenses', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 60 d.C.',
    tags: ['Cristo supremo', 'Carta', 'Vida nova'], tagline: 'Cristo é tudo em todos.',
    synopsis: 'Contra filosofias vazias, Paulo exalta a supremacia de Cristo, a imagem do Deus invisível, e chama a igreja a buscar as coisas do alto.',
    keyVerse: 'Colossenses 3:23', motif: 'crown', scene: 'dawn', palette: ['#0e1420', '#36507a', '#ffe7a8'],
    eps: [
      [1, 2, 'A Supremacia de Cristo', 'Nele habita toda a plenitude da divindade.'],
      [3, 4, 'Pensem nas Coisas do Alto', 'Revestidos de amor; façam tudo de coração.'],
    ],
  },
  {
    id: '1ts', abbrev: '1ts', name: '1 Tessalonicenses', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 51 d.C.',
    tags: ['Esperança', 'Volta de Cristo', 'Carta'], tagline: 'Orem sem cessar.',
    synopsis: 'Uma igreja jovem e perseguida recebe encorajamento. Paulo fala de santidade, do luto com esperança e da volta de Cristo.',
    keyVerse: '1 Tessalonicenses 5:16-18', motif: 'trumpet', scene: 'dawn', palette: ['#121626', '#3e4f86', '#fff0b3'],
    eps: [
      [1, 3, 'Um Modelo para Todos', 'Fé que se espalha e um apóstolo cheio de saudade.'],
      [4, 5, 'A Volta do Senhor', 'A trombeta soará; alegrem-se sempre.'],
    ],
  },
  {
    id: '2ts', abbrev: '2ts', name: '2 Tessalonicenses', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 51 d.C.',
    tags: ['Escatologia', 'Perseverança', 'Curta'], tagline: 'Não se cansem de fazer o bem.',
    synopsis: 'Confusos sobre o fim dos tempos, alguns tessalonicenses pararam de trabalhar. Paulo corrige, consola e encoraja a perseverança.',
    keyVerse: '2 Tessalonicenses 3:13', motif: 'trumpet', scene: 'storm', palette: ['#10121c', '#424a6e', '#d8deff'],
    eps: [[1, 3, 'Firmes Até o Fim', 'O dia do Senhor, o homem da iniquidade e o trabalho diligente.']],
  },
  {
    id: '1tm', abbrev: '1tm', name: '1 Timóteo', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 63 d.C.',
    tags: ['Liderança', 'Mentoria', 'Igreja'], tagline: 'Ninguém despreze a sua juventude.',
    synopsis: 'Paulo orienta o jovem pastor Timóteo em Éfeso: sã doutrina, liderança, oração e o perigo do amor ao dinheiro.',
    keyVerse: '1 Timóteo 4:12', motif: 'scroll', scene: 'city', palette: ['#141017', '#5a4566', '#eedcff'],
    eps: [
      [1, 3, 'Combata o Bom Combate', 'O maior dos pecadores e os requisitos para líderes.'],
      [4, 6, 'Exemplo dos Fiéis', 'A piedade com contentamento é grande fonte de lucro.'],
    ],
  },
  {
    id: '2tm', abbrev: '2tm', name: '2 Timóteo', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 67 d.C.',
    tags: ['Despedida', 'Legado', 'Coragem'], tagline: 'Combati o bom combate.',
    synopsis: 'A última carta de Paulo, escrita na prisão pouco antes de sua morte. Ele passa o bastão a Timóteo: não se envergonhe, pregue a Palavra, permaneça firme.',
    keyVerse: '2 Timóteo 4:7', motif: 'chain', scene: 'night', palette: ['#0f0c0c', '#4d3a33', '#f1d7c4'],
    eps: [
      [1, 2, 'Reaviva o Dom', 'Deus não nos deu espírito de covardia.'],
      [3, 4, 'Pregue a Palavra', 'Toda a Escritura é inspirada — e a coroa da justiça.'],
    ],
  },
  {
    id: 'tt', abbrev: 'tt', name: 'Tito', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 63 d.C.',
    tags: ['Liderança', 'Boas obras', 'Curta'], tagline: 'A graça de Deus se manifestou.',
    synopsis: 'Em Creta, Tito precisa organizar igrejas e enfrentar falsos mestres. Paulo mostra como a graça ensina a viver de maneira sensata, justa e piedosa.',
    keyVerse: 'Tito 2:11-12', motif: 'letter', scene: 'sea', palette: ['#071520', '#1f5470', '#d3f0ff'],
    eps: [[1, 3, 'Ordem em Creta', 'Líderes íntegros, sã doutrina e a graça que educa.']],
  },
  {
    id: 'fm', abbrev: 'fm', name: 'Filemom', testament: 'NT', group: 'Cartas Paulinas', author: 'Paulo', date: 'c. 60 d.C.',
    tags: ['Reconciliação', 'Pessoal', 'Curta'], tagline: 'Receba-o como a mim mesmo.',
    synopsis: 'Um escravo fugitivo se converte e Paulo o envia de volta ao seu senhor com um bilhete: receba-o não mais como escravo, mas como irmão amado.',
    keyVerse: 'Filemom 1:16', motif: 'chain', scene: 'field', palette: ['#171209', '#6e5a2d', '#f5e6be'],
    eps: [[1, 1, 'Mais que um Escravo', 'Onésimo volta para casa — como irmão.']],
  },
  // ───────────────────────── CARTAS GERAIS ─────────────────────────
  {
    id: 'hb', abbrev: 'hb', name: 'Hebreus', testament: 'NT', group: 'Cartas Gerais', author: 'Desconhecido', date: 'c. 68 d.C.',
    tags: ['Teológico', 'Fé', 'Perseverança'], tagline: 'A fé é a certeza do que esperamos.',
    synopsis: 'Cristãos judeus tentados a voltar atrás descobrem que Jesus é superior a anjos, a Moisés e ao sacerdócio levítico. Uma galeria dos heróis da fé e um convite a correr a corrida com perseverança.',
    keyVerse: 'Hebreus 11:1', motif: 'anchor', scene: 'sea', palette: ['#06121c', '#174866', '#cfeaff'],
    eps: [
      [1, 4, 'Superior aos Anjos', 'O Filho, resplendor da glória, e o descanso de Deus.'],
      [5, 7, 'Sumo Sacerdote para Sempre', 'Segundo a ordem de Melquisedeque — uma âncora da alma.'],
      [8, 10, 'Uma Nova Aliança', 'Um sacrifício, uma vez por todas.'],
      [11, 11, 'A Galeria da Fé', 'Abel, Noé, Abraão, Moisés, Raabe... e muitos outros.'],
      [12, 13, 'Correndo a Carreira', 'Olhando para Jesus, autor e consumador da fé.'],
    ],
  },
  {
    id: 'tg', abbrev: 'tg', name: 'Tiago', testament: 'NT', group: 'Cartas Gerais', author: 'Tiago', date: 'c. 48 d.C.',
    tags: ['Prático', 'Sabedoria', 'Fé e obras'], tagline: 'A fé sem obras é morta.',
    synopsis: 'O irmão de Jesus escreve uma carta direta e prática sobre provações, a língua, favoritismo e riqueza. A fé verdadeira aparece em ação.',
    keyVerse: 'Tiago 1:22', motif: 'plumb', scene: 'field', palette: ['#14160b', '#5d6a26', '#ecf5b8'],
    eps: [
      [1, 2, 'Praticantes da Palavra', 'Alegria nas provações e fé que se mostra em obras.'],
      [3, 5, 'Domando a Língua', 'Sabedoria do alto, humildade e a oração do justo.'],
    ],
  },
  {
    id: '1pe', abbrev: '1pe', name: '1 Pedro', testament: 'NT', group: 'Cartas Gerais', author: 'Pedro', date: 'c. 64 d.C.',
    tags: ['Esperança', 'Sofrimento', 'Identidade'], tagline: 'Lancem sobre Ele toda ansiedade.',
    synopsis: 'Aos cristãos espalhados e perseguidos, Pedro lembra: vocês são geração eleita, sacerdócio real. O sofrimento é passageiro; a esperança é viva.',
    keyVerse: '1 Pedro 5:7', motif: 'key', scene: 'storm', palette: ['#0e0f17', '#3c3f63', '#e4e6ff'],
    eps: [
      [1, 2, 'Uma Esperança Viva', 'Pedras vivas, sacerdócio real.'],
      [3, 5, 'Fogo Ardente', 'Sofrer fazendo o bem e lançar sobre Ele a ansiedade.'],
    ],
  },
  {
    id: '2pe', abbrev: '2pe', name: '2 Pedro', testament: 'NT', group: 'Cartas Gerais', author: 'Pedro', date: 'c. 66 d.C.',
    tags: ['Despedida', 'Verdade', 'Curta'], tagline: 'Para o Senhor, um dia é como mil anos.',
    synopsis: 'Pouco antes de morrer, Pedro alerta contra falsos mestres e reafirma a volta de Cristo: Deus não demora, Ele é paciente.',
    keyVerse: '2 Pedro 3:9', motif: 'key', scene: 'night', palette: ['#0c0d16', '#353a66', '#d9dcff'],
    eps: [[1, 3, 'Crescei na Graça', 'Acrescentem à fé a virtude, e aguardem novos céus.']],
  },
  {
    id: '1jo', abbrev: '1jo', name: '1 João', testament: 'NT', group: 'Cartas Gerais', author: 'João', date: 'c. 90 d.C.',
    tags: ['Amor', 'Comunhão', 'Certeza'], tagline: 'Deus é amor.',
    synopsis: 'O apóstolo idoso escreve aos "filhinhos": andem na luz, amem uns aos outros e tenham certeza da vida eterna.',
    keyVerse: '1 João 4:8', motif: 'heart', scene: 'dawn', palette: ['#1d0c10', '#8f3547', '#ffd6dd'],
    eps: [
      [1, 2, 'Andar na Luz', 'Se confessarmos os nossos pecados, Ele é fiel.'],
      [3, 5, 'Deus é Amor', 'No amor não há medo; para que saibam que têm a vida eterna.'],
    ],
  },
  {
    id: '2jo', abbrev: '2jo', name: '2 João', testament: 'NT', group: 'Cartas Gerais', author: 'João', date: 'c. 90 d.C.',
    tags: ['Verdade', 'Amor', 'Curta'], tagline: 'Andar na verdade e no amor.',
    synopsis: 'Um bilhete à "senhora eleita e seus filhos": permaneçam na verdade, amem-se e não deem espaço a enganadores.',
    keyVerse: '2 João 1:6', motif: 'letter', scene: 'field', palette: ['#13100c', '#5c4a34', '#f2e2c6'],
    eps: [[1, 1, 'À Senhora Eleita', 'Amor que obedece e verdade que permanece.']],
  },
  {
    id: '3jo', abbrev: '3jo', name: '3 João', testament: 'NT', group: 'Cartas Gerais', author: 'João', date: 'c. 90 d.C.',
    tags: ['Hospitalidade', 'Pessoal', 'Curta'], tagline: 'Imite o que é bom.',
    synopsis: 'João elogia Gaio pela hospitalidade, confronta o arrogante Diótrefes e recomenda Demétrio.',
    keyVerse: '3 João 1:11', motif: 'letter', scene: 'city', palette: ['#0f1312', '#3c5a52', '#d7f2ea'],
    eps: [[1, 1, 'Ao Amado Gaio', 'Hospitalidade, verdade e bons exemplos.']],
  },
  {
    id: 'jd', abbrev: 'jd', name: 'Judas', testament: 'NT', group: 'Cartas Gerais', author: 'Judas', date: 'c. 68 d.C.',
    tags: ['Alerta', 'Fé', 'Curta'], tagline: 'Batalhem pela fé.',
    synopsis: 'O irmão de Tiago e de Jesus alerta contra infiltrados na igreja e termina com uma das doxologias mais belas: àquele que é poderoso para guardá-los de tropeçar.',
    keyVerse: 'Judas 1:24-25', motif: 'sword', scene: 'storm', palette: ['#120c0c', '#5a2e2e', '#f5cfcf'],
    eps: [[1, 1, 'Batalhem pela Fé', 'Guardem-se no amor de Deus.']],
  },
  // ───────────────────────── PROFECIA ─────────────────────────
  {
    id: 'ap', abbrev: 'ap', name: 'Apocalipse', testament: 'NT', group: 'Profecia', author: 'João', date: 'c. 95 d.C.',
    tags: ['Épico', 'Visões', 'Final da saga'], tagline: 'Eis que faço novas todas as coisas.',
    synopsis: 'Exilado em Patmos, João recebe a revelação de Jesus Cristo: cartas às igrejas, selos, trombetas, o dragão e o Cordeiro. No fim, a vitória: um novo céu, uma nova terra e Deus enxugando toda lágrima.',
    keyVerse: 'Apocalipse 21:4', motif: 'alpha', scene: 'storm', palette: ['#0d0614', '#5a1e7a', '#ffcf5c'],
    eps: [
      [1, 3, 'Cartas às Sete Igrejas', 'O Filho do Homem entre os candelabros.'],
      [4, 5, 'O Trono e o Cordeiro', 'Digno é o Cordeiro que foi morto.'],
      [6, 7, 'Os Sete Selos', 'Cavaleiros e uma grande multidão vestida de branco.'],
      [8, 11, 'As Sete Trombetas', 'Juízos, duas testemunhas e o reino do nosso Senhor.'],
      [12, 14, 'A Mulher e o Dragão', 'A batalha cósmica e o evangelho eterno.'],
      [15, 16, 'As Sete Taças', 'O cântico de Moisés e do Cordeiro.'],
      [17, 18, 'A Queda da Babilônia', 'A grande cidade cai em uma hora.'],
      [19, 20, 'O Cavaleiro Fiel', 'Rei dos reis e Senhor dos senhores.'],
      [21, 22, 'Novo Céu e Nova Terra', 'Ele enxugará toda lágrima. Vem, Senhor Jesus!'],
    ],
  },
];

export const BOOKS: Book[] = RAW.map((r, index) => {
  const { eps, ...rest } = r;
  return {
    ...rest,
    index,
    chapters: VERSE_COUNTS[index].length,
    episodes: eps.map(([start, end, title, synopsis], i) => ({ n: i + 1, start, end, title, synopsis })),
  };
});

export const BOOK_BY_ID: Record<string, Book> = Object.fromEntries(BOOKS.map((b) => [b.id, b]));

export const TOTAL_CHAPTERS = BOOKS.reduce((s, b) => s + b.chapters, 0);

export function getBook(id: string | undefined): Book | undefined {
  return id ? BOOK_BY_ID[id] : undefined;
}

export function episodeOfChapter(book: Book, chapter: number): Episode {
  return book.episodes.find((e) => chapter >= e.start && chapter <= e.end) ?? book.episodes[0];
}

export function versesIn(book: Book, chapter: number): number {
  return VERSE_COUNTS[book.index][chapter - 1] ?? 0;
}

/** Tempo estimado de leitura (minutos) para um intervalo de capítulos. */
export function readingMinutes(book: Book, start: number, end: number): number {
  let verses = 0;
  for (let c = start; c <= end; c++) verses += versesIn(book, c);
  return Math.max(1, Math.round(verses * 0.2));
}

export function chapterRange(e: Episode): string {
  return e.start === e.end ? `Capítulo ${e.start}` : `Capítulos ${e.start}–${e.end}`;
}

export const GROUP_ROWS: { group: Group | Group[]; title: string }[] = [
  { group: 'Pentateuco', title: 'Pentateuco · Onde tudo começou' },
  { group: 'Históricos', title: 'Históricos · Épicos de reis, batalhas e reconstrução' },
  { group: 'Poéticos', title: 'Poéticos · Poesia, sabedoria e louvor' },
  { group: 'Profetas Maiores', title: 'Profetas Maiores · Visões que atravessam séculos' },
  { group: 'Profetas Menores', title: 'Profetas Menores · Minisséries proféticas' },
  { group: ['Evangelhos', 'Igreja Primitiva'], title: 'Evangelhos e Atos · A vida de Jesus e a Igreja' },
  { group: 'Cartas Paulinas', title: 'Cartas de Paulo' },
  { group: ['Cartas Gerais', 'Profecia'], title: 'Cartas Gerais e Apocalipse · O grande final' },
];

/** Livros mais lidos (popularidade geral) — usado no Top 10. */
export const TOP10 = ['sl', 'jo', 'gn', 'pv', 'rm', 'mt', 'is', 'at', 'ef', 'fp'];

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
