import DadosCampanha from '../../DadosCampanha/DadosCampanha';
import SeloCera from '../../../SeloCera/SeloCera';
import styles from './InfoPergaminho.module.scss';

export default function InfoPergaminho({ campanha }) {
  return (
    <div className={styles.pergaminho}>
      <div className={styles.papel}>
        <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
        <h2 className={styles.nome}>{campanha.nome}</h2>
        <span className={styles.ornamento} aria-hidden="true">❦</span>
        {campanha.descricao && <p className={styles.descricao}>{campanha.descricao}</p>}
        <DadosCampanha campanha={campanha} className={styles.dados} />
      </div>

      <span className={`${styles.rolo} ${styles.roloEsquerdo}`} />
      <span className={`${styles.rolo} ${styles.roloDireito}`} />

      <SeloCera tamanho={56} className={styles.lacre} />
    </div>
  );
}