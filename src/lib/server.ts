/** Servidor da comunidade (Supabase): todas as chamadas são funções RPC protegidas por token de sessão. */
export const SERVER_URL = 'https://axunucwmkupmfyfmkryl.supabase.co';
export const KEY = 'sb_publishable_SwlmVFP0ok0I61YFICaxGg_VTYB4lCK';

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
  publicacao_vazia: 'Escreva algo ou anexe uma mídia.',
  limite_publicacoes: 'Muitas publicações em pouco tempo. Tente mais tarde.',
  limite_envios: 'Muitos envios de mídia em pouco tempo. Tente mais tarde.',
  midia_invalida: 'Mídia inválida.',
  mensagem_vazia: 'Escreva uma mensagem.',
  titulo_obrigatorio: 'Dê um nome ao grupo.',
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

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/webm': 'weba', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a',
};
export const MAX_UPLOAD = 25 * 1024 * 1024;

/** Envia um arquivo para o armazenamento de mídias (pasta = ticket de envio do membro) e devolve a URL pública. */
export async function uploadFile(ticket: string, blob: Blob): Promise<string> {
  const type = (blob.type || 'application/octet-stream').split(';')[0];
  if (blob.size > MAX_UPLOAD) throw new ServerError('arquivo_grande', 'Arquivo muito grande (máx. 25 MB). Para vídeos longos, use um link do YouTube.');
  const path = `${ticket}/${Date.now().toString(36)}.${EXT[type] ?? 'bin'}`;
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/storage/v1/object/midia/${path}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': type, 'x-upsert': 'false' },
      body: blob,
    });
  } catch {
    throw new ServerError('offline', 'Sem conexão com a internet.');
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new ServerError('upload', /mime|type/i.test(t) ? 'Formato de arquivo não aceito.' : /size|large/i.test(t) ? 'Arquivo muito grande (máx. 25 MB).' : `Falha ao enviar a mídia (${res.status}).`);
  }
  return `${SERVER_URL}/storage/v1/object/public/midia/${path}`;
}
