/** Artes próprias do BíbliaFlix (em public/art), com prioridade sobre as obras do Wikimedia Commons.
 * Chave: id do livro (pôster da série) ou "livro:episódio". */
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
  'ex:7': { file: 'ex-e7-maos-erguidas', w: 736, h: 1308, name: 'As mãos erguidas de Moisés' },
  'ex:8': { file: 'ex-e8-moises-tabuas', w: 450, h: 544, name: 'Moisés e as tábuas da Lei' },
  'fm': { file: 'fm-paulo-onesimo', w: 736, h: 1104, name: 'Paulo e Onésimo' },
  'gn:3': { file: 'gn-e3-diluvio', w: 736, h: 1288, name: 'A arca de Noé' },
  'gn:5': { file: 'gn-e5-chamado-abrao', w: 736, h: 1104, name: 'O chamado de Abrão' },
  'gn:8': { file: 'gn-e8-abraao-isaque', w: 736, h: 1104, name: 'Abraão e Isaque' },
  'jo:2': { file: 'jo-e2-jesus-ensinando', w: 736, h: 1307, name: 'Jesus ensinando' },
  'jo:3': { file: 'jo-e3-multiplicacao', w: 736, h: 1104, name: 'A multiplicação dos pães' },
  'jo:6': { file: 'jo-e6-uncao', w: 736, h: 1091, name: 'A unção em Betânia' },
  'jr': { file: 'jr-lamento-jerusalem', w: 647, h: 890, name: 'O lamento sobre Jerusalém' },
  'lc:10': { file: 'lc-e10-getsemani', w: 564, h: 846, name: 'Getsêmani' },
  'lc:3': { file: 'lc-e3-pesca', w: 600, h: 900, name: 'A pesca maravilhosa' },
  'lc:7': { file: 'lc-e7-filho-prodigo', w: 735, h: 1048, name: 'O filho pródigo' },
  'mc:1': { file: 'mc-e1-paralitico', w: 735, h: 1052, name: 'O paralítico descido pelo telhado' },
  'mt:10': { file: 'mt-e10-judas', w: 736, h: 1104, name: 'Judas devolve as moedas' },
  'mt:3': { file: 'mt-e3-sermao-monte', w: 736, h: 1104, name: 'O Sermão do Monte' },
  'nm:5': { file: 'nm-e5-espias', w: 736, h: 1104, name: 'Os espias' },
  'rm': { file: 'rm-paulo-escrevendo', w: 736, h: 736, name: 'Paulo escrevendo' },
  'zc:3': { file: 'zc-e3-trinta-moedas', w: 736, h: 1104, name: 'Trinta moedas de prata' },
};

/** Fundo da tela de perfis. */
export const PROFILE_BACKGROUND = 'art/bg-biblia-maos.webp';
