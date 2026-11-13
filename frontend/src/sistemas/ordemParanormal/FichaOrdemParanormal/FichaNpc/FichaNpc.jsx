import Contador from '../../../../components/Contador/Contador';
import EscolherFoto from '../../../../components/EscolherFoto/EscolherFoto';
import Seletor from '../../../../components/Seletor/Seletor';
import { PERICIAS } from '../../modelo';
import { npcParaAgente } from '../../regras';
import FiltroTraco from '../partes/FiltroTraco/FiltroTraco';
import Painel from '../partes/Painel/Painel';
import styles from './FichaNpc.module.scss';

const OPCOES_PERICIAS = [...PERICIAS]
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  .map((p) => ({ valor: p.id, rotulo: p.nome }));
const nomePericia = (id) => PERICIAS.find((p) => p.id === id)?.nome ?? id;

// Chave de cada ataque: não pode ser a posição (apagar um do meio trocaria os textos de lugar).
// Só é chamada ao clicar em "+ Ataque", nunca durante a renderização.
const novoUid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Ficha curta de NPC (gente comum): quem é, como age e o básico para um combate.
 * "Transformar em agente" troca para a ficha completa sem perder o que foi escrito.
 */
export default function FichaNpc({ ficha, onAlterarDados, onAlterarFicha }) {
  const { dados } = ficha;
  const npc = { pv: 10, pvMax: 10, defesa: 10, ataques: [], pericias: [], ...dados.npc };
  const mudarNpc = (parcial) => onAlterarDados({ npc: { ...npc, ...parcial } });

  // Texto salvo ao sair do campo (não grava a cada letra)
  const salvarAoSair = (campo) => (e) => {
    const valor = e.target.value.trim();
    if (valor !== (dados[campo] ?? '')) onAlterarDados({ [campo]: valor });
  };

  function transformar() {
    if (window.confirm(`Transformar ${ficha.nome} em agente? A ficha passa a ter classe, NEX, atributos e rituais. Papel, personalidade e motivação são mantidos.`)) {
      onAlterarDados(npcParaAgente(dados));
    }
  }

  /* ---------- Ataques e perícias: listas pequenas editadas no lugar ---------- */
  const mudarAtaque = (i, campo, valor) =>
    mudarNpc({ ataques: npc.ataques.map((a, j) => (j === i ? { ...a, [campo]: valor } : a)) });
  const removerAtaque = (i) => mudarNpc({ ataques: npc.ataques.filter((_, j) => j !== i) });
  const novoAtaque = () => mudarNpc({ ataques: [...npc.ataques, { uid: novoUid(), nome: '', teste: '', dano: '' }] });

  const livres = OPCOES_PERICIAS.filter((o) => !npc.pericias.some((p) => p.id === o.valor));
  const mudarPericia = (i, parcial) =>
    mudarNpc({ pericias: npc.pericias.map((p, j) => (j === i ? { ...p, ...parcial } : p)) });
  const removerPericia = (i) => mudarNpc({ pericias: npc.pericias.filter((_, j) => j !== i) });

  return (
    <div className={styles.npc}>
      <FiltroTraco />

      {/* ---------- Identidade ---------- */}
      <Painel className={styles.identidade}>
        <span className={styles.selo}>NPC</span>
        <div className={styles.quem}>
          <EscolherFoto
            imagem={ficha.imagem}
            inicial={ficha.nome.charAt(0)}
            onEscolher={(imagem) => onAlterarFicha?.({ imagem })}
            tamanho={72}
          />
          <div className={styles.nomes}>
            <h1>{ficha.nome}</h1>
            <input
              className={styles.papel}
              defaultValue={dados.papel ?? ''}
              onBlur={salvarAoSair('papel')}
              placeholder="Papel (ex.: delegado da cidade)"
              aria-label="Papel"
            />
          </div>
        </div>

        <label className={styles.campo}>
          <span>Onde encontrar</span>
          <input defaultValue={dados.local ?? ''} onBlur={salvarAoSair('local')} placeholder="Ex.: delegacia, praça central" />
        </label>

        <label className={`${styles.campo} ${styles.campoGrande}`}>
          <span>Personalidade</span>
          <textarea
            defaultValue={dados.personalidade ?? ''}
            onBlur={salvarAoSair('personalidade')}
            rows={3}
            placeholder="Como age e fala, manias, jeito de tratar os agentes…"
          />
        </label>

        <label className={`${styles.campo} ${styles.campoGrande}`}>
          <span>Motivação</span>
          <textarea
            defaultValue={dados.motivacao ?? ''}
            onBlur={salvarAoSair('motivacao')}
            rows={3}
            placeholder="O que quer, o que esconde, do que tem medo…"
          />
        </label>

        <button type="button" className={styles.transformar} onClick={transformar}>
          ✦ Transformar em agente
        </button>
      </Painel>

      {/* ---------- Combate resumido ---------- */}
      <Painel rotulo="Combate" className={styles.combate}>
        <div className={styles.numeros}>
          <div className={styles.numero}>
            <span>PV</span>
            <div className={styles.pv}>
              <Contador valor={npc.pv} onMudar={(pv) => mudarNpc({ pv })} min={0} max={npc.pvMax} rotulo="PV atuais" />
              <small>/</small>
              <Contador
                valor={npc.pvMax}
                onMudar={(pvMax) => mudarNpc({ pvMax, pv: Math.min(npc.pv, pvMax) })}
                min={1}
                max={999}
                rotulo="PV máximos"
              />
            </div>
          </div>
          <div className={styles.numero}>
            <span>Defesa</span>
            <Contador valor={npc.defesa} onMudar={(defesa) => mudarNpc({ defesa })} min={0} max={60} rotulo="Defesa" />
          </div>
        </div>

        <section className={styles.lista}>
          <h3>Ataques</h3>
          {npc.ataques.length === 0 && <p className={styles.vazio}>Nenhum ataque.</p>}
          {npc.ataques.map((a, i) => (
            <div key={a.uid ?? i} className={styles.ataque}>
              <input defaultValue={a.nome} onBlur={(e) => mudarAtaque(i, 'nome', e.target.value.trim())} placeholder="Arma" aria-label="Arma" />
              <input defaultValue={a.teste} onBlur={(e) => mudarAtaque(i, 'teste', e.target.value.trim())} placeholder="Teste (+5)" aria-label="Teste de ataque" />
              <input defaultValue={a.dano} onBlur={(e) => mudarAtaque(i, 'dano', e.target.value.trim())} placeholder="Dano (1d6)" aria-label="Dano" />
              <button type="button" className={styles.remover} onClick={() => removerAtaque(i)} aria-label="Remover ataque">×</button>
            </div>
          ))}
          <button type="button" className={styles.adicionar} onClick={novoAtaque}>+ Ataque</button>
        </section>

        <section className={styles.lista}>
          <h3>Perícias principais</h3>
          {npc.pericias.length === 0 && <p className={styles.vazio}>Nenhuma perícia em destaque.</p>}
          {npc.pericias.map((p, i) => (
            <div key={p.id} className={styles.pericia}>
              <span>{nomePericia(p.id)}</span>
              <Contador valor={p.bonus} onMudar={(bonus) => mudarPericia(i, { bonus })} min={-10} max={40} rotulo={`Bônus de ${nomePericia(p.id)}`} />
              <button type="button" className={styles.remover} onClick={() => removerPericia(i)} aria-label={`Remover ${nomePericia(p.id)}`}>×</button>
            </div>
          ))}
          {livres.length > 0 && (
            <Seletor
              className={styles.novaPericia}
              rotulo="Adicionar perícia"
              valor=""
              placeholder="+ Perícia"
              opcoes={livres}
              onMudar={(id) => mudarNpc({ pericias: [...npc.pericias, { id, bonus: 5 }] })}
            />
          )}
        </section>
      </Painel>
    </div>
  );
}
