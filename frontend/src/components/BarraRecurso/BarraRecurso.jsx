import styles from './BarraRecurso.module.scss';

/**
 * Barra de recurso estilo videogame.
 * Sem onAlterar, vira só leitura (sem botões), útil em listas.
 */
export default function BarraRecurso({ rotulo, nome, cor, atual, maximo, onAlterar }) {
  const porcentagem = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0;
  const critico = porcentagem > 0 && porcentagem <= 25;

  return (
    <div className={`${styles.recurso} ${critico ? styles.critico : ''}`} style={{ '--cor-barra': cor }}>
      <div className={styles.topo}>
        <span className={styles.rotulo} title={nome}>{rotulo}</span>
        <span className={styles.numeros}><strong>{atual}</strong> / {maximo}</span>
      </div>

      <div className={styles.controles}>
        {onAlterar && (
          <button className={styles.botao} onClick={() => onAlterar(atual - 1)} aria-label={`Diminuir ${nome}`}>−</button>
        )}

        <div
          className={styles.barra}
          role="meter"
          aria-label={nome}
          aria-valuemin={0}
          aria-valuemax={maximo}
          aria-valuenow={atual}
        >
          {/* O rastro fica para trás ao levar dano, como nos jogos */}
          <div className={styles.rastro} style={{ width: `${porcentagem}%` }} />
          <div className={styles.preenchimento} style={{ width: `${porcentagem}%` }} />
          <div className={styles.marcas} />
        </div>

        {onAlterar && (
          <button className={styles.botao} onClick={() => onAlterar(atual + 1)} aria-label={`Aumentar ${nome}`}>+</button>
        )}
      </div>
    </div>
  );
}