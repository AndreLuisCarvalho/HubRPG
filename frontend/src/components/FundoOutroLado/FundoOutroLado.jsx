import styles from './FundoOutroLado.module.scss';

/** Fundo da campanha: cor lisa com uma textura de papel bem leve. Só decoração, sem animação. */
export default function FundoOutroLado() {
  return <div className={styles.fundo} aria-hidden="true" />;
}
