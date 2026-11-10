import styles from './Painel.module.scss';

/**
 * Moldura padrão da ficha: cantos cortados e detalhe na cor da campanha.
 * rotulo: título pequeno · acoes: algo à direita do título (botões, filtros)
 */
export default function Painel({ rotulo, acoes, centralizado = false, className = '', children}) {
  return (
    <section className={`${styles.painel} ${centralizado ? styles.centralizado : ''} ${className}`}>
      {(rotulo || acoes) && (
        <header className={styles.topo}>
          {rotulo && <h2 className={styles.rotulo}>{rotulo}</h2>}
          {acoes}
        </header>
      )}
      {children}
    </section>
  );
}