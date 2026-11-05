import styles from './CardCampanha.module.scss';

export default function CardCampanha({ campanha, selecionado, onSelecionar, onEntrar }) {
  return (
    <button
      className={`${styles.card} ${selecionado ? styles.selecionado : ''}`}
      style={{ '--cor': campanha.cor }}
      onMouseEnter={onSelecionar}
      onFocus={onSelecionar}
      onClick={onEntrar}
    >
      <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
      <span className={styles.nome}>{campanha.nome}</span>
    </button>
  );
}