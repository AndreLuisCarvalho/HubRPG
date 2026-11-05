import styles from './CardPergaminho.module.scss';

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

        <span className={styles.selo} aria-hidden="true" />
      </div>

      <span className={styles.rolo} />
    </div>
  );
}