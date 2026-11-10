import styles from './Ataques.module.scss';

const novoAtaque = () => ({ id: crypto.randomUUID(), nome: '', teste: '', dano: '', especial: '' });

// Campo de texto que salva ao sair dele
function Campo({ valor, onSalvar, ...resto }) {
  function salvar(e) {
    const novo = e.target.value.trim();
    if (novo !== (valor ?? '')) onSalvar(novo);
  }

  return (
    <input
      defaultValue={valor ?? ''}
      onBlur={salvar}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      {...resto}
    />
  );
}

export default function Ataques({ ataques = [], onAlterar }) {
  const editar = (id, campo, valor) =>
    onAlterar(ataques.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  const remover = (id) => onAlterar(ataques.filter((a) => a.id !== id));

  return (
    <div className={styles.ataques}>
      {ataques.map((a) => (
        <article key={a.id} className={styles.ataque}>
          <Campo className={styles.nome} valor={a.nome} placeholder="Nome do ataque"
            onSalvar={(v) => editar(a.id, 'nome', v)} aria-label="Nome do ataque" />
          <Campo className={styles.dano} valor={a.dano} placeholder="1d6"
            onSalvar={(v) => editar(a.id, 'dano', v)} aria-label="Dano" />
          <button className={styles.remover} onClick={() => remover(a.id)} aria-label="Remover ataque">×</button>

          <div className={styles.detalhes}>
            <Campo valor={a.teste} placeholder="Teste (ex.: Pontaria)"
              onSalvar={(v) => editar(a.id, 'teste', v)} aria-label="Teste" />
            <Campo valor={a.especial} placeholder="Crítico · Alcance · Especial"
              onSalvar={(v) => editar(a.id, 'especial', v)} aria-label="Crítico, alcance e especial" />
          </div>
        </article>
      ))}

      <button className={styles.novo} onClick={() => onAlterar([...ataques, novoAtaque()])}>
        + Novo ataque
      </button>
    </div>
  );
}