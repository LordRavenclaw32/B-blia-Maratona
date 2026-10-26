import { useEffect, useState } from 'react';
import { useProfile } from '../lib/store';
import { canvasToBlob, renderShareImage, shareText, type ShareFormat, type ShareInput } from '../lib/share';
import { Icon } from './Icon';
import { Modal, useUI } from './ui';

const TITLES: Record<ShareInput['kind'], string> = {
  book: 'Compartilhar progresso da série',
  episode: 'Compartilhar episódio concluído',
  overall: 'Compartilhar minha maratona',
  devotional: 'Compartilhar devocional',
  verse: 'Compartilhar versículo',
};

export function ShareModal({ input, onClose }: { input: Omit<ShareInput, 'profile' | 'format'>; onClose: () => void }) {
  const profile = useProfile();
  const { toast } = useUI();
  const [format, setFormat] = useState<ShareFormat>('story');
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(true);

  const full: ShareInput = { ...input, profile, format };
  const text = shareText(full);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    setBusy(true);
    renderShareImage({ ...input, profile, format })
      .then(canvasToBlob)
      .then((b) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      })
      .catch(() => alive && toast('Não foi possível gerar a imagem'))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [format]);

  const fileName = `maratona-biblica-${input.kind}-${format}.png`;

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    toast('Imagem salva');
  };

  const nativeShare = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: 'Maratona Bíblica' });
      } else if (navigator.share) {
        await navigator.share({ text, title: 'Maratona Bíblica' });
      } else {
        download();
      }
    } catch {
      /* cancelado */
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Texto copiado');
    } catch {
      toast('Não foi possível copiar');
    }
  };

  const copyImage = async () => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Imagem copiada');
    } catch {
      toast('Seu navegador não permite copiar imagens — use Baixar');
    }
  };

  const canNative = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <Modal onClose={onClose} className="share-modal" label={TITLES[input.kind]}>
      <button className="modal-close" onClick={onClose} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <div className="share-layout">
        <div className={`share-preview ${format}`}>
          {url && <img src={url} alt="Prévia da imagem para compartilhar" />}
          {busy && <div className="spinner" />}
        </div>
        <div className="share-side">
          <h2>{TITLES[input.kind]}</h2>
          <p className="muted">Gere uma imagem para stories, feed ou para enviar aos amigos.</p>
          <div className="seg" role="tablist">
            <button className={format === 'story' ? 'on' : ''} onClick={() => setFormat('story')} role="tab" aria-selected={format === 'story'}>
              Stories 9:16
            </button>
            <button className={format === 'post' ? 'on' : ''} onClick={() => setFormat('post')} role="tab" aria-selected={format === 'post'}>
              Feed 1:1
            </button>
          </div>
          <div className="share-actions">
            {canNative && (
              <button className="btn btn-primary" onClick={nativeShare} disabled={!blob}>
                <Icon name="share" /> Compartilhar
              </button>
            )}
            <button className={`btn ${canNative ? 'btn-gray' : 'btn-primary'}`} onClick={download} disabled={!blob}>
              <Icon name="download" /> Baixar imagem
            </button>
            <a className="btn btn-whats" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" /> Enviar no WhatsApp
            </a>
            <button className="btn btn-gray" onClick={copyImage} disabled={!blob}>
              <Icon name="image" /> Copiar imagem
            </button>
            <button className="btn btn-gray" onClick={copyText}>
              <Icon name="copy" /> Copiar texto
            </button>
          </div>
          <blockquote className="share-text">{text}</blockquote>
        </div>
      </div>
    </Modal>
  );
}
