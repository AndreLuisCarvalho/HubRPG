import { useEffect, useRef, useState } from 'react';
import styles from './Combate.module.scss';

/**
 * Faixa de turnos no topo: a ordem da rodada, com a vez em destaque.
 * O mestre arrasta um retrato para mudar a ordem (no celular, usa as setas da carta).
 */
export default function FaixaTurnos({ participantes, vez, mestre, onReordenar }) {
  const lista = useRef(null);
  const [arrastando, setArrastando] = useState(null);

  // A vez sempre à vista (rola a faixa até ela)
  useEffect(() => {
    const atual = lista.current?.querySelector('[aria-current="true"]');
    atual?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [vez]);

  return (
    <ol className={styles.faixa} ref={lista} aria-label="Ordem dos turnos">
      {participantes.map((p, i) => {
        const caido = p.ver.recursos[0]?.maximo > 0 && p.ver.recursos[0]?.atual === 0;
        return (
          <li
            key={p.id}
            aria-current={p.id === vez}
            data-lado={p.lado}
            data-caido={caido || undefined}
            data-arrastando={arrastando === i || undefined}
            draggable={mestre}
            onDragStart={(e) => { setArrastando(i); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => mestre && arrastando !== null && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (arrastando !== null) onReordenar(arrastando, i);
              setArrastando(null);
            }}
            onDragEnd={() => setArrastando(null)}
            title={p.ver.nome}
          >
            <span className={styles.ficha}>
              {p.ver.imagem ? <img src={p.ver.imagem} alt="" /> : p.ver.nome.charAt(0)}
            </span>
            <span className={styles.nomeFaixa}>{p.ver.nome}</span>
            <small>{p.iniciativa ?? '—'}</small>
          </li>
        );
      })}
    </ol>
  );
}
