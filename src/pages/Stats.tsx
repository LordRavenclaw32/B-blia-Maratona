import { BOOKS, TOTAL_CHAPTERS } from '../data/books';
import { avatarUrl } from '../lib/art';
import { Art } from '../components/Art';
import { badges, bookPercent, completedBooks, formatMinutes, minutesRead, overallPercent, pct, streak, testamentPercent, totalRead } from '../lib/stats';
import { today, useProfile } from '../lib/store';
import { openTitle } from '../components/Card';
import { Icon } from '../components/Icon';
import { STATS_BACKGROUND } from '../data/customArt';
import { assetUrl } from '../lib/paintings';
import { useUI } from '../components/ui';

function Ring({ value, size = 180, stroke = 14, label, sub }: { value: number; size?: number; stroke?: number; label: string; sub: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fg"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, value))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-text">
        <b>{label}</b>
        <span>{sub}</span>
      </div>
    </div>
  );
}

export function Heatmap({ activity, goal, weeks = 20 }: { activity: Record<string, number>; goal: number; weeks?: number }) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7);
  const cells: { d: string; n: number; future: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    const key = today(cur);
    cells.push({ d: key, n: activity[key] ?? 0, future: cur > end });
  }
  const lvl = (n: number) => (n === 0 ? 0 : n < Math.max(1, goal / 2) ? 1 : n < goal ? 2 : n < goal * 2 ? 3 : 4);
  return (
    <div className="heatmap" role="img" aria-label="Atividade de leitura nas últimas semanas">
      {cells.map((c) => (
        <i key={c.d} className={`l${lvl(c.n)} ${c.future ? 'future' : ''}`} title={`${new Date(c.d + 'T12:00').toLocaleDateString('pt-BR')}: ${c.n} capítulo(s)`} />
      ))}
    </div>
  );
}

export function Stats() {
  const profile = useProfile();
  const { openShare } = useUI();
  const read = totalRead(profile);
  const st = streak(profile);
  const done = completedBooks(profile);
  const todayN = profile.activity[today()] ?? 0;
  const goal = profile.settings.dailyGoal;
  const remaining = TOTAL_CHAPTERS - read;
  const days = Math.ceil(remaining / Math.max(1, goal));
  const finish = new Date();
  finish.setDate(finish.getDate() + days);

  return (
    <main className="page stats">
      <div className="page-head page-banner" style={{ ['--bg-img' as string]: `url(${assetUrl(STATS_BACKGROUND)})` }}>
        <div className="stats-who">
          <img src={avatarUrl(profile.avatar)} alt="" />
          <div>
            <h1 className="page-title">Minha maratona</h1>
            <p className="muted">
              Leitor desde {new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => openShare({ kind: 'overall' })}>
          <Icon name="share" /> Compartilhar progresso
        </button>
      </div>

      <section className="stats-top">
        <Ring value={overallPercent(profile)} size={200} label={pct(overallPercent(profile))} sub="da Bíblia" />
        <Ring value={todayN / goal} size={150} stroke={12} label={`${todayN}/${goal}`} sub="meta de hoje" />
        <div className="tiles">
          <div className="tile">
            <b>{read}</b>
            <span>capítulos lidos</span>
          </div>
          <div className="tile">
            <b>{formatMinutes(minutesRead(profile))}</b>
            <span>tempo de leitura</span>
          </div>
          <div className="tile">
            <b>
              <Icon name="flame" size={22} /> {st.current}
            </b>
            <span>dias seguidos</span>
          </div>
          <div className="tile">
            <b>{st.best}</b>
            <span>melhor sequência</span>
          </div>
          <div className="tile">
            <b>{done.length}</b>
            <span>livros concluídos</span>
          </div>
          <div className="tile">
            <b>{profile.devotionals.length}</b>
            <span>devocionais</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Testamentos</h2>
        {(['AT', 'NT'] as const).map((t) => (
          <div key={t} className="t-bar">
            <span>{t === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'}</span>
            <span className="bar">
              <i style={{ width: pct(testamentPercent(profile, t)) }} />
            </span>
            <b>{pct(testamentPercent(profile, t))}</b>
          </div>
        ))}
        {remaining > 0 && (
          <p className="muted small">
            No ritmo de {goal} capítulo{goal > 1 ? 's' : ''} por dia, você conclui a Bíblia em {days} dias — por volta de{' '}
            {finish.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Atividade</h2>
        <Heatmap activity={profile.activity} goal={goal} />
        <div className="legend">
          <span>Menos</span>
          <i className="l0" />
          <i className="l1" />
          <i className="l2" />
          <i className="l3" />
          <i className="l4" />
          <span>Mais</span>
        </div>
      </section>

      <section className="panel">
        <h2>Conquistas</h2>
        <div className="badges">
          {badges(profile).map((b) => (
            <div key={b.id} className={`badge ${b.earned ? 'earned' : ''}`}>
              <span className="badge-icon">
                <Icon name={b.icon} size={26} />
              </span>
              <b>{b.title}</b>
              <span>{b.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Todas as séries</h2>
        <div className="book-progress">
          {BOOKS.map((b) => {
            const p = bookPercent(profile, b);
            return (
              <button key={b.id} className={`bp ${p >= 1 ? 'done' : p > 0 ? 'started' : ''}`} onClick={() => openTitle(b.id)} title={`${b.name}: ${pct(p)}`}>
                <Art book={b} kind="poster" loading="lazy" />
                <span className="bp-name">{b.name}</span>
                <span className="bar">
                  <i style={{ width: pct(p) }} />
                </span>
                {p >= 1 && (
                  <span className="bp-check">
                    <Icon name="check" size={16} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
