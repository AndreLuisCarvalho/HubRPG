import { useEffect, useState } from 'react';
import { ELEMENTOS } from '../../../../sistemas/ordemParanormal/modelo';
import { copiasDoLivro, daFicha } from './regrasCombate';
import styles from './Combate.module.scss';

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const ABAS = [
  { id: 'agentes', rotulo: 'Agentes' },
  { id: 'fichas', rotulo: 'Monstros e NPCs' },
  { id: 'livro', rotulo: 'Do livro' },
];

/**
 * Escolher quem entra: agentes (fichas de jogador), fichas de monstros/NPCs e criaturas do livro
 * (em cópias numeradas). Quem já está na luta não aparece de novo.
 */
export default function AdicionarParticipantes({ fichas, participantes, onAdicionar, onCancelar }) {
  const naLuta = new Set(participantes.map((p) => p.fichaId).filter(Boolean));
  const agentes = fichas.filter((f) => f.tipo === 'jogador' && !naLuta.has(f.id));
  const outras = fichas.filter((f) => f.tipo !== 'jogador' && !naLuta.has(f.id));

  const [aba, setAba] = useState(agentes.length ? 'agentes' : 'fichas');
  // Agentes já vêm marcados (normalmente o grupo todo entra)
  const [marcadas, setMarcadas] = useState(() => new Set(agentes.map((f) => f.id)));
  const [ladoDe, setLadoDe] = useState({});        // fichaId → 'agentes' | 'ameacas' (NPC pode ser aliado)
  const [livro, setLivro] = useState({});          // id do monstro → quantidade
  const [oculto, setOculto] = useState(false);
  const [monstros, setMonstros] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (aba !== 'livro' || monstros) return;
    const vivo = { ok: true };
    import('../../../../sistemas/ordemParanormal/monstros').then((m) => vivo.ok && setMonstros(m.MONSTROS));
    return () => { vivo.ok = false; };
  }, [aba, monstros]);

  const alternar = (id) => setMarcadas((s) => {
    const nova = new Set(s);
    if (nova.has(id)) nova.delete(id); else nova.add(id);
    return nova;
  });

  const ladoPadrao = (f) => (f.tipo === 'jogador' ? 'agentes' : 'ameacas');
  const quantidade = (id) => livro[id] ?? 0;
  const mudarQtd = (id, passo) => setLivro((l) => ({ ...l, [id]: Math.max(0, Math.min(20, (l[id] ?? 0) + passo)) }));

  const totalLivro = Object.values(livro).reduce((s, n) => s + n, 0);
  const total = marcadas.size + totalLivro;

  function confirmar() {
    const daLista = fichas
      .filter((f) => marcadas.has(f.id))
      .map((f) => ({ ...daFicha(f, ladoDe[f.id] ?? ladoPadrao(f)), oculto: f.tipo !== 'jogador' && oculto }));
    let todos = [...participantes, ...daLista];
    const doLivro = [];
    for (const m of monstros ?? []) {
      const n = quantidade(m.id);
      if (!n) continue;
      const copias = copiasDoLivro(m, n, todos).map((c) => ({ ...c, oculto }));
      doLivro.push(...copias);
      todos = [...todos, ...copias];
    }
    onAdicionar([...daLista, ...doLivro]);
  }

  const termo = normalizar(busca.trim());
  const monstrosVisiveis = (monstros ?? []).filter((m) => !termo || normalizar(m.nome).includes(termo));

  const linhaFicha = (f, comLado) => (
    <li key={f.id} className={styles.escolha}>
      <label>
        <input type="checkbox" checked={marcadas.has(f.id)} onChange={() => alternar(f.id)} />
        <span className={styles.miniRetrato}>{f.imagem ? <img src={f.imagem} alt="" /> : f.nome.charAt(0)}</span>
        <span className={styles.escolhaNome}>
          <b>{f.nome}</b>
          <small>{{ jogador: 'Agente', npc: 'NPC', monstro: 'Monstro' }[f.tipo]}</small>
        </span>
      </label>
      {comLado && marcadas.has(f.id) && (
        <div className={styles.ladoEscolha} role="radiogroup" aria-label={`Lado de ${f.nome}`}>
          {[['agentes', 'Aliado'], ['ameacas', 'Inimigo']].map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={(ladoDe[f.id] ?? ladoPadrao(f)) === id}
              onClick={() => setLadoDe((l) => ({ ...l, [f.id]: id }))}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}
    </li>
  );

  return (
    <div className={styles.adicionar}>
      <div className={styles.abas} role="tablist">
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}>{a.rotulo}</button>
        ))}
      </div>

      {aba === 'agentes' && (
        agentes.length
          ? <ul className={styles.escolhas}>{agentes.map((f) => linhaFicha(f, false))}</ul>
          : <p className={styles.ladoVazio}>Todos os agentes já estão na luta (ou ainda não há fichas de jogador).</p>
      )}

      {aba === 'fichas' && (
        outras.length
          ? <ul className={styles.escolhas}>{outras.map((f) => linhaFicha(f, true))}</ul>
          : <p className={styles.ladoVazio}>Nenhuma ficha de monstro ou NPC disponível.</p>
      )}

      {aba === 'livro' && (
        <>
          <input
            type="search"
            className={styles.busca}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar criatura…"
            aria-label="Buscar criatura do livro"
          />
          {!monstros && <p className={styles.ladoVazio}>Abrindo o bestiário…</p>}
          <ul className={styles.escolhas}>
            {monstrosVisiveis.map((m) => (
              <li key={m.id} className={styles.escolha} style={{ '--elemento': ELEMENTOS[m.elemento]?.cor }}>
                <span className={styles.escolhaNome}>
                  <b>{m.nome}</b>
                  <small>VD {m.vd} · {ELEMENTOS[m.elemento]?.nome ?? 'Mundano'} · PV {m.pv} · Defesa {m.defesa}</small>
                </span>
                <span className={styles.quantidade}>
                  <button type="button" onClick={() => mudarQtd(m.id, -1)} disabled={!quantidade(m.id)} aria-label={`Menos ${m.nome}`}>−</button>
                  <b>{quantidade(m.id)}</b>
                  <button type="button" onClick={() => mudarQtd(m.id, 1)} aria-label={`Mais ${m.nome}`}>+</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <label className={styles.marcar}>
        <input type="checkbox" checked={oculto} onChange={(e) => setOculto(e.target.checked)} />
        Entrar ocultos (monstros, NPCs e criaturas ficam escondidos dos jogadores até você revelar)
      </label>

      <div className={styles.botoes}>
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="button" className={styles.primario} onClick={confirmar} disabled={!total}>
          {total ? `Colocar ${total} na luta` : 'Escolha quem entra'}
        </button>
      </div>
    </div>
  );
}
