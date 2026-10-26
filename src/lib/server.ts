/** Servidor da comunidade (Supabase): todas as chamadas são funções RPC protegidas por token de sessão. */
export const SERVER_URL = 'https://axunucwmkupmfyfmkryl.supabase.co';
const KEY = 'sb_publishable_SwlmVFP0ok0I61YFICaxGg_VTYB4lCK';

const MESSAGES: Record<string, string> = {
  sessao_invalida: 'Sua sessão expirou. Entre novamente.',
  sem_permissao: 'Você não tem permissão para isso.',
  igreja_inativa: 'A comunidade desta igreja ainda não foi ativada.',
  login_existe: 'Já existe uma conta com este celular/e-mail nesta igreja. Use “Já tenho conta”.',
  login_incorreto: 'Celular/e-mail ou PIN incorretos.',
  login_invalido: 'Informe um celular ou e-mail válido.',
  bloqueado: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.',
  pin_curto: 'O PIN precisa ter pelo menos 4 dígitos.',
  codigo_invalido: 'Código inválido. Confira com o pastor.',
  chave_mestra_invalida: 'Chave mestra incorreta.',
  endereco_invalido: 'Endereço da igreja inválido.',
  serie_invalida: 'Série não encontrada.',
  nao_encontrado: 'Não encontrado.',
};

export class ServerError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? MESSAGES[code] ?? code);
    this.code = code;
  }
}

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch {
    throw new ServerError('offline', 'Sem conexão com a internet.');
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg = String((data as { message?: string } | null)?.message ?? res.statusText);
    const code = Object.keys(MESSAGES).find((k) => msg.includes(k)) ?? 'erro';
    throw new ServerError(code, MESSAGES[code] ?? `Erro no servidor: ${msg}`);
  }
  const err = (data as { error?: string } | null)?.error;
  if (err) throw new ServerError(err);
  return data as T;
}
