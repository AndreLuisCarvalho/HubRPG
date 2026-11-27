import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Seletor from '../../../../components/Seletor/Seletor';
import { api } from '../../../../services/api';
import {
  campanhaCompleta, CORES_DE_FACCAO, ETAPAS_CAMPANHA, etapasDaCampanhaFeitas, missoesDoArco, novoId,
  RELACOES_COM_AGENTES, TIPOS_DE_DESFECHO, TIPOS_DE_RELACAO, TONS,
} from './campanhaRoteiro';
import { dadosCompletos, pendencias } from './missao';
import styles from './Roteiro.module.scss';
import est from './RoteiroCampanha.module.scss';

/**
 * O quadro geral da campanha (só o mestre), em 7 etapas: premissa, verdade oculta, ameaça, relógio
 * do vilão, facções (com o organograma), arco das missões (com a linha do tempo) e desfechos.
 */
export default function RoteiroCampanha({ campanha, missoes, fichas, etapa, onEtapa, onFechar, onErro, onAbrirMissao }) {
  const [d, setD] = useState(null);
  const temporizador = useRef(null);
  const pendente = useRef(null);

  useEffect(() => {
    api.roteiroDaCampanha(campanha.id)
      .then((dados) => setD(campanhaCompleta(dados)))
      .catch((e) => { onErro(e.message); setD(campanhaCompleta()); });
  }, [campanha.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  function gravar() {
    const p = pendente.current;
    if (!p) return;
    pendente.current = null;
    api.salvarRoteiroDaCampanha(campanha.id, p).catch((e) => onErro(`Não foi possível salvar: ${e.message}`));
  }
  useEffect(() => () => { clearTimeout(temporizador.current); gravar(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <p className={styles.carregando}>Carregando…</p>;

  const mudar = (fn) => setD((atual) => {
    const novo = fn(atual);
    pendente.current = novo;
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(gravar, 600);
    return novo;
  });

  const feitas = etapasDaCampanhaFeitas(d);
  const i = ETAPAS_CAMPANHA.findIndex((e) => e.id === etapa);
  const info = ETAPAS_CAMPANHA[i];
  const ameacas = fichas.filter((f) => f.tipo === 'npc' || f.tipo === 'monstro');

  return (
    <div className={styles.editor}>
      <header className={styles.editorTopo}>
        <button type="button" className={styles.voltar} onClick={onFechar} aria-label="Voltar para a lista">←</button>
        <div className={styles.nomes}>
          <span className={styles.nome}>{campanha.nome}</span>
          <span className={styles.resumo}>O quadro geral da campanha: a história por trás das missões.</span>
        </div>
      </header>

      <ol className={`${styles.passos} ${est.passos7}`}>
        {ETAPAS_CAMPANHA.map((e, n) => (
          <li key={e.id}>
            <button type="button" aria-current={e.id === etapa ? 'step' : undefined} data-feita={feitas[e.id] || undefined} onClick={() => onEtapa(e.id)}>
              <i>{feitas[e.id] ? '✓' : n + 1}</i>
              <span>{e.rotulo}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className={`${styles.corpo} ${est.corpoLargo}`}>
        <div className={styles.etapa}>
          <p className={styles.dica}>{info.dica}</p>
          {etapa === 'premissa' && <EtapaPremissa d={d} mudar={mudar} />}
          {etapa === 'verdade' && <EtapaVerdade d={d} mudar={mudar} missoes={missoes} />}
          {etapa === 'ameaca' && <EtapaAmeaca d={d} mudar={mudar} fichas={ameacas} />}
          {etapa === 'relogio' && <EtapaRelogio d={d} mudar={mudar} />}
          {etapa === 'faccoes' && <EtapaFaccoes d={d} mudar={mudar} fichas={fichas.filter((f) => f.tipo !== 'jogador')} />}
          {etapa === 'arco' && <EtapaArco d={d} mudar={mudar} missoes={missoes} onAbrirMissao={onAbrirMissao} />}
          {etapa === 'desfechos' && <EtapaDesfechos d={d} mudar={mudar} />}

          <div className={styles.navegar}>
            <button type="button" onClick={() => onEtapa(ETAPAS_CAMPANHA[i - 1].id)} disabled={i === 0}>← {i > 0 ? ETAPAS_CAMPANHA[i - 1].rotulo : ''}</button>
            <button type="button" className={styles.seguir} onClick={() => onEtapa(ETAPAS_CAMPANHA[i + 1].id)} disabled={i === ETAPAS_CAMPANHA.length - 1}>
              {i < ETAPAS_CAMPANHA.length - 1 ? `${ETAPAS_CAMPANHA[i + 1].rotulo} →` : 'Fim'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 1 · Premissa ---------- */
function EtapaPremissa({ d, mudar }) {
  const p = d.premissa;
  const campo = (k, v) => mudar((x) => ({ ...x, premissa: { ...x.premissa, [k]: v } }));
  return (
    <div className={styles.campos}>
      <label className={styles.campo}>
        <span>A campanha em duas frases</span>
        <textarea rows={4} value={p.texto} onChange={(e) => campo('texto', e.target.value)} placeholder="Numa cidade onde o sol não nasce, agentes da Ordem investigam…" />
      </label>
      <div className={styles.campo}>
        <span>Tom</span>
        <div className={styles.chips}>
          {TONS.map((t) => (
            <button key={t} type="button" aria-pressed={p.tons.includes(t)} onClick={() => campo('tons', p.tons.includes(t) ? p.tons.filter((x) => x !== t) : [...p.tons, t])}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 2 · Verdade oculta ---------- */
function EtapaVerdade({ d, mudar, missoes }) {
  const v = d.verdade;
  const campo = (k, val) => mudar((x) => ({ ...x, verdade: { ...x.verdade, [k]: val } }));
  const mudarSegredo = (id, k, val) => campo('segredos', v.segredos.map((s) => (s.id === id ? { ...s, [k]: val } : s)));
  const opcoes = [{ valor: null, rotulo: 'Ainda não revelado' }, ...missoes.map((m) => ({ valor: m.id, rotulo: m.nome }))];
  return (
    <div className={styles.campos}>
      <label className={styles.campo}>
        <span>O que realmente está acontecendo</span>
        <textarea rows={5} value={v.texto} onChange={(e) => campo('texto', e.target.value)} />
      </label>
      <h3 className={styles.subtitulo}>Segredos <small>pedaços da verdade, e a missão que revela cada um</small></h3>
      {v.segredos.map((s, n) => (
        <div key={s.id} className={est.segredo}>
          <input value={s.texto} onChange={(e) => mudarSegredo(s.id, 'texto', e.target.value)} placeholder={`Segredo ${n + 1}`} aria-label={`Segredo ${n + 1}`} />
          <div className={est.segredoMissao}>
            <Seletor rotulo="Missão que revela" valor={s.missaoId} placeholder="Ainda não revelado" opcoes={opcoes} onMudar={(val) => mudarSegredo(s.id, 'missaoId', val)} />
          </div>
          <button type="button" onClick={() => campo('segredos', v.segredos.filter((x) => x.id !== s.id))} aria-label="Tirar segredo">✕</button>
        </div>
      ))}
      <button type="button" className={styles.adicionar} onClick={() => campo('segredos', [...v.segredos, { id: novoId(), texto: '', missaoId: null }])}>+ Segredo</button>
    </div>
  );
}

/* ---------- 3 · Ameaça ---------- */
function EtapaAmeaca({ d, mudar, fichas }) {
  const a = d.ameaca;
  const campo = (k, v) => mudar((x) => ({ ...x, ameaca: { ...x.ameaca, [k]: v } }));
  return (
    <div className={styles.campos}>
      <div className={styles.linha}>
        <label className={styles.campoCurto}>
          <span>Ficha da ameaça</span>
          <Seletor
            rotulo="Ficha da ameaça"
            valor={a.fichaId}
            placeholder="Sem ficha (só o nome)"
            opcoes={[{ valor: null, rotulo: 'Sem ficha (só o nome)' }, ...fichas.map((f) => ({ valor: f.id, rotulo: f.nome, detalhe: f.tipo === 'monstro' ? 'Monstro' : 'NPC' }))]}
            onMudar={(v) => campo('fichaId', v)}
          />
        </label>
        <label className={styles.campoCurto}>
          <span>Ou o nome</span>
          <input value={a.nome} onChange={(e) => campo('nome', e.target.value)} placeholder="Ex.: O Culto do Sino" />
        </label>
      </div>
      <label className={styles.campo}>
        <span>O que ela quer</span>
        <textarea rows={3} value={a.quer} onChange={(e) => campo('quer', e.target.value)} />
      </label>
      <label className={styles.campo}>
        <span>Do que é capaz</span>
        <textarea rows={3} value={a.poder} onChange={(e) => campo('poder', e.target.value)} />
      </label>
    </div>
  );
}

/* ---------- 4 · Relógio do vilão ---------- */
function EtapaRelogio({ d, mudar }) {
  const r = d.relogio;
  const campo = (k, v) => mudar((x) => ({ ...x, relogio: { ...x.relogio, [k]: v } }));
  const passos = r.passos;
  const atual = Math.min(r.atual, passos.length);
  return (
    <div className={styles.campos}>
      <div className={est.relogio}>
        <Relogio total={passos.length} atual={atual} />
        <div className={est.relogioTexto}>
          <b>{passos.length ? `${atual} de ${passos.length}` : 'Sem passos ainda'}</b>
          <small>{atual >= passos.length && passos.length ? 'O plano se completou.' : passos[atual]?.texto ? `Próximo: ${passos[atual].texto}` : ''}</small>
          <div className={est.relogioBotoes}>
            <button type="button" onClick={() => campo('atual', Math.max(0, atual - 1))} disabled={atual === 0}>◂ Voltar</button>
            <button type="button" className={styles.seguir} onClick={() => campo('atual', Math.min(passos.length, atual + 1))} disabled={atual >= passos.length}>Avançar ▸</button>
          </div>
        </div>
      </div>
      <h3 className={styles.subtitulo}>Passos do plano</h3>
      {passos.map((p, n) => (
        <div key={p.id} className={est.passo} data-feito={n < atual || undefined}>
          <i>{n + 1}</i>
          <input value={p.texto} onChange={(e) => campo('passos', passos.map((x) => (x.id === p.id ? { ...x, texto: e.target.value } : x)))} placeholder="O que a ameaça faz neste passo" aria-label={`Passo ${n + 1}`} />
          <button type="button" onClick={() => campo('passos', passos.filter((x) => x.id !== p.id))} aria-label="Tirar passo">✕</button>
        </div>
      ))}
      <button type="button" className={styles.adicionar} onClick={() => campo('passos', [...passos, { id: novoId(), texto: '' }])}>+ Passo</button>
    </div>
  );
}

// Relógio em gomos (como os "clocks" de mesa): os passos que já aconteceram ficam vermelhos
function Relogio({ total, atual }) {
  const n = Math.max(total, 1);
  const r = 44;
  const gomos = Array.from({ length: n }, (_, k) => {
    const a0 = (k / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((k + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (a) => `${50 + r * Math.cos(a)} ${50 + r * Math.sin(a)}`;
    return n === 1
      ? <circle key={k} cx="50" cy="50" r={r} data-feito={atual >= 1 || undefined} />
      : <path key={k} d={`M50 50 L${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`} data-feito={k < atual || undefined} />;
  });
  return <svg className={est.relogioSvg} viewBox="0 0 100 100" aria-hidden="true">{total ? gomos : <circle cx="50" cy="50" r={r} />}</svg>;
}

/* ---------- 5 · Facções (organograma) ---------- */
function EtapaFaccoes({ d, mudar, fichas }) {
  const mudarFaccao = (id, k, v) => mudar((x) => ({ ...x, faccoes: x.faccoes.map((f) => (f.id === id ? { ...f, [k]: v } : f)) }));
  const nova = () => mudar((x) => ({
    ...x,
    faccoes: [...x.faccoes, { id: novoId(), nome: '', cor: CORES_DE_FACCAO[x.faccoes.length % CORES_DE_FACCAO.length], objetivo: '', relacao: 'neutra', liderId: null, membros: [] }],
  }));
  const tirar = (id) => mudar((x) => ({
    ...x,
    faccoes: x.faccoes.filter((f) => f.id !== id),
    relacoes: x.relacoes.filter((r) => r.de !== id && r.para !== id),
  }));
  const mudarRelacao = (id, k, v) => mudar((x) => ({ ...x, relacoes: x.relacoes.map((r) => (r.id === id ? { ...r, [k]: v } : r)) }));
  const opcoesFaccao = d.faccoes.map((f, n) => ({ valor: f.id, rotulo: f.nome || `Facção ${n + 1}` }));
  const opcoesFicha = [{ valor: null, rotulo: 'Sem líder' }, ...fichas.map((f) => ({ valor: f.id, rotulo: f.nome }))];

  return (
    <div className={styles.campos}>
      <Organograma d={d} fichas={fichas} />

      <h3 className={styles.subtitulo}>Facções</h3>
      {d.faccoes.map((f, n) => (
        <div key={f.id} className={styles.cartaoEtapa} style={{ borderLeft: `3px solid ${f.cor}` }}>
          <header>
            <b>Facção {n + 1}</b>
            <span className={est.cores}>
              {CORES_DE_FACCAO.map((c) => (
                <button key={c} type="button" aria-pressed={f.cor === c} style={{ '--c': c }} onClick={() => mudarFaccao(f.id, 'cor', c)} aria-label={`Cor ${c}`} />
              ))}
            </span>
            <button type="button" onClick={() => tirar(f.id)} aria-label="Tirar facção">✕</button>
          </header>
          <div className={styles.linha}>
            <label className={styles.campoCurto}><span>Nome</span>
              <input value={f.nome} onChange={(e) => mudarFaccao(f.id, 'nome', e.target.value)} placeholder="Ex.: Ordo Realitas, Culto do Sino" />
            </label>
            <label className={styles.campoCurto}><span>Com os agentes</span>
              <Seletor rotulo="Relação com os agentes" valor={f.relacao} opcoes={RELACOES_COM_AGENTES.map((r) => ({ valor: r.id, rotulo: r.rotulo }))} onMudar={(v) => mudarFaccao(f.id, 'relacao', v)} />
            </label>
            <label className={styles.campoCurto}><span>Líder</span>
              <Seletor rotulo="Líder" valor={f.liderId} placeholder="Sem líder" opcoes={opcoesFicha} onMudar={(v) => mudarFaccao(f.id, 'liderId', v)} />
            </label>
          </div>
          <label className={styles.campo}><span>Objetivo</span>
            <input value={f.objetivo} onChange={(e) => mudarFaccao(f.id, 'objetivo', e.target.value)} />
          </label>
          {fichas.length > 0 && (
            <div className={styles.campo}>
              <span>Membros</span>
              <div className={styles.chips}>
                {fichas.filter((x) => x.id !== f.liderId).map((x) => (
                  <button key={x.id} type="button" aria-pressed={f.membros.includes(x.id)} onClick={() => mudarFaccao(f.id, 'membros', f.membros.includes(x.id) ? f.membros.filter((y) => y !== x.id) : [...f.membros, x.id])}>
                    {x.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <button type="button" className={styles.adicionar} onClick={nova}>+ Facção</button>

      {d.faccoes.length > 1 && (
        <>
          <h3 className={styles.subtitulo}>Relações entre facções</h3>
          {d.relacoes.map((r) => (
            <div key={r.id} className={est.relacao}>
              <Seletor rotulo="De" valor={r.de} opcoes={opcoesFaccao} onMudar={(v) => mudarRelacao(r.id, 'de', v)} />
              <Seletor rotulo="Tipo" valor={r.tipo} opcoes={TIPOS_DE_RELACAO.map((t) => ({ valor: t.id, rotulo: t.rotulo }))} onMudar={(v) => mudarRelacao(r.id, 'tipo', v)} />
              <Seletor rotulo="Para" valor={r.para} opcoes={opcoesFaccao} onMudar={(v) => mudarRelacao(r.id, 'para', v)} />
              <input value={r.texto} onChange={(e) => mudarRelacao(r.id, 'texto', e.target.value)} placeholder="Detalhe (opcional)" aria-label="Detalhe da relação" />
              <button type="button" onClick={() => mudar((x) => ({ ...x, relacoes: x.relacoes.filter((y) => y.id !== r.id) }))} aria-label="Tirar relação">✕</button>
            </div>
          ))}
          <button
            type="button"
            className={styles.adicionar}
            onClick={() => mudar((x) => ({ ...x, relacoes: [...x.relacoes, { id: novoId(), de: x.faccoes[0].id, para: x.faccoes[1].id, tipo: 'rivalidade', texto: '' }] }))}
          >
            + Relação
          </button>
        </>
      )}
    </div>
  );
}

/*
 * O organograma: a ameaça no topo, as facções embaixo (líder e membros) e as relações entre elas
 * desenhadas como arcos (aliança verde, rivalidade vermelha, controle âmbar tracejado).
 */
function Organograma({ d, fichas }) {
  const caixa = useRef(null);
  const nos = useRef(new Map());
  const [linhas, setLinhas] = useState([]);
  const porId = Object.fromEntries(fichas.map((f) => [f.id, f]));
  const ameaca = d.ameaca.fichaId ? porId[d.ameaca.fichaId]?.nome : d.ameaca.nome;
  const chave = JSON.stringify([d.faccoes.map((f) => [f.id, f.nome, f.membros.length, f.liderId]), d.relacoes]);

  useLayoutEffect(() => {
    const medir = () => {
      const base = caixa.current?.getBoundingClientRect();
      if (!base) return;
      setLinhas(d.relacoes.flatMap((r) => {
        const a = nos.current.get(r.de)?.getBoundingClientRect();
        const b = nos.current.get(r.para)?.getBoundingClientRect();
        if (!a || !b || r.de === r.para) return [];
        const n = d.relacoes.indexOf(r);
        const rotulo = TIPOS_DE_RELACAO.find((t) => t.id === r.tipo)?.rotulo;
        // Uma embaixo da outra (celular): a ligação faz uma curva pela lateral direita
        if (Math.abs(a.left - b.left) < 20) {
          const xs = a.right - base.left;
          const ya = a.top + a.height / 2 - base.top;
          const yb = b.top + b.height / 2 - base.top;
          const fora = xs + 26 + (n % 3) * 12;
          return [{
            id: r.id, tipo: r.tipo, rotulo, lateral: true,
            d: `M${xs} ${ya} C${fora} ${ya} ${fora} ${yb} ${xs} ${yb}`,
            rx: fora - 2, ry: (ya + yb) / 2,
          }];
        }
        const x1 = a.left + a.width / 2 - base.left;
        const y1 = a.top - base.top;
        const x2 = b.left + b.width / 2 - base.left;
        const y2 = b.top - base.top;
        // Arco baixo, no vão entre a ameaça e as facções (arcos de pares diferentes em alturas diferentes)
        const alto = Math.min(y1, y2) - 14 - (n % 3) * 8;
        return [{
          id: r.id,
          tipo: r.tipo,
          d: `M${x1} ${y1} C${x1} ${alto - 6} ${x2} ${alto - 6} ${x2} ${y2}`,
          rx: (x1 + x2) / 2,
          ry: alto + 1,
          rotulo,
        }];
      }));
    };
    medir();
    const obs = new ResizeObserver(medir);
    if (caixa.current) obs.observe(caixa.current);
    return () => obs.disconnect();
  }, [chave]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!d.faccoes.length && !ameaca) {
    return <p className={est.diagramaVazio}>O organograma aparece aqui quando você criar a ameaça e as facções.</p>;
  }

  return (
    <div className={est.organograma} ref={caixa} aria-label="Organograma">
      {ameaca && (
        <div className={est.noAmeaca}>
          <small>A ameaça</small>
          <b>{ameaca}</b>
        </div>
      )}
      <svg className={est.ligacoes} aria-hidden="true">
        {linhas.map((l) => (
          <g key={l.id} data-tipo={l.tipo}>
            <path d={l.d} />
            <text x={l.rx} y={l.ry} textAnchor={l.lateral ? 'start' : 'middle'} transform={l.lateral ? `rotate(90 ${l.rx} ${l.ry})` : undefined}>{l.rotulo}</text>
          </g>
        ))}
      </svg>
      <div className={est.faccoes}>
        {d.faccoes.map((f, n) => (
          <div key={f.id} ref={(el) => (el ? nos.current.set(f.id, el) : nos.current.delete(f.id))} className={est.noFaccao} style={{ '--c': f.cor }}>
            <header>
              <b>{f.nome || `Facção ${n + 1}`}</b>
              <em data-relacao={f.relacao}>{RELACOES_COM_AGENTES.find((r) => r.id === f.relacao)?.rotulo}</em>
            </header>
            {f.liderId && porId[f.liderId] && <span className={est.lider}>♛ {porId[f.liderId].nome}</span>}
            {f.membros.filter((id) => porId[id]).map((id) => <span key={id} className={est.membro}>{porId[id].nome}</span>)}
            {f.objetivo && <small>{f.objetivo}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 6 · Arco (linha do tempo) ---------- */
function EtapaArco({ d, mudar, missoes, onAbrirMissao }) {
  const noArco = missoesDoArco(d, missoes);
  const fora = missoes.filter((m) => !d.arco.includes(m.id));
  const mover = (id, passo) => mudar((x) => {
    const lista = [...x.arco];
    const de = lista.indexOf(id);
    const para = de + passo;
    if (para < 0 || para >= lista.length) return x;
    [lista[de], lista[para]] = [lista[para], lista[de]];
    return { ...x, arco: lista };
  });
  return (
    <div className={styles.campos}>
      <LinhaDoTempo d={d} missoes={noArco} onAbrirMissao={onAbrirMissao} />

      <h3 className={styles.subtitulo}>Ordem das missões</h3>
      {noArco.length === 0 && <p className={styles.vazio}>Adicione as missões na ordem em que a história acontece.</p>}
      {noArco.map((m, n) => (
        <div key={m.id} className={est.itemArco}>
          <i>{n + 1}</i>
          <b>{m.nome}</b>
          <button type="button" onClick={() => mover(m.id, -1)} disabled={n === 0} aria-label="Antes">▲</button>
          <button type="button" onClick={() => mover(m.id, 1)} disabled={n === noArco.length - 1} aria-label="Depois">▼</button>
          <button type="button" onClick={() => mudar((x) => ({ ...x, arco: x.arco.filter((y) => y !== m.id) }))} aria-label="Tirar do arco">✕</button>
        </div>
      ))}
      {fora.length > 0 && (
        <label className={styles.campoCurto}>
          <span>Adicionar missão ao arco</span>
          <Seletor rotulo="Adicionar missão" valor={null} placeholder="Escolher missão…" opcoes={fora.map((m) => ({ valor: m.id, rotulo: m.nome }))} onMudar={(id) => mudar((x) => ({ ...x, arco: [...x.arco, id] }))} />
        </label>
      )}
      {missoes.length === 0 && <p className={styles.vazio}>Crie missões na lista do Roteiro para montar o arco.</p>}
    </div>
  );
}

/*
 * A linha do tempo: as missões na ordem do arco (com o estado de cada uma e os segredos que revelam)
 * e, embaixo, o plano da ameaça (os passos do relógio, os que já aconteceram em vermelho).
 */
function LinhaDoTempo({ d, missoes, onAbrirMissao }) {
  const atual = Math.min(d.relogio.atual, d.relogio.passos.length);
  if (!missoes.length && !d.relogio.passos.length) {
    return <p className={est.diagramaVazio}>A linha do tempo aparece aqui quando houver missões no arco ou passos no relógio.</p>;
  }
  return (
    <div className={est.linhaDoTempo} aria-label="Linha do tempo">
      <div className={est.trilha}>
        <span className={est.rotuloTrilha}>Missões</span>
        <ol>
          {missoes.map((m, n) => {
            const dm = dadosCompletos(m.dados);
            const pronta = !pendencias(dm).some((p) => p.grave);
            const jogada = dm.sessoes.length > 0;
            const segredos = d.verdade.segredos.filter((s) => s.missaoId === m.id && s.texto.trim());
            return (
              <li key={m.id}>
                <button type="button" className={est.noMissao} onClick={() => onAbrirMissao(m.id)} title="Abrir a missão">
                  <i>{n + 1}</i>
                  <b>{m.nome}</b>
                  <em data-estado={jogada ? 'jogada' : pronta ? 'pronta' : 'montando'}>{jogada ? 'Jogada' : pronta ? 'Pronta' : 'Montando'}</em>
                </button>
                {segredos.map((s) => <small key={s.id} className={est.revela}>revela: {s.texto}</small>)}
              </li>
            );
          })}
        </ol>
      </div>
      {d.relogio.passos.length > 0 && (
        <div className={est.trilha}>
          <span className={est.rotuloTrilha}>Plano da ameaça</span>
          <ol className={est.trilhaRelogio}>
            {d.relogio.passos.map((p, n) => (
              <li key={p.id} data-feito={n < atual || undefined} data-proximo={n === atual || undefined}>
                <i />
                <small>{p.texto || `Passo ${n + 1}`}</small>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ---------- 7 · Desfechos ---------- */
function EtapaDesfechos({ d, mudar }) {
  const mudarDesfecho = (id, k, v) => mudar((x) => ({ ...x, desfechos: x.desfechos.map((y) => (y.id === id ? { ...y, [k]: v } : y)) }));
  return (
    <div className={styles.campos}>
      {d.desfechos.map((x) => (
        <div key={x.id} className={styles.cartaoEtapa} data-desfecho={x.tipo}>
          <header>
            <span className={est.tipoDesfecho}>
              <Seletor rotulo="Tipo de desfecho" valor={x.tipo} opcoes={TIPOS_DE_DESFECHO.map((t) => ({ valor: t.id, rotulo: t.rotulo }))} onMudar={(v) => mudarDesfecho(x.id, 'tipo', v)} />
            </span>
            <button type="button" onClick={() => mudar((y) => ({ ...y, desfechos: y.desfechos.filter((z) => z.id !== x.id) }))} aria-label="Tirar desfecho">✕</button>
          </header>
          <textarea rows={3} value={x.texto} onChange={(e) => mudarDesfecho(x.id, 'texto', e.target.value)} placeholder="Como a campanha termina neste caso" aria-label="Desfecho" />
        </div>
      ))}
      <button
        type="button"
        className={styles.adicionar}
        onClick={() => mudar((y) => ({ ...y, desfechos: [...y.desfechos, { id: novoId(), tipo: TIPOS_DE_DESFECHO[Math.min(y.desfechos.length, 2)].id, texto: '' }] }))}
      >
        + Desfecho
      </button>
    </div>
  );
}
