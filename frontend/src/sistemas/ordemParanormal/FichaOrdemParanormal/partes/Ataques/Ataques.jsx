import BotaoRolar from '../../../../../components/Dados/BotaoRolar';
import { useRolagem } from '../../../../../components/Dados/rolagem';
import { danosDe, textoDosDanos } from '../../../danos';
import { pedidoAtaque, pedidoDano } from '../../../rolagens';
import EditorDano from '../EditorDano/EditorDano';
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

export default function Ataques({ dados, ataques = [], onAlterar }) {
  const { rolar } = useRolagem();
  const editar = (id, campo, valor) =>
    onAlterar(ataques.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  const remover = (id) => onAlterar(ataques.filter((a) => a.id !== id));
  // Dano em partes; o texto "dano" acompanha (resumo e fichas antigas)
  const editarDanos = (id, danos) =>
    onAlterar(ataques.map((a) => (a.id === id ? { ...a, danos, dano: textoDosDanos(danos) } : a)));

  return (
    <div className={styles.ataques}>
      {ataques.map((a) => (
        <article key={a.id} className={styles.ataque}>
          {/* Teste: fórmula ("2d20+5") ou nome da perícia ("Pontaria"); crítico lido do campo especial ("19/x3") */}
          <BotaoRolar pedido={pedidoAtaque(a, dados)} rolar={rolar} rotulo={`Atacar com ${a.nome || 'ataque'}`} />
          <Campo className={styles.nome} valor={a.nome} placeholder="Nome do ataque"
            onSalvar={(v) => editar(a.id, 'nome', v)} aria-label="Nome do ataque" />
          <span className={styles.dano} title="Dano">{textoDosDanos(danosDe(a)) || '—'}</span>
          <BotaoRolar pedido={pedidoDano(a)} rolar={rolar} tipo="dano" rotulo={`Rolar dano de ${a.nome || 'ataque'}`} />
          <button className={styles.remover} onClick={() => remover(a.id)} aria-label="Remover ataque">×</button>

          <div className={styles.detalhes}>
            <Campo valor={a.teste} placeholder="Teste (ex.: Pontaria ou 2d20+5)"
              onSalvar={(v) => editar(a.id, 'teste', v)} aria-label="Teste" />
            <Campo valor={a.especial} placeholder="Crítico · Alcance · Especial"
              onSalvar={(v) => editar(a.id, 'especial', v)} aria-label="Crítico, alcance e especial" />
          </div>

          {/* Uma linha por parte: "1d8+2 corte", "1d4 Morte"… */}
          <div className={styles.danos}>
            <EditorDano danos={danosDe(a)} onMudar={(danos) => editarDanos(a.id, danos)} compacto />
          </div>
        </article>
      ))}

      <button className={styles.novo} onClick={() => onAlterar([...ataques, novoAtaque()])}>
        + Novo ataque
      </button>
    </div>
  );
}