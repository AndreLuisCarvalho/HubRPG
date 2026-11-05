import styles from './CardPadrao.module.scss';

export default function CardPadrao({ campanha, selecionado }) {
  return (
    <div className={`${styles.card} ${selecionado ? styles.selecionado : ''}`}>
      <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
      <span className={styles.nome}>{campanha.nome}</span>
    </div>
  );
}