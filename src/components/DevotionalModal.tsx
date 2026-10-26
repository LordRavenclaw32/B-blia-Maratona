import { useMemo, useState } from 'react';
import { BOOKS, getBook } from '../data/books';
import { useStore } from '../lib/store';
import { Icon } from './Icon';
import { DEVOTIONAL_BACKGROUND } from '../data/customArt';
import { assetUrl } from '../lib/paintings';
import { Modal, useUI, type DevotionalDraft } from './ui';

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
  const book = getBook(bookId)!;
  const ep = useMemo(() => (episode ? book.episodes[episode - 1] : undefined), [book, episode]);

  const save = (andShare: boolean) => {
    if (!text.trim()) {
      toast('Escreva sua devocional antes de salvar');
      return;
    }
    const d = actions.saveDevotional({
      id: ex?.id,
      bookId,
      episode: episode || undefined,
      title: title.trim() || (ep ? ep.title : book.name),
      text: text.trim(),
      rating,
      mood,
      verse: verse.trim() || undefined,
    });
    toast(ex ? 'Devocional atualizada' : 'Devocional salva no seu diário');
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
      <div className="modal-actions">
        <button className="btn btn-gray" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-gray" onClick={() => save(true)}>
          <Icon name="share" /> Salvar e compartilhar
        </button>
        <button className="btn btn-primary" onClick={() => save(false)}>
          <Icon name="check" /> Salvar
        </button>
      </div>
    </Modal>
  );
}
