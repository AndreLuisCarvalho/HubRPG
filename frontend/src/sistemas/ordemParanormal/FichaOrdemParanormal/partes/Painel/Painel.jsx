import styles from './Painel.module.scss';

/**
 * Moldura padrão da ficha: cantos cortados e detalhe na cor da campanha.
 * rotulo: título pequeno · acoes: algo à direita do título (botões, filtros)
 * classeCorpo: quando o conteúdo rola dentro do painel, ele vai para uma área própria com essa
 *   classe. Assim só o conteúdo rola e a moldura fica parada (desenhada no painel, por fora).
 */
export default function Painel({ rotulo, acoes, centralizado = false, className = '', classeCorpo, children }) {
  return (
    <section className={`${styles.painel} ${centralizado ? styles.centralizado : ''} ${className}`}>
      {(rotulo || acoes) && (
        <header className={styles.topo}>
          {rotulo && <h2 className={styles.rotulo}>{rotulo}</h2>}
          {acoes}
        </header>
      )}
      {classeCorpo ? <div className={`${styles.corpo} ${classeCorpo}`}>{children}</div> : children}
    </section>
  );
}
