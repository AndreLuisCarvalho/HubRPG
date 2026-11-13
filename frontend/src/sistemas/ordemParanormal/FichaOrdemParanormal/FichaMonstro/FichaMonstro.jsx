import Contador from '../../../../components/Contador/Contador';
import EscolherFoto from '../../../../components/EscolherFoto/EscolherFoto';
import Seletor from '../../../../components/Seletor/Seletor';
import { ELEMENTOS, TAMANHOS } from '../../modelo';
import FiltroTraco from '../partes/FiltroTraco/FiltroTraco';
import { ListaAcoes, ListaAtaques, ListaHabilidades } from '../partes/Listas/Listas';
import Painel from '../partes/Painel/Painel';
import styles from './FichaMonstro.module.scss';

const ATRIBUTOS = [['agi', 'AGI'], ['for', 'FOR'], ['int', 'INT'], ['pre', 'PRE'], ['vig', 'VIG']];
const OPCOES_TAMANHO = TAMANHOS.map((t) => ({ valor: t.id, rotulo: t.nome }));

/**
 * Ficha de ameaça no formato do bloco do livro (cap. 7):
 * identificação e sentidos · combate e ataques · habilidades, ações e Enigma de Medo.
 * Vale para monstros feitos do zero e para os importados do catálogo.
 */
export default function FichaMonstro({ ficha, onAlterarDados, onAlterarFicha }) {
  const { dados } = ficha;
  const cor = ELEMENTOS[dados.elemento]?.cor;
  const tamanho = TAMANHOS.find((t) => t.id === dados.tamanho)?.nome;

  // Campos aninhados (presença, sentidos, atributos): troca só uma chave
  const mudarEm = (grupo, chave, valor) => onAlterarDados({ [grupo]: { ...dados[grupo], [chave]: valor } });

  return (
    <div className={styles.monstro} style={cor ? { '--el': cor } : undefined}>
      <FiltroTraco />

      {/* ---------- Identificação ---------- */}
      <Painel className={styles.painel}>
        <div className={styles.faixa}>
          <span>{[dados.tipo, tamanho].filter(Boolean).join(' · ')}</span>
          {dados.fonte?.pagina && <small>Livro p. {dados.fonte.pagina}</small>}
        </div>

        <div className={styles.quem}>
          <EscolherFoto
            imagem={ficha.imagem}
            inicial={ficha.nome.charAt(0)}
            onEscolher={(imagem) => onAlterarFicha?.({ imagem })}
            tamanho={72}
          />
          <div className={styles.nomes}>
            <h1>{ficha.nome}</h1>
            <div className={styles.vd}>
              <span>VD</span>
              <Contador valor={dados.vd ?? 0} onMudar={(vd) => onAlterarDados({ vd })} min={0} max={999} passo={5} rotulo="Valor de desafio" />
            </div>
          </div>
        </div>

        <div className={styles.grupo}>
          <span className={styles.rotulo}>Elemento</span>
          <div className={styles.elementos} role="radiogroup" aria-label="Elemento">
            {[['', { nome: 'Mundano' }], ...Object.entries(ELEMENTOS)].map(([id, el]) => (
              <button
                key={id || 'mundano'}
                type="button"
                role="radio"
                aria-checked={(dados.elemento ?? '') === id}
                style={el.cor ? { '--el': el.cor } : undefined}
                onClick={() => onAlterarDados({ elemento: id })}
              >
                {el.nome}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.dupla}>
          <div className={styles.grupo}>
            <span className={styles.rotulo}>Tamanho</span>
            <Seletor rotulo="Tamanho" valor={dados.tamanho ?? 'medio'} opcoes={OPCOES_TAMANHO} onMudar={(t) => onAlterarDados({ tamanho: t })} />
          </div>
          <Texto rotulo="Tipo" valor={dados.tipo} dica="Criatura, Pessoa, Animal…" onSalvar={(v) => onAlterarDados({ tipo: v })} />
        </div>

        <Texto rotulo="Descrição" area valor={dados.descricao} dica="Aparência, comportamento, de onde veio…" onSalvar={(v) => onAlterarDados({ descricao: v })} />

        <Bloco titulo="Presença Perturbadora">
          <div className={styles.linhaNumeros}>
            <div className={styles.grupo}>
              <span className={styles.rotulo}>DT</span>
              <Contador valor={dados.presenca?.dt ?? 0} onMudar={(v) => mudarEm('presenca', 'dt', v)} min={0} max={99} rotulo="DT da presença" />
            </div>
            <Texto rotulo="Dano mental" valor={dados.presenca?.dano} dica="3d6" curto onSalvar={(v) => mudarEm('presenca', 'dano', v)} />
            <Texto rotulo="Imune com NEX" valor={dados.presenca?.nex} dica="30%" curto onSalvar={(v) => mudarEm('presenca', 'nex', v)} />
          </div>
        </Bloco>

        <Bloco titulo="Sentidos">
          <div className={styles.linhaNumeros}>
            <Texto rotulo="Percepção" valor={dados.sentidos?.percepcao} dica="1d20+5" curto onSalvar={(v) => mudarEm('sentidos', 'percepcao', v)} />
            <Texto rotulo="Iniciativa" valor={dados.sentidos?.iniciativa} dica="1d20" curto onSalvar={(v) => mudarEm('sentidos', 'iniciativa', v)} />
          </div>
          <Texto valor={dados.sentidos?.extra} dica="Percepção às cegas, visão no escuro…" onSalvar={(v) => mudarEm('sentidos', 'extra', v)} rotulo="Outros sentidos" />
        </Bloco>

        <Bloco titulo="Atributos">
          <div className={styles.atributos}>
            {ATRIBUTOS.map(([id, sigla]) => (
              <div key={id} className={styles.atributo}>
                <span>{sigla}</span>
                <Contador valor={dados.atributos?.[id] ?? 0} onMudar={(v) => mudarEm('atributos', id, v)} min={0} max={9} rotulo={sigla} />
              </div>
            ))}
          </div>
        </Bloco>

        <Texto rotulo="Perícias" valor={dados.pericias} dica="Atletismo 5d20+20, Furtividade 2d20+5" onSalvar={(v) => onAlterarDados({ pericias: v })} />
      </Painel>

      {/* ---------- Combate ---------- */}
      <Painel className={styles.painel} rotulo="Combate">
        <div className={styles.linhaNumeros}>
          <div className={styles.grupo}>
            <span className={styles.rotulo}>Pontos de vida</span>
            <div className={styles.pv}>
              <Contador valor={dados.pv ?? 0} onMudar={(pv) => onAlterarDados({ pv })} min={0} max={dados.pvMax ?? 0} rotulo="PV atuais" />
              <small>/</small>
              <Contador
                valor={dados.pvMax ?? 0}
                onMudar={(pvMax) => onAlterarDados({ pvMax, pv: Math.min(dados.pv ?? 0, pvMax) })}
                min={1}
                max={9999}
                passo={5}
                rotulo="PV máximos"
              />
            </div>
            <small className={styles.machucado}>Machucado com {Math.floor((dados.pvMax ?? 0) / 2)}</small>
          </div>
          <div className={styles.grupo}>
            <span className={styles.rotulo}>Defesa</span>
            <Contador valor={dados.defesa ?? 0} onMudar={(defesa) => onAlterarDados({ defesa })} min={0} max={99} rotulo="Defesa" />
          </div>
        </div>

        <div className={styles.testes}>
          <Texto rotulo="Fortitude" valor={dados.fortitude} dica="3d20+10" curto onSalvar={(v) => onAlterarDados({ fortitude: v })} />
          <Texto rotulo="Reflexos" valor={dados.reflexos} dica="1d20" curto onSalvar={(v) => onAlterarDados({ reflexos: v })} />
          <Texto rotulo="Vontade" valor={dados.vontade} dica="1d20" curto onSalvar={(v) => onAlterarDados({ vontade: v })} />
        </div>

        <Texto rotulo="Resistências" valor={dados.resistencias} dica="Balístico, impacto e perfuração 5; Sangue 10" onSalvar={(v) => onAlterarDados({ resistencias: v })} />
        <Texto rotulo="Vulnerabilidades" valor={dados.vulnerabilidades} dica="Morte" onSalvar={(v) => onAlterarDados({ vulnerabilidades: v })} />
        <Texto rotulo="Imunidades" valor={dados.imunidades} dica="Fogo, paralisia…" onSalvar={(v) => onAlterarDados({ imunidades: v })} />
        <Texto rotulo="Deslocamento" valor={dados.deslocamento} dica="9m (6q)" onSalvar={(v) => onAlterarDados({ deslocamento: v })} />

        <ListaAtaques ataques={dados.ataques} onMudar={(ataques) => onAlterarDados({ ataques })} />
      </Painel>

      {/* ---------- Habilidades, ações e enigma ---------- */}
      <Painel className={styles.painel} rotulo="Paranormal">
        <ListaHabilidades habilidades={dados.habilidades} onMudar={(habilidades) => onAlterarDados({ habilidades })} />
        <ListaAcoes acoes={dados.acoes} onMudar={(acoes) => onAlterarDados({ acoes })} />

        <div className={styles.enigma}>
          <Texto
            rotulo="Enigma de Medo"
            area
            valor={dados.enigma}
            dica="Como o enigma é desvendado e o que a criatura perde quando isso acontece."
            onSalvar={(v) => onAlterarDados({ enigma: v })}
          />
        </div>
      </Painel>
    </div>
  );
}

// Subtítulo de bloco, como os rótulos pretos da ficha do livro
function Bloco({ titulo, children }) {
  return (
    <section className={styles.bloco}>
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}

// Campo de texto que salva ao sair (não grava a cada letra)
function Texto({ rotulo, valor = '', dica, area = false, curto = false, onSalvar }) {
  const salvar = (e) => {
    const novo = e.target.value.trim();
    if (novo !== (valor ?? '')) onSalvar(novo);
  };
  return (
    <label className={`${styles.campo} ${curto ? styles.curto : ''}`}>
      {rotulo && <span className={styles.rotulo}>{rotulo}</span>}
      {area
        ? <textarea defaultValue={valor} onBlur={salvar} placeholder={dica} rows={3} />
        : <input defaultValue={valor} onBlur={salvar} placeholder={dica} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />}
    </label>
  );
}
