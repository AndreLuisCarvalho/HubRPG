import { useState } from 'react';
import { ATRIBUTOS, ATRIBUTO_MAX, ATRIBUTO_MIN, NEX } from '../../../modelo';
import styles from './CirculoAtributos.module.scss';

// Sentido horário a partir do topo, como na ficha oficial
const ORDEM = ['agi', 'int', 'vig', 'pre', 'for'];
const RAIO = 35; // distância do centro, em % do quadro

function ponto(indice, raio = RAIO) {
  const angulo = ((-90 + indice * 72) * Math.PI) / 180;
  return { x: 50 + raio * Math.cos(angulo), y: 50 + raio * Math.sin(angulo) };
}

// Estrela: liga as pontas pulando uma (0 → 2 → 4 → 1 → 3)
const ESTRELA = [0, 2, 4, 1, 3].map((i) => {
  const { x, y } = ponto(i);
  return `${x},${y}`;
}).join(' ');

// Anel do NEX dentro do núcleo
const RAIO_NEX = 44;
const VOLTA_NEX = 2 * Math.PI * RAIO_NEX;

export default function CirculoAtributos({ atributos = {}, onAlterar, nex = 5, onAlterarNex }) {
  const [editando, setEditando] = useState(false);

  function alterar(id, delta) {
    const novo = Math.min(Math.max((atributos[id] ?? 0) + delta, ATRIBUTO_MIN), ATRIBUTO_MAX);
    if (novo !== atributos[id]) onAlterar({ ...atributos, [id]: novo });
  }

  return (
    <div className={`${styles.circulo} ${editando ? styles.editando : ''}`}>
      <div className={styles.palco}>
        <svg className={styles.desenho} viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" className={styles.anelExterno} />
          <circle cx="50" cy="50" r={RAIO} className={styles.anelInterno} />
          <polygon points={ESTRELA} className={styles.estrela} />
        </svg>

        {/* Núcleo = NEX. O select invisível por cima abre a lista ao clicar */}
        <label className={styles.nucleo} title="Mudar NEX">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className={styles.trilho} cx="50" cy="50" r={RAIO_NEX} />
            <circle
              className={styles.progresso}
              cx="50" cy="50" r={RAIO_NEX}
              strokeDasharray={VOLTA_NEX}
              strokeDashoffset={VOLTA_NEX * (1 - nex / 100)}
            />
          </svg>
          <span className={styles.nex}>
            <b>{nex}%</b>
            <small>NEX</small>
          </span>
          <select value={nex} onChange={(e) => onAlterarNex(Number(e.target.value))} aria-label="NEX">
            {NEX.map((n) => <option key={n} value={n}>{n}%</option>)}
          </select>
        </label>

        {ORDEM.map((id, i) => {
          const atributo = ATRIBUTOS.find((a) => a.id === id);
          const { x, y } = ponto(i);

                    return (
            <div key={id} className={styles.no} style={{ left: `${x}%`, top: `${y}%` }} title={atributo.nome}>
              {/* Hexágono em SVG: o stroke com stroke-linejoin="round" deixa as quinas suaves */}
              <svg className={styles.hex} viewBox="0 0 100 100" aria-hidden="true">
                <polygon points="50,6 90,29 90,71 50,94 10,71 10,29" />
              </svg>
              <span className={styles.valor}>{atributos[id] ?? 0}</span>
              <span className={styles.sigla}>{atributo.sigla}</span>

              {editando && (
                <>
                  <button className={`${styles.botao} ${styles.menos}`} onClick={() => alterar(id, -1)} aria-label={`Diminuir ${atributo.nome}`}>−</button>
                  <button className={`${styles.botao} ${styles.mais}`} onClick={() => alterar(id, +1)} aria-label={`Aumentar ${atributo.nome}`}>+</button>
                </>
              )}
            </div>
          );
        })}

        <button
          className={styles.editar}
          onClick={() => setEditando((e) => !e)}
          aria-pressed={editando}
          title={editando ? 'Concluir edição' : 'Editar atributos'}
        >
          {editando ? '✓' : '✎'}
        </button>
      </div>
    </div>
  );
}