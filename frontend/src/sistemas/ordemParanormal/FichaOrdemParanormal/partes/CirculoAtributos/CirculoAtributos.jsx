import { useState } from 'react';
import { ATRIBUTOS, ATRIBUTO_MAX, ATRIBUTO_MIN } from '../../../modelo';
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

export default function CirculoAtributos({ atributos = {}, onAlterar }) {
  const [editando, setEditando] = useState(false);

  function alterar(id, delta) {
    const novo = Math.min(Math.max((atributos[id] ?? 0) + delta, ATRIBUTO_MIN), ATRIBUTO_MAX);
    if (novo !== atributos[id]) onAlterar({ ...atributos, [id]: novo });
  }

  return (
    <section className={`${styles.circulo} ${editando ? styles.editando : ''}`}>
      <button
        className={styles.editar}
        onClick={() => setEditando((e) => !e)}
        aria-pressed={editando}
        title={editando ? 'Concluir edição' : 'Editar atributos'}
      >
        {editando ? '✓' : '✎'}
      </button>

      <div className={styles.palco}>
        <svg className={styles.desenho} viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="47" className={styles.anelExterno} />
          <circle cx="50" cy="50" r={RAIO} className={styles.anelInterno} />
          <polygon points={ESTRELA} className={styles.estrela} />
          {ORDEM.map((id, i) => {
            const { x, y } = ponto(i);
            return <line key={id} x1="50" y1="50" x2={x} y2={y} className={styles.raio} />;
          })}
        </svg>

        <div className={styles.centro}>Atributos</div>

        {ORDEM.map((id, i) => {
          const atributo = ATRIBUTOS.find((a) => a.id === id);
          const { x, y } = ponto(i);

          return (
            <div key={id} className={styles.no} style={{ left: `${x}%`, top: `${y}%` }}>
              <span className={styles.valor}>{atributos[id] ?? 0}</span>
              <span className={styles.nome}>{atributo.nome}</span>
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
      </div>
    </section>
  );
}