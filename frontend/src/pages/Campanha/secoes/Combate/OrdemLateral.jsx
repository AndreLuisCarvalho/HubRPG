import { estadoAproximado } from './regrasCombate';
import styles from './Arena.module.scss';

/**
 * Coluna da ordem de turno (só na visão Mestre): de cima para baixo, quem age primeiro, com a
 * iniciativa e a rolagem (d20 + bônus). A vez fica em destaque; clicar abre a ficha rápida.
 */
export default function OrdemLateral({ participantes, vez, inspecionado, onEscolher }) {
  const iVez = participantes.findIndex((p) => p.id === vez);
  return (
    <aside className={styles.ordem} aria-label="Ordem de iniciativa">
      <h3>Ordem</h3>
      <ol>
        {participantes.map((p, i) => {
          const pv = p.ver.recursos.find((r) => r.id === 'pv');
          const estado = estadoAproximado(pv);
          const r = p.iniRolagem;
          const manual = r && (r.manual || r.natural + r.bonus !== p.iniciativa);
          const detalhe = p.iniciativa == null
            ? 'sem rolar'
            : manual ? 'à mão' : r ? `d20 ${r.natural}${r.bonus ? ` ${r.bonus > 0 ? '+' : '−'} ${Math.abs(r.bonus)}` : ''}` : '';
          return (
            <li
              key={p.id}
              data-lado={p.lado}
              data-vez={p.id === vez || undefined}
              data-proximo={iVez >= 0 && i === (iVez + 1) % participantes.length && participantes.length > 1 ? true : undefined}
              data-caido={estado.id === 'caido' || undefined}
              data-oculto={p.oculto || undefined}
            >
              <button type="button" onClick={() => onEscolher(p)} aria-pressed={inspecionado === p.id} aria-current={p.id === vez || undefined}>
                <span className={styles.ordemPos}>{i + 1}</span>
                <span className={styles.ordemRetrato}>
                  {p.ver.imagem ? <img src={p.ver.imagem} alt="" /> : p.ver.nome.charAt(0)}
                </span>
                <span className={styles.ordemNome}>
                  <b>{p.ver.nome}</b>
                  <small>{detalhe}{p.oculto ? ' · oculto' : ''}</small>
                </span>
                <strong>{p.iniciativa ?? '—'}</strong>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
