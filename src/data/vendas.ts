/**
 * Apresentação comercial para igrejas (#/apresentacao).
 * Preencha VENDEDOR para exibir o botão de contato; ajuste os preços quando quiser.
 */
export const VENDEDOR = {
  nome: '',
  /** WhatsApp com DDD, ex.: '11987654321' */
  whatsapp: '',
  email: '',
};

export interface Pacote {
  id: string;
  nome: string;
  resumo: string;
  destaque?: boolean;
  faixas: { faixa: string; valor: string; manutencao: string }[];
  inclui: string[];
  observacao?: string;
}

export const PACOTES: Pacote[] = [
  {
    id: 'igreja',
    nome: 'Pacote Igreja',
    resumo: 'Licença vitalícia para todos os membros, com o nome e a identidade da sua igreja. A igreja divulga o link e cada membro instala no celular.',
    destaque: true,
    faixas: [
      { faixa: 'Até 100 membros', valor: 'R$ 790', manutencao: 'R$ 49/mês ou R$ 490/ano' },
      { faixa: '101 a 300 membros', valor: 'R$ 1.490', manutencao: 'R$ 79/mês ou R$ 790/ano' },
      { faixa: '301 a 800 membros', valor: 'R$ 2.690', manutencao: 'R$ 129/mês ou R$ 1.290/ano' },
      { faixa: 'Acima de 800 ou rede de congregações', valor: 'Sob consulta', manutencao: 'Sob consulta' },
    ],
    inclui: [
      'App com nome, logo e cores da igreja',
      'Link próprio com prévia no WhatsApp',
      'Página da igreja: avisos, cultos, contatos, Pix e redes',
      'Plano de leitura da igreja (campanhas e maratonas)',
      'Playlists do ministério de louvor',
      'Código de acesso exclusivo para membros (opcional)',
      'Mensagens, séries, lançamentos, vídeos e podcasts da igreja',
      'Mural do mês: mensagens antes e depois da pregação',
      'Relacionamentos: atividades dos membros e acompanhamento da leitura pelos líderes',
      'Níveis de acesso: membro, líder e pastor(a), com estúdio de criação',
      'Atualização anual do app incluída no plano de manutenção',
    ],
    observacao: 'Pagamento único da licença. A manutenção é opcional e cobre atualizações, troca de avisos/planos e suporte.',
  },
  {
    id: 'membros',
    nome: 'Pacote Membros',
    resumo: 'Licença coletiva por membro para igrejas que querem começar com um grupo (jovens, células, EBD). Mínimo de 30 membros.',
    faixas: [
      { faixa: '30 a 99 membros', valor: 'R$ 15 por membro', manutencao: 'R$ 3 por membro/semestre' },
      { faixa: '100 a 299 membros', valor: 'R$ 12 por membro', manutencao: 'R$ 2,50 por membro/semestre' },
      { faixa: '300 membros ou mais', valor: 'R$ 9 por membro', manutencao: 'R$ 2 por membro/semestre' },
    ],
    inclui: [
      'Tudo do app da igreja para o grupo licenciado',
      'Código de acesso exclusivo do grupo',
      'Atualizações semestrais no plano de manutenção',
      'Upgrade para o Pacote Igreja com desconto do valor já pago',
    ],
    observacao: 'Vendido sempre para a igreja (licença coletiva), nunca por pessoa.',
  },
];

export const BENEFICIOS: { icon: string; titulo: string; texto: string }[] = [
  { icon: 'book', titulo: 'A Bíblia como série', texto: 'Cada livro vira uma série e cada grupo de capítulos um episódio, com resumos e arte bíblica clássica.' },
  { icon: 'calendar', titulo: 'Plano de leitura da igreja', texto: 'A liderança define a campanha (ex.: “Atos em 28 dias”) e todos leem juntos, com o dia de hoje em destaque.' },
  { icon: 'share', titulo: 'Divulgação espontânea', texto: 'Membros compartilham progresso e devocionais nos stories com a marca da igreja.' },
  { icon: 'play', titulo: 'Mensagens e lançamentos', texto: 'Pastores, líderes e convidados lançam séries com temporadas, contagem regressiva, vídeos, podcasts e mensagens completas com versículos clicáveis.' },
  { icon: 'calendar', titulo: 'Mural do mês', texto: 'Mensagens para preparar o coração antes do culto e aprofundar a Palavra depois da pregação.' },
  { icon: 'user', titulo: 'Relacionamentos', texto: 'Membros veem a leitura dos irmãos e incentivam com um “Amém”; líderes acompanham a constância de cada um e chamam no WhatsApp.' },
  { icon: 'bell', titulo: 'Avisos e agenda', texto: 'Cultos, eventos, contatos, Pix e redes sociais da igreja sempre à mão.' },
  { icon: 'music', titulo: 'Louvor de fundo', texto: 'Playlists do ministério de louvor tocando enquanto o membro lê.' },
  { icon: 'lock', titulo: 'Simples e seguro', texto: 'Funciona no celular sem loja de apps. A comunidade usa conta com PIN e níveis de acesso; o membro autoriza o acompanhamento e escolhe o que mostrar aos irmãos.' },
];
