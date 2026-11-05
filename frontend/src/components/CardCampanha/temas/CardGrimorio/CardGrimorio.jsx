import styles from './CardGrimorio.module.scss';

export default function CardGrimorio({ campanha, selecionado }) {
  return (
    <div className={`${styles.livro} ${selecionado ? styles.desperto : ''}`}>
      <span className={styles.lombada} />

      <div className={styles.capa}>
        <span className={styles.runas} aria-hidden="true">ᚦ ᛟ ᚨ ᛉ ᛞ</span>
        <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
        <span className={styles.nome}>{campanha.nome}</span>
        <span className={styles.runas} aria-hidden="true">ᛞ ᛉ ᚨ ᛟ ᚦ</span>
      </div>
    </div>
  );
}