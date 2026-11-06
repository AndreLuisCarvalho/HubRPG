import styles from './CardPergaminho.module.scss';
import SeloCera from '../../../SeloCera/SeloCera';

export default function CardPergaminho({ campanha, selecionado }) {
  return (
    <div className={`${styles.pergaminho} ${selecionado ? styles.aberto : ''}`}>
      <span className={styles.rolo} />

      <div className={styles.papel}>
        <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
        <span className={styles.nome}>{campanha.nome}</span>

        <div className={styles.desenrolar}>
          <div>
            <p>{campanha.descricao || 'Uma nova jornada aguarda.'}</p>
          </div>
        </div>

        <SeloCera tamanho={34} className={styles.selo} />
      </div>

      <span className={styles.rolo} />
    </div>
  );
}