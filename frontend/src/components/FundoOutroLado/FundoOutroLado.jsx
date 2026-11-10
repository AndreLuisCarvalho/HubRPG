import styles from './FundoOutroLado.module.scss';

/** Fundo animado do Outro Lado: névoa, veios da membrana, partículas e vinheta. Só decoração. */
export default function FundoOutroLado() {
  return (
    <div className={styles.fundo} aria-hidden="true">
      <div className={styles.membrana} />
      <div className={styles.nevoa} />
      <div className={styles.particulas} />
      <div className={styles.vinheta} />
    </div>
  );
}