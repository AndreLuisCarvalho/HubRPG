import { useEffect, useRef } from 'react';
import { estadoAproximado } from './regrasCombate';
import styles from './Arena.module.scss';

/**
 * Timeline de iniciativa (topo): todos em fila na ordem da rodada; quem age agora fica maior e com
 * borda dourada. Clicar num retrato mostra a ficha rápida dele no palco.
 */
export default function Timeline({ participantes, vez, mestre, preparando, inspecionado, onEscolher }) {
  const lista = useRef(null);

  // Quem está na vez sempre à vista
  useEffect(() => {
    lista.current?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [vez]);

  if (!participantes.length) return <p className={styles.timelineVazia}>Ninguém na luta ainda.</p>;

  return (
    <ol className={styles.timeline} ref={lista} aria-label="Ordem de iniciativa">
      {participantes.map((p, i) => {
        const ameaca = p.lado === 'ameacas';
        const pv = p.ver.recursos.find((r) => r.id === 'pv');
        const estado = estadoAproximado(pv);
        const proximo = participantes[(participantes.findIndex((x) => x.id === vez) + 1) % participantes.length]?.id === p.id;
        return (
          <li
            key={p.id}
            aria-current={p.id === vez}
            data-lado={p.lado}
            data-caido={estado.id === 'caido' || undefined}
            data-proximo={(!preparando && proximo && vez !== p.id) || undefined}
            data-oculto={p.oculto || undefined}
          >
            <button
              type="button"
              onClick={() => onEscolher(p)}
              aria-pressed={inspecionado === p.id}
              title={`${p.ver.nome}${!mestre && ameaca ? '' : ` · INI ${p.iniciativa ?? '—'}`}`}
            >
              <span className={styles.timelineRetrato} data-estado={estado.id}>
                {p.ver.imagem && !ameaca ? <img src={p.ver.imagem} alt="" /> : p.ver.nome.charAt(0)}
              </span>
              <span className={styles.timelineNome}>{p.ver.nome}</span>
              <small>{!mestre && ameaca ? `${i + 1}º` : p.iniciativa ?? '—'}</small>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
