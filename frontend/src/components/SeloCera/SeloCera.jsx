import styles from './SeloCera.module.scss';

/**
 * Selo de cera com fitas.
 * tamanho:   diâmetro em px (tudo dentro escala junto)
 * brasao:    símbolo em relevo no centro
 * className: quem usa define posição e animação
 */
export default function SeloCera({ tamanho = 56, brasao = '⚜', className = '' }) {
  return (
    <span
      className={`${styles.lacre} ${className}`}
      style={{ '--tamanho': `${tamanho}px` }}
      aria-hidden="true"
    >
      <span className={styles.fita} />
      <span className={styles.fita} />
      <span className={styles.cera}>
        <span className={styles.brasao}>{brasao}</span>
      </span>
    </span>
  );
}