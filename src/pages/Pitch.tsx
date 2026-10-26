import { useEffect } from 'react';
import { BFMark } from '../components/Brand';
import { Icon } from '../components/Icon';
import { WELCOME_BACKGROUND } from '../data/customArt';
import { BENEFICIOS, PACOTES, VENDEDOR } from '../data/vendas';
import { CHURCHES, whatsappLink } from '../lib/church';
import { assetUrl } from '../lib/paintings';

/** Apresentação do BíbliaFlix para igrejas: benefícios, demonstração e pacotes. */
export function Pitch() {
  const demo = CHURCHES.find((c) => c.slug === 'exemplo') ?? CHURCHES[0];
  const demoHref = demo ? `${location.pathname}?igreja=${demo.slug}&demo=1#/browse` : '#/browse';
  const contact = VENDEDOR.whatsapp ? whatsappLink(VENDEDOR.whatsapp, 'Olá! Quero o app BíbliaFlix para a minha igreja.') : VENDEDOR.email ? `mailto:${VENDEDOR.email}` : '';

  useEffect(() => {
    document.title = 'BíbliaFlix para igrejas';
  }, []);

  return (
    <main className="pitch">
      <header className="pitch-hero" style={{ ['--bg-img' as string]: `url(${assetUrl(WELCOME_BACKGROUND)})` }}>
        <a href="#/browse" className="logo">
          <BFMark size={44} />
          <span className="logo-word">
            BÍBLIA<b>FLIX</b>
          </span>
        </a>
        <div className="pitch-hero-text">
          <span className="kick">Para igrejas</span>
          <h1>O app de leitura bíblica da sua igreja, com o nome e a cara dela.</h1>
          <p>
            A Bíblia organizada como uma plataforma de séries: cada livro é uma série, cada grupo de capítulos é um episódio. Seus membros maratonam a Palavra, seguem o plano de leitura da
            igreja e compartilham devocionais nas redes.
          </p>
          <div className="inline">
            <a className="btn btn-primary" href={demoHref}>
              <Icon name="play" /> Ver demonstração
            </a>
            <a className="btn btn-gray" href="#/configurar-igreja">
              <Icon name="church" /> Montar o app da sua igreja
            </a>
          </div>
        </div>
      </header>

      <section className="pitch-section">
        <h2>Por que sua igreja vai gostar</h2>
        <div className="pitch-grid">
          {BENEFICIOS.map((b) => (
            <article key={b.titulo} className="pitch-card">
              <Icon name={b.icon} size={28} />
              <h3>{b.titulo}</h3>
              <p className="muted">{b.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pitch-section">
        <h2>Como funciona</h2>
        <ol className="pitch-steps">
          <li>
            <b>1</b>
            <span>Montamos o app com logo, cores, cultos, avisos, contatos e o plano de leitura da igreja.</span>
          </li>
          <li>
            <b>2</b>
            <span>A igreja recebe um link próprio (com prévia bonita no WhatsApp) e divulga para os membros.</span>
          </li>
          <li>
            <b>3</b>
            <span>Cada membro abre o link e instala no celular (Android ou iPhone), sem loja de apps e sem cadastro.</span>
          </li>
        </ol>
      </section>

      <section className="pitch-section">
        <h2>Pacotes</h2>
        <div className="packages">
          {PACOTES.map((p) => (
            <article key={p.id} className={`package ${p.destaque ? 'featured' : ''}`}>
              {p.destaque && <span className="package-tag">Mais escolhido</span>}
              <h3>{p.nome}</h3>
              <p className="muted">{p.resumo}</p>
              <table>
                <thead>
                  <tr>
                    <th>Faixa</th>
                    <th>Licença vitalícia</th>
                    <th>Manutenção</th>
                  </tr>
                </thead>
                <tbody>
                  {p.faixas.map((f) => (
                    <tr key={f.faixa}>
                      <td>{f.faixa}</td>
                      <td>
                        <b>{f.valor}</b>
                      </td>
                      <td>{f.manutencao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul>
                {p.inclui.map((i) => (
                  <li key={i}>
                    <Icon name="check" size={16} /> {i}
                  </li>
                ))}
              </ul>
              {p.observacao && <p className="muted tiny">{p.observacao}</p>}
            </article>
          ))}
        </div>
        <p className="muted small pitch-trial">Teste grátis por 30 dias com a identidade da sua igreja, sem compromisso.</p>
      </section>

      <section className="pitch-cta">
        <h2>Vamos montar o app da sua igreja?</h2>
        <div className="inline">
          {contact && (
            <a className="btn btn-whats" href={contact} target="_blank" rel="noreferrer">
              <Icon name="whatsapp" /> Falar com {VENDEDOR.nome || 'a equipe BíbliaFlix'}
            </a>
          )}
          <a className="btn btn-white" href={demoHref}>
            <Icon name="play" /> Ver demonstração
          </a>
        </div>
      </section>
    </main>
  );
}
