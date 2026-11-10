import styles from './Contagem.module.scss';

// Marcadores de "morrendo" / "enlouquecendo": 1 por turno (ou rodada) na mesma cena.
// Clicar num marcador acende até ele; clicar no último aceso apaga ele.
export default function Contagem({ rotulo, final, unidade, valor, limite = 3, onAlterar }) {
  const acabou = valor >= limite;

  function clicar(n) {
    onAlterar(valor === n ? n - 1 : n);
  }

  return (
    <div className={`${styles.contagem} ${acabou ? styles.fim : ''}`}>
      <span className={styles.rotulo}>{acabou ? final : rotulo}</span>
      <span className={styles.marcas} role="group" aria-label={`${rotulo}: ${valor} de ${limite}`}>
        {Array.from({ length: limite }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`${styles.marca} ${n <= valor ? styles.acesa : ''}`}
            onClick={() => clicar(n)}
            title={`${n}º ${unidade}`}
            aria-label={`${n}º ${unidade}`}
            aria-pressed={n <= valor}
          />
        ))}
      </span>
    </div>
  );
}