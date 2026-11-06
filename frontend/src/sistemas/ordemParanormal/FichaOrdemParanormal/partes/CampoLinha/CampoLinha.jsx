import styles from './CampoLinha.module.scss';

/**
 * Campo sublinhado, estilo ficha de papel. Salva ao sair do campo ou apertar Enter.
 * layout: "lado" (rótulo à esquerda) ou "embaixo" (rótulo sob o valor)
 */
export default function CampoLinha({ rotulo, valor, onSalvar, tipo = 'text', layout = 'lado', ...resto }) {
  const padrao = tipo === 'number' ? 0 : '';
  const atual = valor ?? padrao;

  function salvar(e) {
    const novo = tipo === 'number' ? Number(e.target.value) || 0 : e.target.value.trim();
    if (novo !== atual) onSalvar(novo);
  }

  return (
    <label className={`${styles.campo} ${styles[layout]}`}>
      <span className={styles.rotulo}>{rotulo}</span>
      <input
        type={tipo}
        defaultValue={atual}
        onBlur={salvar}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        {...resto}
      />
    </label>
  );
}