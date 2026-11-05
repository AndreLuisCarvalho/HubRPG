import styles from './PalcoMapa.module.scss';

export default function PalcoMapa({ campanhas, selecionada, anterior, mergulhando, children }) {
  return (
    <section className={`${styles.palco} ${mergulhando ? styles.mergulhando : ''}`}>
      {campanhas.map((c, i) => {
        const classes = [
          styles.camada,
          i === selecionada && styles.ativo,
          i === anterior && styles.saindo,
        ].filter(Boolean).join(' ');

        return (
          <div key={c.id} className={classes} style={{ '--cor': c.cor }}>
            <div
              className={`${styles.imagem} ${c.mapa ? '' : styles.vazio}`}
              style={c.mapa ? { backgroundImage: `url(${c.mapa})` } : undefined}
            />
          </div>
        );
      })}

      <div className={styles.vinheta} />
      {children}
    </section>
  );
}