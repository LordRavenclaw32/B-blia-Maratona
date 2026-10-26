import { useMemo, useRef, useState } from 'react';
import type { Book } from '../data/books';
import { COVER_STYLES, fileToCover, galleryItems, styleFilter, useCovers } from '../lib/covers';
import { imageUrl } from '../lib/paintings';
import { useProfile, useStore, type Cover } from '../lib/store';
import { normalize } from '../data/books';
import { BFMark } from './Brand';
import { Icon } from './Icon';
import { Modal, useUI } from './ui';

type Filter = 'serie' | 'AT' | 'NT' | 'todas';

/** Editor de capa: escolha uma arte bíblica da galeria ou envie sua própria imagem, com estilo visual. */
export function CoverEditor({ book, ep, onClose }: { book: Book; ep?: number; onClose: () => void }) {
  const profile = useProfile();
  const { actions } = useStore();
  const covers = useCovers();
  const { toast, openShare } = useUI();
  const key = ep ? `${book.id}:${ep}` : book.id;
  const existing = profile.covers[key];
  const episode = ep ? book.episodes[ep - 1] : undefined;

  const [tab, setTab] = useState<'galeria' | 'enviar'>('galeria');
  const [filter, setFilter] = useState<Filter>('serie');
  const [q, setQ] = useState('');
  const [choice, setChoice] = useState<Cover | null>(existing ?? null);
  const [style, setStyle] = useState(existing?.style ?? 'original');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const all = galleryItems();
    const nq = normalize(q);
    return all.filter(
      (it) =>
        (filter === 'todas' || (filter === 'serie' ? it.book === book.id : it.testament === filter)) &&
        (!nq || normalize(it.name).includes(nq)),
    );
  }, [filter, q, book.id]);

  const previewUrl = choice ? covers.urlOf(choice.src) : imageUrl(book, ep ? 'thumb' : 'poster', ep);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const { dataUrl, w, h } = await fileToCover(file);
      const src = await covers.saveUpload(dataUrl);
      setChoice({ src, w, h });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = (andShare = false) => {
    if (!choice) {
      if (style !== 'original') {
        // só estilo sobre a arte padrão
        const url = imageUrl(book, ep ? 'thumb' : 'poster', ep);
        actions.setCover(key, { src: url, w: 1000, h: ep ? 562 : 1500, style });
      } else actions.setCover(key, null);
    } else actions.setCover(key, { ...choice, style });
    toast(ep ? 'Capa do episódio atualizada' : `Capa de ${book.name} atualizada`);
    onClose();
    if (andShare) setTimeout(() => openShare(ep ? { kind: 'episode', book, episode } : { kind: 'book', book }), 80);
  };

  const reset = () => {
    actions.setCover(key, null);
    toast('Capa original restaurada');
    onClose();
  };

  return (
    <Modal onClose={onClose} className="cover-modal" label="Personalizar capa">
      <button className="modal-close" onClick={onClose} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <div className="cover-layout">
        <div className="cover-side">
          <h2>
            <Icon name="image" /> Personalizar capa
          </h2>
          <p className="muted small">
            {ep ? `${book.name} · E${ep}: ${episode?.title}` : `Série ${book.name}`}. A capa aparece no app e nas imagens que você compartilha.
          </p>
          <div className={`cover-preview ${ep ? 'wide' : 'tall'}`}>
            {previewUrl && <img src={previewUrl} alt="" style={{ filter: styleFilter(style) }} />}
            <span className="series-badge">
              <BFMark size={18} />
              SÉRIE
            </span>
            <span className="card-title poster-title">{ep ? episode?.title : book.name}</span>
          </div>
          <span className="qs-title">Estilo</span>
          <div className="cover-styles">
            {COVER_STYLES.map((s) => (
              <button key={s.id} className={style === s.id ? 'on' : ''} onClick={() => setStyle(s.id)}>
                {previewUrl && <img src={previewUrl} alt="" style={{ filter: s.filter }} />}
                <span>{s.name}</span>
              </button>
            ))}
          </div>
          <div className="cover-actions">
            <button className="btn btn-primary" onClick={() => save(false)}>
              <Icon name="check" /> Salvar capa
            </button>
            <button className="btn btn-gray" onClick={() => save(true)}>
              <Icon name="share" /> Salvar e compartilhar
            </button>
            {existing && (
              <button className="link" onClick={reset}>
                <Icon name="refresh" size={16} /> Restaurar original
              </button>
            )}
          </div>
        </div>

        <div className="cover-main">
          <div className="seg" role="tablist">
            <button className={tab === 'galeria' ? 'on' : ''} onClick={() => setTab('galeria')} role="tab" aria-selected={tab === 'galeria'}>
              Galeria bíblica
            </button>
            <button className={tab === 'enviar' ? 'on' : ''} onClick={() => setTab('enviar')} role="tab" aria-selected={tab === 'enviar'}>
              Minha imagem
            </button>
          </div>

          {tab === 'galeria' ? (
            <>
              <div className="cover-filters">
                <div className="chips">
                  {(
                    [
                      ['serie', `De ${book.name}`],
                      ['AT', 'Antigo Testamento'],
                      ['NT', 'Novo Testamento'],
                      ['todas', 'Todas'],
                    ] as [Filter, string][]
                  ).map(([id, label]) => (
                    <button key={id} className={`chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>
                      {label}
                    </button>
                  ))}
                </div>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar arte (ex.: Moisés, cruz, mar)" aria-label="Buscar arte" />
              </div>
              <div className="cover-grid">
                {items.map((it) => (
                  <button
                    key={it.src}
                    className={choice?.src === it.src ? 'on' : ''}
                    onClick={() => setChoice({ src: it.src, w: it.w, h: it.h })}
                    title={it.name}
                  >
                    <img src={it.thumb} alt={it.name} loading="lazy" />
                  </button>
                ))}
                {!items.length && <p className="muted">Nenhuma arte encontrada.</p>}
              </div>
            </>
          ) : (
            <div className="cover-upload">
              <button className="upload-drop" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Icon name="upload" size={34} />
                <b>{busy ? 'Processando…' : 'Escolher imagem do dispositivo'}</b>
                <span className="muted small">Fotos, artes bíblicas ou temáticas. Fica salva só neste aparelho e entra no seu backup.</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => (e.target.files?.[0] && upload(e.target.files[0]), (e.target.value = ''))} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
