import { ATRIBUTOS, ATRIBUTO_MAX, ATRIBUTO_MIN } from '../../../modelo';
import styles from './Atributos.module.scss';

export default function Atributos({ atributos = {}, onAlterar }) {
  function alterar(id, delta) {
    const novo = Math.min(Math.max((atributos[id] ?? 0) + delta, ATRIBUTO_MIN), ATRIBUTO_MAX);
    onAlterar({ ...atributos, [id]: novo });
  }

  return (
    <section className={styles.atributos}>
      <h2 className={styles.titulo}>Atributos</h2>

      <div className={styles.lista}>
        {ATRIBUTOS.map((a) => (
          <div key={a.id} className={styles.atributo}>
            <button onClick={() => alterar(a.id, -1)} aria-label={`Diminuir ${a.nome}`}>−</button>
            <div className={styles.centro}>
              <span className={styles.valor}>{atributos[a.id] ?? 0}</span>
              <span className={styles.sigla} title={a.nome}>{a.sigla}</span>
            </div>
            <button onClick={() => alterar(a.id, +1)} aria-label={`Aumentar ${a.nome}`}>+</button>
          </div>
        ))}
      </div>
    </section>
  );
}