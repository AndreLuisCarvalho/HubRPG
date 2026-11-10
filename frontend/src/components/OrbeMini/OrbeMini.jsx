import styles from './OrbeMini.module.scss';

/** Orbe pequena e só de leitura, para listas. A cor vem do próprio recurso. */
export default function OrbeMini({ nome, atual, maximo, cor, tamanho = 54 }) {
  const porcentagem = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0;

  return (
    <div
      className={styles.orbe}
      style={{ '--c': cor, '--nivel': `${porcentagem}%`, '--tamanho': `${tamanho}px` }}
      role="meter"
      aria-label={nome}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={atual}
    >
      <div className={styles.esfera}>
        <div className={styles.liquido} />
        <div className={styles.vidro} />
        <span className={styles.valor}>
          {atual}
          <small>/{maximo}</small>
        </span>
      </div>
      <span className={styles.nome}>{nome}</span>
    </div>
  );
}