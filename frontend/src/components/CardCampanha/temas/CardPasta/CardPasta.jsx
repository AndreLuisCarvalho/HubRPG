import styles from './CardPasta.module.scss';

export default function CardPasta({ campanha, selecionado }) {
  const numeroCaso = String(campanha.id).padStart(3, '0');

  return (
    <div className={`${styles.pasta} ${selecionado ? styles.aberta : ''}`}>
      <div className={styles.folha} />
      <span className={styles.aba}>CASO Nº {numeroCaso}</span>

      <div className={styles.capa}>
        <span className={styles.clipe} />
        <span className={styles.carimbo}>Confidencial</span>
        <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
        <span className={styles.nome}>{campanha.nome}</span>
      </div>
    </div>
  );
}