import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Seletor from '../../../../components/Seletor/Seletor';
import { api } from '../../../../services/api';
import { PERICIAS } from '../../../../sistemas/ordemParanormal/modelo';
import { carregarLivros } from '../Combate/acoesCombate';
import { COMBATE_NOVO, copiasDoLivro, daFicha } from '../Combate/regrasCombate';
import {
  dadosCompletos, ETAPAS, etapasFeitas, novoId, pendencias, PISTAS_POR_REVELACAO, pistasPorRevelacao,
} from './missao';
import { ETAPAS_CAMPANHA } from './campanhaRoteiro';
import RoteiroCampanha from './RoteiroCampanha';
import styles from './Roteiro.module.scss';

/**
 * Roteiro (só o mestre): as missões da campanha montadas passo a passo — gancho, cenas, pistas,
 * NPCs, confronto e clímax —, com o que ainda falta para estarem prontas para jogar.
 * Uma missão pode durar várias sessões.
 */
export default function Roteiro({ campanha }) {
  const mestre = campanha.papel === 'mestre';
  const [missoes, setMissoes] = useState(null);
  const [apoio, setApoio] = useState({ fichas: [], mapas: [], sessoes: [] });
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useSearchParams();
  const [nova, setNova] = useState('');

  useEffect(() => {
    if (!mestre) return undefined;
    const efeito = { ativo: true };
    Promise.all([
      api.listarMissoes(campanha.id),
      api.listarFichas(campanha.id),
      api.listarMapas(campanha.id).catch(() => []),
      api.listarSessoes(campanha.id).catch(() => []),
    ])
      .then(([m, fichas, mapas, sessoes]) => {
        if (!efeito.ativo) return;
        setMissoes(m);
        setApoio({ fichas, mapas, sessoes });
      })
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [campanha.id, mestre]);

  if (!mestre) return <Navigate to=".." replace />;
  if (erro && !missoes) return <p className="erro">{erro}</p>;
  if (!missoes) return <p className={styles.carregando}>Carregando…</p>;

  const aberta = missoes.find((m) => m.id === Number(busca.get('missao'))) ?? null;
  const campanhaAberta = !aberta && busca.get('campanha') !== null;
  const abrir = (id) => setBusca(id ? { missao: String(id) } : {}, { replace: true });
  const etapaCampanha = ETAPAS_CAMPANHA.some((e) => e.id === busca.get('campanha')) ? busca.get('campanha') : 'premissa';

  async function criar(e) {
    e.preventDefault();
    const nome = nova.trim();
    if (!nome) return;
    try {
      const m = await api.criarMissao(campanha.id, { nome, dados: dadosCompletos() });
      setMissoes((l) => [...l, m]);
      setNova('');
      abrir(m.id);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function excluir(m) {
    if (!window.confirm(`Apagar a missão "${m.nome}"? O roteiro dela some (os combates montados continuam na tela Combate).`)) return;
    await api.excluirMissao(m.id);
    setMissoes((l) => l.filter((x) => x.id !== m.id));
    if (aberta?.id === m.id) abrir(null);
  }

  const trocar = (atualizada) => setMissoes((l) => l.map((m) => (m.id === atualizada.id ? atualizada : m)));

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <div>
          <h1>Roteiro</h1>
          <p>O quadro geral da campanha e cada missão passo a passo. Só você (o mestre) vê esta página.</p>
        </div>
      </header>

      {erro && <p className="erro">{erro}</p>}

      <div className={styles.grade} data-aberta={aberta || campanhaAberta ? true : undefined}>
        {/* ---------- Lista: a campanha (fixa no topo) e as missões ---------- */}
        <aside className={styles.lista} aria-label="Missões">
          <button
            type="button"
            className={`${styles.cartao} ${styles.cartaoCampanha}`}
            aria-current={campanhaAberta || undefined}
            onClick={() => setBusca({ campanha: 'premissa' }, { replace: true })}
          >
            <small className={styles.sobre}>A campanha</small>
            <b>{campanha.nome}</b>
            <small>Premissa, verdade oculta, ameaça, relógio, facções, arco e desfechos</small>
          </button>
          <form className={styles.nova} onSubmit={criar}>
            <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nome da nova missão" maxLength={80} aria-label="Nome da nova missão" />
            <button type="submit" disabled={!nova.trim()}>+ Missão</button>
          </form>
          {missoes.length === 0 && <p className={styles.vazio}>Nenhuma missão ainda. Dê um nome e comece pelo gancho.</p>}
          <ul>
            {missoes.map((m) => {
              const d = dadosCompletos(m.dados);
              const feitas = Object.values(etapasFeitas(d)).filter(Boolean).length;
              const graves = pendencias(d).filter((p) => p.grave).length;
              return (
                <li key={m.id}>
                  <button type="button" className={styles.cartao} aria-current={aberta?.id === m.id || undefined} onClick={() => abrir(m.id)}>
                    <b>{m.nome}</b>
                    {d.resumo && <small>{d.resumo}</small>}
                    <span className={styles.progresso} aria-label={`${feitas} de ${ETAPAS.length} etapas`}>
                      {ETAPAS.map((e, i) => <i key={e.id} data-feita={i < feitas || undefined} />)}
                      <em data-pronta={graves === 0 || undefined}>{graves === 0 ? 'Pronta para jogar' : `${feitas}/${ETAPAS.length}`}</em>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* ---------- A campanha ou a missão aberta ---------- */}
        {campanhaAberta ? (
          <RoteiroCampanha
            campanha={campanha}
            missoes={missoes}
            fichas={apoio.fichas}
            etapa={etapaCampanha}
            onEtapa={(etapa) => setBusca({ campanha: etapa }, { replace: true })}
            onFechar={() => abrir(null)}
            onErro={setErro}
            onAbrirMissao={abrir}
          />
        ) : aberta ? (
          <EditorDaMissao
            key={aberta.id}
            campanha={campanha}
            missao={aberta}
            apoio={apoio}
            etapa={ETAPAS.some((e) => e.id === busca.get('etapa')) ? busca.get('etapa') : 'gancho'}
            onEtapa={(etapa) => setBusca({ missao: String(aberta.id), etapa }, { replace: true })}
            onSalva={trocar}
            onFechar={() => abrir(null)}
            onExcluir={() => excluir(aberta)}
            onErro={setErro}
          />
        ) : (
          <div className={styles.semMissao}>
            <p>Escolha uma missão na lista ou crie uma nova.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ====================================================================== */

function EditorDaMissao({ campanha, missao, apoio, etapa, onEtapa, onSalva, onFechar, onExcluir, onErro }) {
  const [nome, setNome] = useState(missao.nome);
  const [d, setD] = useState(() => dadosCompletos(missao.dados));
  const temporizador = useRef(null);
  const pendente = useRef(null);

  // Salva 600ms depois da última mudança (e ao sair da missão)
  function agendar(novoNome, novosDados) {
    pendente.current = { nome: novoNome, dados: novosDados };
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(gravar, 600);
  }
  function gravar() {
    const p = pendente.current;
    if (!p) return;
    pendente.current = null;
    api.atualizarMissao(missao.id, { nome: p.nome.trim() || missao.nome, dados: p.dados })
      .then(onSalva)
      .catch((e) => onErro(`Não foi possível salvar: ${e.message}`));
  }
  useEffect(() => () => { clearTimeout(temporizador.current); gravar(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (fn) => setD((atual) => {
    const novo = fn(atual);
    agendar(nome, novo);
    return novo;
  });
  const renomear = (valor) => { setNome(valor); agendar(valor, d); };

  const feitas = etapasFeitas(d);
  const faltas = pendencias(d);
  const i = ETAPAS.findIndex((e) => e.id === etapa);
  const info = ETAPAS[i];

  const fichasNpc = apoio.fichas.filter((f) => f.tipo === 'npc' || f.tipo === 'monstro');

  return (
    <div className={styles.editor}>
      <header className={styles.editorTopo}>
        <button type="button" className={styles.voltar} onClick={onFechar} aria-label="Voltar para a lista">←</button>
        <div className={styles.nomes}>
          <input className={styles.nome} value={nome} onChange={(e) => renomear(e.target.value)} aria-label="Nome da missão" maxLength={80} />
          <input
            className={styles.resumo}
            value={d.resumo}
            onChange={(e) => mudar((x) => ({ ...x, resumo: e.target.value }))}
            placeholder="Em uma frase: do que se trata a missão"
            aria-label="Resumo da missão"
            maxLength={160}
          />
        </div>
        <button type="button" className={styles.apagar} onClick={onExcluir}>Apagar</button>
      </header>

      {/* Sessões em que a missão é jogada */}
      {apoio.sessoes.length > 0 && (
        <div className={styles.sessoes} role="group" aria-label="Jogada nas sessões">
          <span>Jogada nas sessões</span>
          {apoio.sessoes.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={d.sessoes.includes(s.id)}
              onClick={() => mudar((x) => ({ ...x, sessoes: x.sessoes.includes(s.id) ? x.sessoes.filter((y) => y !== s.id) : [...x.sessoes, s.id] }))}
            >
              {s.numero}{s.titulo ? ` · ${s.titulo}` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Passo a passo */}
      <ol className={styles.passos}>
        {ETAPAS.map((e, n) => (
          <li key={e.id}>
            <button type="button" aria-current={e.id === etapa ? 'step' : undefined} data-feita={feitas[e.id] || undefined} onClick={() => onEtapa(e.id)}>
              <i>{feitas[e.id] ? '✓' : n + 1}</i>
              <span>{e.rotulo}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className={styles.corpo}>
        <div className={styles.etapa}>
          <p className={styles.dica}>{info.dica}</p>
          {etapa === 'gancho' && <EtapaGancho d={d} mudar={mudar} />}
          {etapa === 'cenas' && <EtapaCenas d={d} mudar={mudar} mapas={apoio.mapas} fichas={fichasNpc} />}
          {etapa === 'pistas' && <EtapaPistas d={d} mudar={mudar} />}
          {etapa === 'npcs' && <EtapaNpcs d={d} mudar={mudar} fichas={apoio.fichas.filter((f) => f.tipo === 'npc')} />}
          {etapa === 'confronto' && (
            <EtapaConfronto d={d} mudar={mudar} campanha={campanha} fichas={fichasNpc} jogadores={apoio.fichas.filter((f) => f.tipo === 'jogador')} nomeMissao={nome} onErro={onErro} />
          )}
          {etapa === 'climax' && <EtapaClimax d={d} mudar={mudar} />}

          <div className={styles.navegar}>
            <button type="button" onClick={() => onEtapa(ETAPAS[i - 1].id)} disabled={i === 0}>← {i > 0 ? ETAPAS[i - 1].rotulo : ''}</button>
            <button type="button" className={styles.seguir} onClick={() => onEtapa(ETAPAS[i + 1].id)} disabled={i === ETAPAS.length - 1}>
              {i < ETAPAS.length - 1 ? `${ETAPAS[i + 1].rotulo} →` : 'Fim'}
            </button>
          </div>
        </div>

        {/* Pronto para jogar? */}
        <aside className={styles.checklist} aria-label="Pronto para jogar">
          <h2>{faltas.some((f) => f.grave) ? 'Falta para jogar' : faltas.length ? 'Pronta para jogar · sugestões' : 'Pronta para jogar'}</h2>
          {faltas.length === 0 && <p className={styles.tudoCerto}>✓ Tudo montado. Boa sessão!</p>}
          <ul>
            {faltas.map((f, n) => (
              <li key={n} data-grave={f.grave || undefined}>
                <button type="button" onClick={() => onEtapa(f.etapa)}>
                  <small>{ETAPAS.find((e) => e.id === f.etapa)?.rotulo}</small>
                  {f.texto}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

/* ---------- 1 · Gancho ---------- */
function EtapaGancho({ d, mudar }) {
  const g = d.gancho;
  const campo = (k, v) => mudar((x) => ({ ...x, gancho: { ...x.gancho, [k]: v } }));
  return (
    <div className={styles.campos}>
      <label className={styles.campo}>
        <span>Briefing <small>(o texto que você lê na mesa)</small></span>
        <textarea rows={6} value={g.texto} onChange={(e) => campo('texto', e.target.value)} placeholder="Agentes, a Ordo Realitas detectou…" />
      </label>
      <label className={styles.campo}>
        <span>Objetivo da missão</span>
        <input value={g.objetivo} onChange={(e) => campo('objetivo', e.target.value)} placeholder="Ex.: descobrir o que causa os desaparecimentos e conter a criatura" />
      </label>
      <label className={styles.campo}>
        <span>Notas do mestre <small>(o que está por trás, que os agentes não sabem)</small></span>
        <textarea rows={4} value={g.notas} onChange={(e) => campo('notas', e.target.value)} />
      </label>
    </div>
  );
}

/* ---------- 2 · Cenas ---------- */
function EtapaCenas({ d, mudar, mapas, fichas }) {
  const mudarCena = (id, k, v) => mudar((x) => ({ ...x, cenas: x.cenas.map((c) => (c.id === id ? { ...c, [k]: v } : c)) }));
  const nova = () => mudar((x) => ({ ...x, cenas: [...x.cenas, { id: novoId(), nome: '', descricao: '', mapaId: null, fichas: [] }] }));
  const tirar = (id) => mudar((x) => ({
    ...x,
    cenas: x.cenas.filter((c) => c.id !== id),
    pistas: x.pistas.map((p) => (p.cenaId === id ? { ...p, cenaId: null } : p)),
  }));
  return (
    <div className={styles.campos}>
      {d.cenas.map((c, n) => (
        <div key={c.id} className={styles.cartaoEtapa}>
          <header>
            <b>Cena {n + 1}</b>
            <button type="button" onClick={() => tirar(c.id)} aria-label="Tirar cena">✕</button>
          </header>
          <input value={c.nome} onChange={(e) => mudarCena(c.id, 'nome', e.target.value)} placeholder="Nome do lugar (ex.: Biblioteca da cidade)" aria-label="Nome da cena" />
          <textarea rows={3} value={c.descricao} onChange={(e) => mudarCena(c.id, 'descricao', e.target.value)} placeholder="O que os agentes veem, ouvem e sentem ao chegar" aria-label="Descrição da cena" />
          <div className={styles.linha}>
            <label className={styles.campoCurto}>
              <span>Mapa</span>
              <Seletor
                rotulo="Mapa da cena"
                valor={c.mapaId}
                placeholder="Sem mapa"
                opcoes={[{ valor: null, rotulo: 'Sem mapa' }, ...mapas.map((m) => ({ valor: m.id, rotulo: m.nome }))]}
                onMudar={(v) => mudarCena(c.id, 'mapaId', v)}
              />
            </label>
          </div>
          <EscolherFichas
            rotulo="Quem os agentes encontram aqui"
            fichas={fichas}
            escolhidas={c.fichas}
            onMudar={(ids) => mudarCena(c.id, 'fichas', ids)}
          />
        </div>
      ))}
      <button type="button" className={styles.adicionar} onClick={nova}>+ Cena</button>
    </div>
  );
}

/* ---------- 3 · Pistas ---------- */
function EtapaPistas({ d, mudar }) {
  const conta = pistasPorRevelacao(d);
  const mudarRev = (id, texto) => mudar((x) => ({ ...x, revelacoes: x.revelacoes.map((r) => (r.id === id ? { ...r, texto } : r)) }));
  const novaRev = () => mudar((x) => ({ ...x, revelacoes: [...x.revelacoes, { id: novoId(), texto: '' }] }));
  const tirarRev = (id) => mudar((x) => ({
    ...x,
    revelacoes: x.revelacoes.filter((r) => r.id !== id),
    pistas: x.pistas.map((p) => (p.revelacaoId === id ? { ...p, revelacaoId: null } : p)),
  }));
  const mudarPista = (id, k, v) => mudar((x) => ({ ...x, pistas: x.pistas.map((p) => (p.id === id ? { ...p, [k]: v } : p)) }));
  const novaPista = (revelacaoId = null) => mudar((x) => ({
    ...x,
    pistas: [...x.pistas, { id: novoId(), texto: '', cenaId: null, pericia: null, dt: '', revelacaoId }],
  }));
  const tirarPista = (id) => mudar((x) => ({ ...x, pistas: x.pistas.filter((p) => p.id !== id) }));

  const cenas = [{ valor: null, rotulo: 'Sem cena' }, ...d.cenas.map((c, n) => ({ valor: c.id, rotulo: c.nome || `Cena ${n + 1}` }))];
  const pericias = [{ valor: null, rotulo: 'Sem teste' }, ...PERICIAS.map((p) => ({ valor: p.id, rotulo: p.nome }))];
  const revelacoes = [{ valor: null, rotulo: 'Nenhuma' }, ...d.revelacoes.map((r, n) => ({ valor: r.id, rotulo: r.texto || `Revelação ${n + 1}` }))];

  return (
    <div className={styles.campos}>
      <h3 className={styles.subtitulo}>Revelações <small>o que os agentes precisam descobrir</small></h3>
      {d.revelacoes.map((r, n) => (
        <div key={r.id} className={styles.revelacao} data-faltando={conta[r.id] < PISTAS_POR_REVELACAO || undefined}>
          <input value={r.texto} onChange={(e) => mudarRev(r.id, e.target.value)} placeholder={`Revelação ${n + 1} (ex.: o padre é o cultista)`} aria-label={`Revelação ${n + 1}`} />
          <span className={styles.contaPistas} title="Regra das 3 pistas: cada revelação deve ter pelo menos 3 pistas">
            {Array.from({ length: PISTAS_POR_REVELACAO }, (_, k) => <i key={k} data-tem={k < conta[r.id] || undefined} />)}
            {conta[r.id]}/{PISTAS_POR_REVELACAO}
          </span>
          <button type="button" className={styles.miniBotao} onClick={() => novaPista(r.id)}>+ pista</button>
          <button type="button" onClick={() => tirarRev(r.id)} aria-label="Tirar revelação">✕</button>
        </div>
      ))}
      <button type="button" className={styles.adicionar} onClick={novaRev}>+ Revelação</button>

      <h3 className={styles.subtitulo}>Pistas</h3>
      {d.pistas.map((p, n) => (
        <div key={p.id} className={styles.cartaoEtapa}>
          <header>
            <b>Pista {n + 1}</b>
            <button type="button" onClick={() => tirarPista(p.id)} aria-label="Tirar pista">✕</button>
          </header>
          <textarea rows={2} value={p.texto} onChange={(e) => mudarPista(p.id, 'texto', e.target.value)} placeholder="O que é a pista (ex.: diário rasgado com símbolos de Sangue)" aria-label="Pista" />
          <div className={styles.linha}>
            <label className={styles.campoCurto}>
              <span>Onde</span>
              <Seletor rotulo="Cena da pista" valor={p.cenaId} placeholder="Sem cena" opcoes={cenas} onMudar={(v) => mudarPista(p.id, 'cenaId', v)} />
            </label>
            <label className={styles.campoCurto}>
              <span>Perícia para achar</span>
              <Seletor rotulo="Perícia" valor={p.pericia} placeholder="Sem teste" opcoes={pericias} onMudar={(v) => mudarPista(p.id, 'pericia', v)} />
            </label>
            <label className={styles.campoDt}>
              <span>DT</span>
              <input type="number" inputMode="numeric" min="0" value={p.dt} onChange={(e) => mudarPista(p.id, 'dt', e.target.value)} disabled={!p.pericia} aria-label="DT" />
            </label>
            <label className={styles.campoCurto}>
              <span>Leva a</span>
              <Seletor rotulo="Revelação" valor={p.revelacaoId} placeholder="Nenhuma" opcoes={revelacoes} onMudar={(v) => mudarPista(p.id, 'revelacaoId', v)} />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className={styles.adicionar} onClick={() => novaPista()}>+ Pista</button>
    </div>
  );
}

/* ---------- 4 · NPCs ---------- */
function EtapaNpcs({ d, mudar, fichas }) {
  const usadas = d.npcs.map((n) => n.fichaId);
  const livres = fichas.filter((f) => !usadas.includes(f.id));
  const mudarNpc = (id, k, v) => mudar((x) => ({ ...x, npcs: x.npcs.map((n) => (n.id === id ? { ...n, [k]: v } : n)) }));
  const tirar = (id) => mudar((x) => ({ ...x, npcs: x.npcs.filter((n) => n.id !== id) }));
  const por = Object.fromEntries(fichas.map((f) => [f.id, f]));
  return (
    <div className={styles.campos}>
      {d.npcs.map((n) => {
        const f = por[n.fichaId];
        return (
          <div key={n.id} className={styles.cartaoEtapa}>
            <header>
              <span className={styles.retrato}>{f?.imagem ? <img src={f.imagem} alt="" /> : (f?.nome ?? '?').charAt(0)}</span>
              <b>{f?.nome ?? 'Ficha apagada'}</b>
              <button type="button" onClick={() => tirar(n.id)} aria-label="Tirar NPC">✕</button>
            </header>
            <label className={styles.campo}><span>O que sabe</span>
              <textarea rows={2} value={n.sabe} onChange={(e) => mudarNpc(n.id, 'sabe', e.target.value)} />
            </label>
            <label className={styles.campo}><span>O que esconde</span>
              <textarea rows={2} value={n.esconde} onChange={(e) => mudarNpc(n.id, 'esconde', e.target.value)} />
            </label>
            <label className={styles.campo}><span>Como reage aos agentes</span>
              <input value={n.reacao} onChange={(e) => mudarNpc(n.id, 'reacao', e.target.value)} placeholder="Ex.: desconfiado; fala se ameaçado" />
            </label>
          </div>
        );
      })}
      {fichas.length === 0 ? (
        <p className={styles.vazio}>Nenhuma ficha de NPC na campanha. Crie em Fichas → <Link to="../npcs">NPCs</Link>.</p>
      ) : livres.length > 0 && (
        <label className={styles.campoCurto}>
          <span>Adicionar NPC</span>
          <Seletor
            rotulo="Adicionar NPC"
            valor={null}
            placeholder="Escolher ficha de NPC…"
            opcoes={livres.map((f) => ({ valor: f.id, rotulo: f.nome }))}
            onMudar={(id) => mudar((x) => ({ ...x, npcs: [...x.npcs, { id: novoId(), fichaId: id, sabe: '', esconde: '', reacao: '' }] }))}
          />
        </label>
      )}
    </div>
  );
}

/* ---------- 5 · Confronto ---------- */
function EtapaConfronto({ d, mudar, campanha, fichas, jogadores, nomeMissao, onErro }) {
  const c = d.confronto;
  const [livro, setLivro] = useState(null);
  const [montando, setMontando] = useState(false);
  useEffect(() => { carregarLivros().then((l) => setLivro(l.monstros)).catch(() => setLivro({})); }, []);
  const campo = (k, v) => mudar((x) => ({ ...x, confronto: { ...x.confronto, [k]: v } }));
  const monstrosDoLivro = livro ? Object.values(livro).sort((a, b) => a.nome.localeCompare(b.nome)) : [];

  async function montarCombate() {
    setMontando(true);
    try {
      let participantes = jogadores.map((f) => daFicha(f, 'agentes'));
      participantes = [...participantes, ...c.fichas.map((id) => daFicha({ id }, 'ameacas'))];
      for (const { id, qtd } of c.livro) {
        const m = livro?.[id];
        if (m) participantes = [...participantes, ...copiasDoLivro(m, Math.max(1, Number(qtd) || 1), participantes)];
      }
      const nome = c.nome.trim() || nomeMissao;
      const combate = await api.criarCombate(campanha.id, { nome, sessao_id: null, dados: { ...COMBATE_NOVO, participantes } });
      campo('combateId', combate.id);
    } catch (e) {
      onErro(`Não foi possível montar o combate: ${e.message}`);
    } finally {
      setMontando(false);
    }
  }

  return (
    <div className={styles.campos}>
      <label className={styles.campo}>
        <span>Nome do confronto</span>
        <input value={c.nome} onChange={(e) => campo('nome', e.target.value)} placeholder="Ex.: Emboscada na capela" />
      </label>
      <label className={styles.campo}>
        <span>Tática da ameaça <small>(como ela luta, quando foge)</small></span>
        <textarea rows={3} value={c.tatica} onChange={(e) => campo('tatica', e.target.value)} />
      </label>
      <EscolherFichas rotulo="Ameaças das fichas (NPCs e monstros)" fichas={fichas} escolhidas={c.fichas} onMudar={(ids) => campo('fichas', ids)} />

      <div className={styles.campo}>
        <span>Criaturas do livro</span>
        {c.livro.map((l) => (
          <div key={l.id} className={styles.criatura}>
            <b>{livro?.[l.id]?.nome ?? l.id}</b>
            <label>
              <small>Quantas</small>
              <input type="number" min="1" max="20" value={l.qtd} onChange={(e) => campo('livro', c.livro.map((x) => (x.id === l.id ? { ...x, qtd: e.target.value } : x)))} />
            </label>
            <button type="button" onClick={() => campo('livro', c.livro.filter((x) => x.id !== l.id))} aria-label="Tirar criatura">✕</button>
          </div>
        ))}
        <Seletor
          rotulo="Adicionar criatura do livro"
          valor={null}
          placeholder={livro ? 'Adicionar criatura do livro…' : 'Abrindo o bestiário…'}
          desativado={!livro}
          opcoes={monstrosDoLivro.filter((m) => !c.livro.some((l) => l.id === m.id)).map((m) => ({ valor: m.id, rotulo: m.nome, detalhe: `VD ${m.vd}` }))}
          onMudar={(id) => campo('livro', [...c.livro, { id, qtd: 1 }])}
        />
      </div>

      <div className={styles.montar}>
        {c.combateId ? (
          <>
            <span>✓ Combate montado (em preparação, com os agentes e as ameaças).</span>
            <Link to={`../combate?abrir=${c.combateId}`} className={styles.abrirCombate}>Abrir no Combate</Link>
            <button type="button" className={styles.miniBotao} onClick={montarCombate} disabled={montando}>Montar de novo</button>
          </>
        ) : (
          <button type="button" className={styles.seguir} onClick={montarCombate} disabled={montando || c.fichas.length + c.livro.length === 0}>
            {montando ? 'Montando…' : 'Montar o combate'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- 6 · Clímax ---------- */
function EtapaClimax({ d, mudar }) {
  const c = d.climax;
  const campo = (k, v) => mudar((x) => ({ ...x, climax: { ...x.climax, [k]: v } }));
  return (
    <div className={styles.campos}>
      <label className={styles.campo}>
        <span>O clímax</span>
        <textarea rows={4} value={c.texto} onChange={(e) => campo('texto', e.target.value)} placeholder="O momento final: onde, o que está em jogo, o que acontece" />
      </label>
      <div className={styles.duas}>
        <label className={styles.campo}>
          <span>Se os agentes vencem</span>
          <textarea rows={3} value={c.sucesso} onChange={(e) => campo('sucesso', e.target.value)} />
        </label>
        <label className={styles.campo}>
          <span>Se falham</span>
          <textarea rows={3} value={c.fracasso} onChange={(e) => campo('fracasso', e.target.value)} />
        </label>
      </div>
      <label className={styles.campo}>
        <span>Recompensas <small>(NEX, itens, Prestígio)</small></span>
        <input value={c.recompensas} onChange={(e) => campo('recompensas', e.target.value)} placeholder="Ex.: +5% NEX, 1 item de categoria II, +10 de Prestígio" />
      </label>
    </div>
  );
}

/* ---------- Escolher várias fichas (fichas como chips) ---------- */
function EscolherFichas({ rotulo, fichas, escolhidas, onMudar }) {
  if (!fichas.length) return <p className={styles.vazio}>{rotulo}: nenhuma ficha de NPC ou monstro na campanha ainda.</p>;
  return (
    <div className={styles.campo}>
      <span>{rotulo}</span>
      <div className={styles.chips}>
        {fichas.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={escolhidas.includes(f.id)}
            data-tipo={f.tipo}
            onClick={() => onMudar(escolhidas.includes(f.id) ? escolhidas.filter((x) => x !== f.id) : [...escolhidas, f.id])}
          >
            <span className={styles.retratoMini}>{f.imagem ? <img src={f.imagem} alt="" /> : f.nome.charAt(0)}</span>
            {f.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
