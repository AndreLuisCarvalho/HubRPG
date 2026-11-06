import DadosCampanha from '../../DadosCampanha/DadosCampanha';
import styles from './InfoPadrao.module.scss';

export default function InfoPadrao({ campanha }) {
  return (
    <div className={styles.info}>
      <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
      <h2 className={styles.nome}>{campanha.nome}</h2>
      {campanha.descricao && <p className={styles.descricao}>{campanha.descricao}</p>}
      <DadosCampanha campanha={campanha} className={styles.dados} />
    </div>
  );
}