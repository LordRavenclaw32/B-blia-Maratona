import { Fragment, useEffect, useState } from 'react';
import { parseMedia } from '../lib/media';
import { refHref, splitRefs, type Ref } from '../lib/refs';
import { Icon } from './Icon';

/** Texto da mensagem com parágrafos e referências bíblicas clicáveis (abrem o capítulo no versículo). */
export function RichText({ text }: { text: string }) {
  const inline = (p: string) =>
    splitRefs(p).map((s, j) =>
      typeof s === 'string' ? (
        <Fragment key={j}>{s.split('\n').map((line, i) => (i ? [<br key={i} />, line] : line))}</Fragment>
      ) : (
        <a key={j} className="ref-link" href={refLink(s.ref)} title={`Abrir ${s.ref.label}`}>
          {s.text}
        </a>
      ),
    );
  // blocos separados por linha em branco; "## " = subtítulo, "> " = destaque, demais linhas = parágrafo
  const out: React.ReactNode[] = [];
  text.split(/\n{2,}/).forEach((block, bi) => {
    let para: string[] = [];
    const flush = (k: string) => {
      if (para.length) out.push(<p key={k}>{inline(para.join('\n'))}</p>);
      para = [];
    };
    block.split('\n').forEach((raw, li) => {
      const line = raw.trimEnd();
      const k = `${bi}-${li}`;
      if (/^#{1,3}\s/.test(line)) {
        flush(`${k}p`);
        out.push(<h3 key={k}>{inline(line.replace(/^#{1,3}\s/, ''))}</h3>);
      } else if (/^>\s?/.test(line)) {
        flush(`${k}p`);
        out.push(<blockquote key={k}>{inline(line.replace(/^>\s?/, ''))}</blockquote>);
      } else if (line.trim()) para.push(line);
    });
    flush(`${bi}-end`);
  });
  return <div className="rich-text">{out}</div>;
}

export function refLink(r: Ref): string {
  return refHref(r) + (r.verseEnd ? `&ve=${r.verseEnd}` : '');
}

/** Player incorporado para vídeos e podcasts (YouTube, Spotify, SoundCloud, Vimeo, Drive, MP3/MP4). */
export function MediaPlayer({ url }: { url: string }) {
  const m = parseMedia(url);
  if (!m) return null;
  if (m.type === 'audio') return <audio className="media-audio" src={m.url} controls preload="metadata" />;
  if (m.type === 'video') return <video className="media-frame" src={m.url} controls preload="metadata" playsInline />;
  if (m.type === 'link')
    return (
      <a className="btn btn-gray" href={m.url} target="_blank" rel="noreferrer">
        <Icon name="play" /> Abrir conteúdo
      </a>
    );
  const audioOnly = m.type === 'spotify' || m.type === 'soundcloud';
  return (
    <iframe
      className={audioOnly ? 'media-embed audio' : 'media-frame'}
      src={m.embed}
      title="Player"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}

/** Contagem regressiva até o lançamento. */
export function Countdown({ to, onDone }: { to: string; onDone?: () => void }) {
  const [now, setNow] = useState(Date.now());
  const target = new Date(to).getTime();
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, target - now);
  useEffect(() => {
    if (left === 0) onDone?.();
  }, [left === 0]);
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <div className="launch-count" aria-label="Contagem regressiva">
      {[
        [d, 'dias'],
        [h, 'horas'],
        [m, 'min'],
        [s, 'seg'],
      ].map(([v, l]) => (
        <span key={l as string}>
          <b>{String(v).padStart(2, '0')}</b>
          <small>{l}</small>
        </span>
      ))}
    </div>
  );
}

/** Baixa um evento .ics para o membro salvar o lançamento na agenda do celular. */
export function downloadIcs(title: string, startIso: string, description: string, url: string) {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 60 * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BibliaFlix//Lancamentos//PT',
    'BEGIN:VEVENT',
    `UID:${start.getTime()}-${Math.random().toString(36).slice(2)}@bibliaflix`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'lancamento.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
