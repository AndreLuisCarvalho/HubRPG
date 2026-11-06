import styles from './VisaoGeral.module.scss';

export default function VisaoGeral({ campanha }) {
  return (
    <section className={styles.visao}>
      <div
        className={styles.banner}
        style={campanha.mapa ? { backgroundImage: `url(${campanha.mapa})` } : undefined}
      >
        <div className={styles.bannerTexto}>
          <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
          <h1 className={styles.nome}>{campanha.nome}</h1>
        </div>
      </div>

      {campanha.descricao && <p className={styles.descricao}>{campanha.descricao}</p>}
    </section>
  );
}