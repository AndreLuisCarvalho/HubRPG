import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../../services/api';
import { useAoMudar } from '../../../../services/tempoReal';
import styles from './Investigacao.module.scss';

// Um giro de leve em cada papel (sempre o mesmo para a mesma pista)
const giro = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return ((h % 7) - 3) * 0.7;
};

/**
 * Investigação (todos da campanha): o mural de cortiça com as pistas que o mestre marcou como
 * encontradas no modo mesa, agrupadas por missão. Só o texto e a cena (perícia, DT e o que a pista
 * revela ficam com o mestre). Atualiza na hora quando o mestre marca uma pista.
 */
export default function Investigacao({ campanha }) {
  const [quadro, setQuadro] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    api.investigacao(campanha.id).then(setQuadro).catch((e) => setErro(e.message));
  }, [campanha.id]);

  useEffect(() => { carregar(); }, [carregar]);
  useAoMudar(campanha.id, ['missoes'], carregar, { esperar: false });

  if (erro && !quadro) return <p className="erro">{erro}</p>;
  if (!quadro) return <p className={styles.carregando}>Carregando…</p>;

  const total = quadro.reduce((s, m) => s + m.pistas.length, 0);

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Investigação</h1>
        <p>
          {total
            ? `${total} pista${total > 1 ? 's' : ''} encontrada${total > 1 ? 's' : ''} até agora. Ligue os pontos.`
            : 'As pistas que os agentes encontrarem nas missões aparecem aqui.'}
        </p>
      </header>

      {quadro.length === 0 ? (
        <div className={styles.vazio}>
          <span aria-hidden="true">📌</span>
          <p>Nenhuma pista ainda.</p>
        </div>
      ) : (
        <div className={styles.mural}>
          {quadro.map((m) => (
            <section key={m.missaoId} className={styles.missao} aria-label={m.nome}>
              <h2>{m.nome}</h2>
              <ul>
                {m.pistas.map((p) => (
                  <li key={p.id} style={{ '--giro': `${giro(p.id)}deg` }}>
                    <i className={styles.tacha} aria-hidden="true" />
                    <p>{p.texto}</p>
                    {p.cena && <small>{p.cena}</small>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
