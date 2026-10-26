/** Artes próprias do BíbliaFlix (em public/art), com prioridade sobre as obras do Wikimedia Commons.
 * Chave: id do livro (pôster da série), "livro@backdrop" (banner da série) ou "livro:episódio". */
export interface CustomArt {
  file: string;
  w: number;
  h: number;
  name: string;
}

export const CUSTOM_ART: Record<string, CustomArt> = {
  'am': { file: 'am-profeta', w: 736, h: 1104, name: 'O profeta' },
  'ap:1': { file: 'ap-e1-patmos', w: 736, h: 1308, name: 'João em Patmos' },
  'ap:3': { file: 'ap-e3-selos', w: 736, h: 736, name: 'O livro dos sete selos' },
  'ap:4': { file: 'ap-e4-trombetas', w: 736, h: 1349, name: 'As sete trombetas' },
  'at:1': { file: 'at-e1-ascensao', w: 736, h: 1104, name: 'A ascensão' },
  'at:4': { file: 'at-e4-damasco', w: 736, h: 1104, name: 'A estrada de Damasco' },
  'at:5': { file: 'at-e5-cornelio', w: 736, h: 1308, name: 'A casa de Cornélio' },
  'at:8': { file: 'at-e8-paulo-atenas', w: 736, h: 1104, name: 'Paulo prega em Atenas' },
  'dt': { file: 'dt-moises-discurso', w: 736, h: 1104, name: 'Moisés fala ao povo' },
  'ef': { file: 'ef-paulo-cartas', w: 736, h: 1104, name: 'Paulo escreve às igrejas' },
  'ex': { file: 'ex-moises-mar-vermelho', w: 720, h: 960, name: 'Moisés abre o Mar Vermelho' },
  'ex@backdrop': { file: 'ex-carros-egito', w: 736, h: 1308, name: 'Os carros do Egito no mar' },
  'ex:6': { file: 'ex-e6-farao-mar', w: 736, h: 1100, name: 'Faraó no mar' },
  'ex:7': { file: 'ex-e7-maos-erguidas', w: 736, h: 1308, name: 'As mãos erguidas de Moisés' },
  'ex:8': { file: 'ex-e8-moises-tabuas', w: 450, h: 544, name: 'Moisés e as tábuas da Lei' },
  'ex:13': { file: 'ex-e13-tabernaculo', w: 600, h: 1067, name: 'O Tabernáculo' },
  'lv': { file: 'ex-e13-tabernaculo', w: 600, h: 1067, name: 'O Tabernáculo' },
  'fm': { file: 'fm-paulo-onesimo', w: 736, h: 1104, name: 'Paulo e Onésimo' },
  'gn:2': { file: 'gn-e2-expulsao-eden', w: 736, h: 1308, name: 'A expulsão do Éden' },
  'gn:3': { file: 'gn-e3-diluvio', w: 736, h: 1288, name: 'A arca de Noé' },
  'gn:5': { file: 'gn-e5-chamado-abrao', w: 736, h: 1104, name: 'O chamado de Abrão' },
  'gn:8': { file: 'gn-e8-abraao-isaque', w: 736, h: 1104, name: 'Abraão e Isaque' },
  'hb:4': { file: 'hb-e4-galeria-fe', w: 736, h: 736, name: 'A galeria da fé' },
  'jo:2': { file: 'jo-e2-jesus-ensinando', w: 736, h: 1307, name: 'Jesus ensinando' },
  'jo:3': { file: 'jo-e3-multiplicacao', w: 736, h: 1104, name: 'A multiplicação dos pães' },
  'jo:6': { file: 'jo-e6-uncao', w: 736, h: 1091, name: 'A unção em Betânia' },
  'jr': { file: 'jr-lamento-jerusalem', w: 647, h: 890, name: 'O lamento sobre Jerusalém' },
  'lc:3': { file: 'lc-e3-pesca', w: 600, h: 900, name: 'A pesca maravilhosa' },
  'lc:7': { file: 'lc-e7-filho-prodigo', w: 735, h: 1048, name: 'O filho pródigo' },
  'lc:10': { file: 'lc-e10-getsemani', w: 564, h: 846, name: 'Getsêmani' },
  'mc:1': { file: 'mc-e1-paralitico', w: 735, h: 1052, name: 'O paralítico descido pelo telhado' },
  'mc:6': { file: 'mc-e6-caminho-calvario', w: 736, h: 852, name: 'O caminho do Calvário' },
  'mt:3': { file: 'mt-e3-sermao-monte', w: 736, h: 1104, name: 'O Sermão do Monte' },
  'mt:8': { file: 'mt-e8-purificacao-templo', w: 736, h: 1104, name: 'Jesus purifica o templo' },
  'mt:10': { file: 'mt-e10-judas', w: 736, h: 1104, name: 'Judas devolve as moedas' },
  'nm:5': { file: 'nm-e5-espias', w: 736, h: 1104, name: 'Os espias' },
  'rm': { file: 'rm-paulo-escrevendo', w: 736, h: 736, name: 'Paulo escrevendo' },
  'rm:1': { file: 'rm-e1-a-lei', w: 736, h: 981, name: 'Diante da Lei' },
  'rm:2': { file: 'rm-e2-ponte-cruz', w: 453, h: 679, name: 'A cruz, a ponte' },
  'zc:3': { file: 'zc-e3-trinta-moedas', w: 736, h: 1104, name: 'Trinta moedas de prata' },
  '1sm:6': { file: '1sm-e6-davi-golias', w: 735, h: 919, name: 'Davi e Golias' },
  '1jo:1': { file: '1jo-e1-advogado', w: 736, h: 736, name: 'Temos um Advogado' },
  '1ts:2': { file: '1ts-e2-volta-senhor', w: 720, h: 1080, name: 'A volta do Senhor' },
  'ap:2': { file: 'ap-e2-leao-juda', w: 736, h: 1104, name: 'O Leão de Judá' },
  'gn:13': { file: 'gn-e13-jose-poco', w: 736, h: 1104, name: 'José lançado na cisterna' },
  'ex:5': { file: 'ex-e5-cordeiro-pascoa', w: 736, h: 1104, name: 'O cordeiro da Páscoa' },
  'ed': { file: 'ed-rolo-lei', w: 736, h: 1104, name: 'O rolo da Lei' },
  'jr:11': { file: 'jr-e11-rolo-queimado', w: 736, h: 1104, name: 'O rolo queimado' },
  'js:5': { file: 'js-e5-batalha', w: 736, h: 1307, name: 'A batalha de Gibeom' },
  'lc:1': { file: 'lc-e1-nascimento', w: 736, h: 1308, name: 'O nascimento em Belém' },
};

/** Fundo da tela de perfis. */
export const PROFILE_BACKGROUND = 'art/bg-biblia-maos.webp';

/** Fundo da tela de boas-vindas (primeiro acesso). */
export const WELCOME_BACKGROUND = 'art/bg-maratona-telas.webp';

/** Fundo das devocionais (diário, editor e imagem de compartilhamento). */
export const DEVOTIONAL_BACKGROUND = 'art/bg-devocional.webp';

/** Fundo da página Minha maratona. */
export const STATS_BACKGROUND = 'art/bg-livro-luz.webp';
