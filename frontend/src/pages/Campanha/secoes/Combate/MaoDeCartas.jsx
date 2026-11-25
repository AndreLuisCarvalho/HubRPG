import { ELEMENTOS } from '../../../../sistemas/ordemParanormal/modelo';
import styles from './MaoDeCartas.module.scss';

/**
 * A mão de quem age: as ações em leque de cartas. Clicar numa carta a põe em jogo (sobe e acende)
 * e abre o painel da ação; clicar de novo a recolhe. "virada": a mão de uma ameaça vista pelos
 * jogadores, só o verso.
 */
export default function MaoDeCartas({ cartas, selecionada, virada, soVer, onJogar }) {
  if (virada) {
    return (
      <div className={styles.mao} data-virada aria-label="Mão da ameaça (escondida)">
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.carta} style={{ '--i': i - 1 }} aria-hidden="true">
            <span className={styles.verso}><i /></span>
          </span>
        ))}
      </div>
    );
  }

  const meio = (cartas.length - 1) / 2;
  return (
    <div className={styles.mao} data-so-ver={soVer || undefined} role="toolbar" aria-label={soVer ? 'Mão do agente (só para ver)' : 'Mão de ações'}>
      {cartas.map((c, i) => {
        const cor = c.elemento ? ELEMENTOS[c.elemento]?.cor : null;
        return (
          <button
            key={c.id}
            type="button"
            className={styles.carta}
            data-tom={c.tom}
            aria-pressed={selecionada === c.id}
            aria-disabled={soVer || undefined}
            onClick={() => !soVer && onJogar(selecionada === c.id ? null : c)}
            style={{ '--i': i - meio, ...(cor && { '--tom': cor }) }}
            title={`${c.tipo}: ${c.nome} · ${c.detalhe}`}
          >
            <span className={styles.face}>
              <small>{c.tipo}</small>
              <span className={styles.icone} aria-hidden="true">{c.icone}</span>
              <b>{c.nome}</b>
              <em>{c.detalhe}</em>
            </span>
          </button>
        );
      })}
    </div>
  );
}
