import styles from './BarraRecurso.module.scss';

function Preenchimento({ porcentagem }) {
  return (
    <>
      {/* O rastro fica para trás ao levar dano, como nos jogos */}
      <div className={styles.rastro} style={{ width: `${porcentagem}%` }} />
      <div className={styles.preenchimento} style={{ width: `${porcentagem}%` }} />
      <div className={styles.marcas} />
    </>
  );
}

/**
 * Barra de recurso estilo videogame.
 * Com onAlterar: versão grande com « ‹ › ». Sem onAlterar: versão compacta, só leitura.
 */
export default function BarraRecurso({ rotulo, nome, cor, atual, maximo, onAlterar, ocultarTitulo = false }) {
  const porcentagem = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0;
  const critico = porcentagem > 0 && porcentagem <= 25;
  const classes = `${critico ? styles.critico : ''}`;
  const medidor = { role: 'meter', 'aria-label': nome, 'aria-valuemin': 0, 'aria-valuemax': maximo, 'aria-valuenow': atual };

  if (!onAlterar) {
    return (
      <div className={`${styles.compacta} ${classes}`} style={{ '--cor-barra': cor }}>
        <div className={styles.topo}>
          {!ocultarTitulo && <span className={styles.titulo}>{nome}</span>}
          <span className={styles.numeros}><strong>{atual}</strong> / {maximo}</span>
        </div>
        <div className={styles.barra} {...medidor}>
          <Preenchimento porcentagem={porcentagem} />
        </div>
      </div>
    );
  }

  const passos = [
    { delta: -5, simbolo: '«', rotulo: 'Diminuir 5' },
    { delta: -1, simbolo: '‹', rotulo: 'Diminuir 1' },
  ];

  return (
    <div className={`${styles.grande} ${classes}`} style={{ '--cor-barra': cor }}>
      <span className={styles.titulo}>{nome}</span>

      <div className={styles.barra} {...medidor}>
        <Preenchimento porcentagem={porcentagem} />

        <div className={styles.conteudo}>
          {passos.map((p) => (
            <button key={p.delta} onClick={() => onAlterar(atual + p.delta)} aria-label={`${p.rotulo} de ${nome}`}>
              {p.simbolo}
            </button>
          ))}

          <span className={styles.valor}>{atual} / {maximo}</span>

          {[...passos].reverse().map((p) => (
            <button key={-p.delta} onClick={() => onAlterar(atual - p.delta)} aria-label={`${p.rotulo.replace('Diminuir', 'Aumentar')} de ${nome}`}>
              {p.simbolo === '«' ? '»' : '›'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}