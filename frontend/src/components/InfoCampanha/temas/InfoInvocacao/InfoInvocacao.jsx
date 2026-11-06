import DadosCampanha from '../../DadosCampanha/DadosCampanha';
import styles from './InfoInvocacao.module.scss';

// Pontas da estrela, ligadas de duas em duas (círculo de raio 70 no centro 100,100)
const ESTRELA = '100,30 141.15,156.63 33.43,78.37 166.57,78.37 58.85,156.63';

export default function InfoInvocacao({ campanha }) {
  return (
    <div className={styles.invocacao}>
      <svg className={styles.circulo} viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="92" pathLength="1" />
        <circle cx="100" cy="100" r="74" pathLength="1" />
        <polygon points={ESTRELA} pathLength="1" />
      </svg>

      <div className={styles.conteudo}>
        <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
        <h2 className={styles.nome}>{campanha.nome}</h2>
        {campanha.descricao && <p className={styles.descricao}>{campanha.descricao}</p>}
        <DadosCampanha campanha={campanha} className={styles.dados} />
      </div>
    </div>
  );
}