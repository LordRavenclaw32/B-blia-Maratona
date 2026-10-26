import { useMemo, useState } from 'react';
import { BOOKS, getBook } from '../data/books';
import { useStore } from '../lib/store';
import { Icon } from './Icon';
import { DEVOTIONAL_BACKGROUND } from '../data/customArt';
import { assetUrl } from '../lib/paintings';
import { Modal, useUI, type DevotionalDraft } from './ui';
import { COMMUNITY_NAME } from '../lib/church';
import { useCommunity, type Post } from '../lib/community';

export const MOODS = ['Grato', 'Edificado', 'Consolado', 'Confrontado', 'Inspirado', 'Reflexivo', 'Desafiado', 'Em paz', 'Esperançoso', 'Arrependido'];

const PROMPTS = [
  'O que este texto revela sobre Deus?',
  'O que Deus falou comigo hoje?',
  'Como vou aplicar isso na prática?',
  'Pelo que vou orar?',
];

export function StarRating({ value, onChange, size = 26 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="stars" onMouseLeave={() => setHover(0)} role={onChange ? 'radiogroup' : undefined} aria-label="Avaliação">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={(hover || value) >= n ? 'on' : ''}
          onMouseEnter={() => onChange && setHover(n)}
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          role={onChange ? 'radio' : undefined}
          aria-checked={onChange ? value === n : undefined}
        >
          <Icon name="star" size={size} />
        </button>
      ))}
    </div>
  );
}

export function DevotionalModal({ draft, onClose }: { draft: DevotionalDraft; onClose: () => void }) {
  const { actions } = useStore();
  const { toast, openShare } = useUI();
  const ex = draft.existing;
  const [bookId, setBookId] = useState(ex?.bookId ?? draft.bookId ?? 'gn');
  const [episode, setEpisode] = useState<number | ''>(ex?.episode ?? draft.episode ?? '');
  const [title, setTitle] = useState(ex?.title ?? '');
  const [rating, setRating] = useState(ex?.rating ?? 5);
  const [mood, setMood] = useState(ex?.mood ?? '');
  const [verse, setVerse] = useState(ex?.verse ?? draft.verse ?? '');
  const [text, setText] = useState(ex?.text ?? '');
  const community = useCommunity();
  const [vis, setVis] = useState<'public' | 'private'>(ex?.visibility ?? (draft.inspired ? 'public' : 'private'));
  const [busy, setBusy] = useState(false);
  const book = getBook(bookId)!;
  const ep = useMemo(() => (episode ? book.episodes[episode - 1] : undefined), [book, episode]);

  const save = async (andShare: boolean) => {
    if (!text.trim()) {
      toast('Escreva sua devocional antes de salvar');
      return;
    }
    let d = actions.saveDevotional({
      id: ex?.id,
      bookId,
      episode: episode || undefined,
      title: title.trim() || (ep ? ep.title : book.name),
      text: text.trim(),
      rating,
      mood,
      verse: verse.trim() || undefined,
      visibility: vis,
    });
    // publica na comunidade (público) ou mantém a publicação existente como privada
    if (community.session && (vis === 'public' || d.postId)) {
      setBusy(true);
      try {
        const p = await community.call<Post>('save_post', {
          p: { id: d.postId ?? '', kind: 'devocional', title: d.title, body: d.text, verse: d.verse ?? '', book: d.bookId, rating: d.rating, visibility: vis, inspired_by: draft.inspired?.postId ?? '' },
        });
        d = actions.saveDevotional({ ...d, postId: p.id });
        if (!ex) window.dispatchEvent(new CustomEvent('bf:post', { detail: p }));
      } catch (e) {
        toast(`Salva no diário, mas não foi publicada: ${(e as Error).message}`);
      } finally {
        setBusy(false);
      }
    }
    toast(ex ? 'Devocional atualizada' : vis === 'public' && community.session ? `Devocional publicada para ${COMMUNITY_NAME}` : 'Devocional salva no seu diário');
    onClose();
    if (andShare) setTimeout(() => openShare({ kind: 'devotional', devotional: d, book }), 50);
  };

  const addPrompt = (p: string) => setText((t) => (t ? `${t.trimEnd()}\n\n${p}\n` : `${p}\n`));

  return (
    <Modal onClose={onClose} className="dev-modal" label="Devocional">
      <button className="modal-close" onClick={onClose} aria-label="Fechar">
        <Icon name="close" />
      </button>
      <div className="dev-banner" style={{ backgroundImage: `url(${assetUrl(DEVOTIONAL_BACKGROUND)})` }} aria-hidden="true" />
      <h2 className="dev-head">
        <Icon name="pen" /> {ex ? 'Editar devocional' : 'Avalie sua maratona'}
      </h2>
      <p className="muted">Como uma crítica do episódio — só que sobre o que Deus falou com você.</p>
      {draft.inspired && (
        <p className="dev-inspired">
          <Icon name="pen" size={14} /> Inspirado na devocional de <b>{draft.inspired.name}</b>
          {draft.inspired.title ? ` · “${draft.inspired.title}”` : ''}
        </p>
      )}
      <div className="form-grid">
        <label>
          <span>Série (livro)</span>
          <select
            value={bookId}
            onChange={(e) => {
              setBookId(e.target.value);
              setEpisode('');
            }}
          >
            {BOOKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Episódio</span>
          <select value={episode} onChange={(e) => setEpisode(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Série inteira</option>
            {book.episodes.map((e) => (
              <option key={e.n} value={e.n}>
                E{e.n} · {e.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Título</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ep ? ep.title : `Minha leitura de ${book.name}`} maxLength={80} />
      </label>
      <div className="field">
        <span>Sua avaliação</span>
        <StarRating value={rating} onChange={setRating} size={30} />
      </div>
      <div className="field">
        <span>Como você se sentiu?</span>
        <div className="chips">
          {MOODS.map((m) => (
            <button key={m} type="button" className={`chip ${mood === m ? 'on' : ''}`} onClick={() => setMood(mood === m ? '' : m)}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Versículo marcante</span>
        <input value={verse} onChange={(e) => setVerse(e.target.value)} placeholder={`Ex.: ${book.keyVerse}`} maxLength={120} />
      </label>
      <label className="field">
        <span>Sua devocional</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="O que esse episódio despertou em você?" />
      </label>
      <div className="chips prompts">
        {PROMPTS.map((p) => (
          <button key={p} type="button" className="chip ghost" onClick={() => addPrompt(p)}>
            + {p}
          </button>
        ))}
      </div>
      <div className="field">
        <span>Quem pode ver</span>
        {community.session ? (
          <div className="seg" role="radiogroup" aria-label="Visibilidade">
            <button type="button" className={vis === 'public' ? 'on' : ''} onClick={() => setVis('public')}>
              <Icon name="globe" size={14} /> Público · {COMMUNITY_NAME}
            </button>
            <button type="button" className={vis === 'private' ? 'on' : ''} onClick={() => setVis('private')}>
              <Icon name="lock" size={14} /> Privado (só eu)
            </button>
          </div>
        ) : (
          <p className="muted small">
            Privado, no seu diário. <a href="#/comunidade">Entre na comunidade</a> para publicar e receber Amém, comentários e compartilhamentos.
          </p>
        )}
      </div>
      <div className="modal-actions">
        <button className="btn btn-gray" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-gray" onClick={() => save(true)}>
          <Icon name="share" /> Salvar e compartilhar
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={() => save(false)}>
          <Icon name="check" /> {busy ? 'Publicando…' : vis === 'public' && community.session ? 'Salvar e publicar' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}
