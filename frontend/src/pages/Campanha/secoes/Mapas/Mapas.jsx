import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '../../../../components/Modal/Modal';
import { api } from '../../../../services/api';
import { useVisao } from '../../visao';
import CartaoPino from './CartaoPino';
import FormMapa from './FormMapa';
import FormEscala from './FormEscala';
import FormNota from './FormNota';
import FormPino from './FormPino';
import FormRota from './FormRota';
import { caminhoAte, MAPA_NOVO, novaNota, novaRota, novoPino } from './regrasMapa';
import Visualizador from './Visualizador';
import styles from './Mapas.module.scss';

const semPesados = ({ imagem: _imagem, nevoa: _nevoa, ...resto }) => resto;
const comPadroes = (m) => ({ ...m, dados: { ...MAPA_NOVO.dados, ...m.dados } });

// Tamanhos do pincel da névoa (raio na tela, em px)
const PINCEIS = [{ rotulo: 'P', raio: 28 }, { rotulo: 'M', raio: 60 }, { rotulo: 'G', raio: 120 }];

/**
 * Mapas da campanha: vários mapas ligados por pinos de passagem, pinos com links para as outras abas,
 * névoa pintada pelo mestre, tokens dos agentes e rotas tracejadas.
 * Visão do mestre (edita tudo) e dos jogadores (só o revelado).
 */
export default function Mapas({ campanha }) {
  const navigate = useNavigate();
  const [busca, setBusca] = useSearchParams();
  const [mapas, setMapas] = useState(null);
  // Carregados ao abrir cada mapa: id → { imagem, nevoa } ('' = pergaminho em branco / tudo coberto)
  const [pesados, setPesados] = useState({});
  const [catalogo, setCatalogo] = useState({ sessoes: [], arquivos: [], itens: [], fichas: [] });
  const [erro, setErro] = useState('');
  const [visao, trocarVisao] = useVisao(campanha.id);
  const [ferramenta, setFerramenta] = useState('mover');
  const [pincel, setPincel] = useState(PINCEIS[1].raio);
  const [agenteEscolhido, setAgenteEscolhido] = useState(null);   // ficha a pôr no mapa
  const [rascunho, setRascunho] = useState(null);   // pontos da rota sendo desenhada
  const [selecionado, setSelecionado] = useState(null);
  const [janela, setJanela] = useState(null);   // { modo: 'mapa' | 'pino' | 'rota', ... }
  const mestre = visao === 'mestre';

  useEffect(() => {
    const efeito = { ativo: true };
    const ou = (p) => p.catch(() => []);
    Promise.all([
      api.listarMapas(campanha.id),
      ou(api.listarSessoes(campanha.id)),
      ou(api.listarArquivos(campanha.id)),
      ou(api.listarItens(campanha.id)),
      ou(api.listarFichas(campanha.id)),
    ])
      .then(([m, sessoes, arquivos, itens, fichas]) => {
        if (!efeito.ativo) return;
        setMapas(m.map(comPadroes));
        setCatalogo({ sessoes, arquivos, itens, fichas });
      })
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [campanha.id]);

  const visiveis = (mapas ?? []).filter((m) => mestre || !m.dados.oculto);
  const pedido = Number(busca.get('mapa'));
  const atual = visiveis.find((m) => m.id === pedido) ?? visiveis[0] ?? null;
  const carregado = atual ? pesados[atual.id] : undefined;

  // A imagem e a névoa só vêm ao abrir o mapa (a lista é leve)
  useEffect(() => {
    if (!atual || pesados[atual.id] !== undefined) return undefined;
    const efeito = { ativo: true };
    api.buscarMapa(atual.id)
      .then((m) => efeito.ativo && setPesados((p) => ({ ...p, [m.id]: { imagem: m.imagem ?? '', nevoa: m.nevoa ?? '' } })))
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [atual, pesados]);

  function trocarFerramenta(nova) {
    setFerramenta((f) => (f === nova ? 'mover' : nova));
    setSelecionado(null);
    if (nova !== 'rota') setRascunho(null);
    if (nova !== 'token') setAgenteEscolhido(null);
  }

  function irPara(id) {
    setSelecionado(null);
    setFerramenta('mover');
    setRascunho(null);
    setBusca({ mapa: String(id) });
  }

  /* ---------- Salvar ---------- */
  function salvarDados(mapa, dados) {
    setMapas((lista) => lista.map((m) => (m.id === mapa.id ? { ...m, dados } : m)));
    api.atualizarMapa(mapa.id, { nome: mapa.nome, dados }).catch((e) => setErro(`Não foi possível salvar: ${e.message}`));
  }

  const mudar = (campo, fn) => salvarDados(atual, { ...atual.dados, [campo]: fn(atual.dados[campo] ?? []) });
  const trocarNaLista = (lista, chave, obj) => (lista.some((x) => x[chave] === obj[chave])
    ? lista.map((x) => (x[chave] === obj[chave] ? obj : x))
    : [...lista, obj]);

  function salvarNevoa(mascara) {
    const mapa = atual;
    setPesados((p) => ({ ...p, [mapa.id]: { ...p[mapa.id], nevoa: mascara } }));
    api.atualizarMapa(mapa.id, { nome: mapa.nome, nevoa: mascara }).catch((e) => setErro(`Não foi possível salvar a névoa: ${e.message}`));
  }

  function salvarPino(pino) {
    mudar('pinos', (ps) => trocarNaLista(ps, 'id', pino));
    setJanela(null);
    setSelecionado({ tipo: 'pino', id: pino.id });
  }

  function apagarPino(pino) {
    if (!window.confirm(`Apagar o pino “${pino.nome || 'sem nome'}”?`)) return;
    mudar('pinos', (ps) => ps.filter((p) => p.id !== pino.id));
    setSelecionado(null);
  }

  function salvarRota(rota) {
    mudar('rotas', (rs) => trocarNaLista(rs, 'id', rota));
    setJanela(null);
    setRascunho(null);
    setFerramenta('mover');
  }

  function salvarNota(nota) {
    mudar('notas', (ns) => trocarNaLista(ns, 'id', nota));
    setJanela(null);
  }

  function apagarNota(nota) {
    if (!window.confirm('Apagar este post-it?')) return;
    mudar('notas', (ns) => ns.filter((n) => n.id !== nota.id));
    setJanela(null);
    setSelecionado(null);
  }

  function salvarEscala(escala) {
    salvarDados(atual, { ...atual.dados, escala });
    setJanela(null);
    setFerramenta('regua');   // já dá para medir
  }

  // Só um mapa é o "atual" (onde o grupo está): aparece na Visão geral
  function marcarAtual() {
    const ligar = !atual.dados.atual;
    for (const m of mapas) {
      if (m.id === atual.id) salvarDados(m, { ...m.dados, atual: ligar });
      else if (ligar && m.dados.atual) salvarDados(m, { ...m.dados, atual: false });
    }
  }

  function apagarRota(rota) {
    if (!window.confirm(`Apagar a rota “${rota.nome || 'sem nome'}”?`)) return;
    mudar('rotas', (rs) => rs.filter((r) => r.id !== rota.id));
    setJanela(null);
    setSelecionado(null);
  }

  // Clique no mapa com uma ferramenta de clique
  function clicarMapa(x, y) {
    if (ferramenta === 'pino') setJanela({ modo: 'pino', pino: novoPino(x, y) });
    if (ferramenta === 'rota') setRascunho((r) => [...(r ?? []), { x, y }]);
    if (ferramenta === 'texto') setJanela({ modo: 'nota', nota: novaNota(x, y) });
    if (ferramenta === 'token' && agenteEscolhido) {
      mudar('tokens', (ts) => trocarNaLista(ts, 'fichaId', { fichaId: agenteEscolhido, x, y }));
      setAgenteEscolhido(null);
      setFerramenta('mover');
    }
  }

  function mover(tipo, id, pos) {
    if (tipo === 'pino') mudar('pinos', (ps) => ps.map((p) => (p.id === id ? { ...p, ...pos } : p)));
    if (tipo === 'token') mudar('tokens', (ts) => ts.map((t) => (t.fichaId === id ? { ...t, ...pos } : t)));
    if (tipo === 'nota') mudar('notas', (ns) => ns.map((n) => (n.id === id ? { ...n, ...pos } : n)));
  }

  async function salvarMapa(mapa) {
    if (mapa.id) {
      const salvo = await api.atualizarMapa(mapa.id, mapa);
      setMapas((lista) => lista.map((m) => (m.id === salvo.id ? comPadroes(salvo) : m)));
      if (mapa.imagem !== undefined) setPesados((p) => ({ ...p, [salvo.id]: { ...p[salvo.id], imagem: mapa.imagem } }));
    } else {
      const salvo = await api.criarMapa(campanha.id, { ...mapa, imagem: mapa.imagem ?? '' });
      setMapas((lista) => [...lista, comPadroes(semPesados(salvo))]);
      setPesados((p) => ({ ...p, [salvo.id]: { imagem: salvo.imagem ?? '', nevoa: '' } }));
      irPara(salvo.id);
    }
    setJanela(null);
  }

  async function excluirMapa(mapa) {
    if (!window.confirm(`Apagar o mapa “${mapa.nome}” e tudo o que há nele? Isso não pode ser desfeito.`)) return;
    try {
      await api.excluirMapa(mapa.id);
      setMapas((lista) => lista.filter((m) => m.id !== mapa.id));
      setJanela(null);
      setBusca({});
    } catch (e) {
      setErro(e.message);
    }
  }

  /* ---------- Links dos pinos ---------- */
  const base = `/campanha/${campanha.id}`;
  function linkDe(pino) {
    const { tipo, id } = pino.link ?? {};
    if (tipo === 'mapa') {
      const m = visiveis.find((x) => x.id === id);
      return m && { rotulo: `Entrar em ${m.nome}`, abrir: () => irPara(m.id) };
    }
    if (tipo === 'arquivo') {
      const a = catalogo.arquivos.find((x) => x.id === id);
      return a && (mestre || a.dados.liberado) && { rotulo: `Abrir arquivo: ${a.titulo}`, abrir: () => navigate(`${base}/arquivos?abrir=${id}`) };
    }
    if (tipo === 'item') {
      const i = catalogo.itens.find((x) => x.id === id);
      return i && { rotulo: `Ver item: ${i.nome}`, abrir: () => navigate(`${base}/itens?abrir=${id}`) };
    }
    if (tipo === 'ficha') {
      // Ficha de NPC/monstro tem segredos: na visão dos jogadores só as fichas dos agentes
      const f = catalogo.fichas.find((x) => x.id === id);
      return f && (mestre || f.tipo === 'jogador') && { rotulo: `Abrir ficha: ${f.nome}`, abrir: () => navigate(`${base}/fichas/${id}`) };
    }
    if (tipo === 'sessao') {
      const s = catalogo.sessoes.find((x) => x.id === id);
      return s && { rotulo: `Ver Sessão ${s.numero}${s.titulo ? `: ${s.titulo}` : ''}`, abrir: () => navigate(`${base}/sessoes`) };
    }
    return null;
  }

  const TIPO_FICHA = { jogador: 'Agente', npc: 'NPC', monstro: 'Monstro' };
  const destinos = {
    mapa: (mapas ?? []).filter((m) => m.id !== atual?.id).map((m) => ({ valor: String(m.id), rotulo: m.nome, detalhe: m.dados.oculto ? 'oculto' : '' })),
    arquivo: catalogo.arquivos.map((a) => ({ valor: String(a.id), rotulo: a.titulo, detalhe: a.dados.caso })),
    item: catalogo.itens.map((i) => ({ valor: String(i.id), rotulo: i.nome })),
    ficha: catalogo.fichas.map((f) => ({ valor: String(f.id), rotulo: f.nome, detalhe: TIPO_FICHA[f.tipo] })),
    sessao: catalogo.sessoes.map((s) => ({ valor: String(s.id), rotulo: `Sessão ${s.numero}`, detalhe: s.titulo })),
  };

  /* ---------- O que vai para a tela ---------- */
  const agentes = catalogo.fichas.filter((f) => f.tipo === 'jogador');
  const pinos = atual ? atual.dados.pinos.filter((p) => mestre || !p.oculto) : [];
  const rotas = atual ? atual.dados.rotas.filter((r) => mestre || !r.oculta) : [];
  const notas = atual ? atual.dados.notas.filter((n) => mestre || !n.oculta) : [];
  const tokens = atual
    ? atual.dados.tokens.flatMap((t) => {
      const ficha = agentes.find((a) => a.id === t.fichaId);
      return ficha ? [{ id: t.fichaId, x: t.x, y: t.y, nome: ficha.nome, foto: ficha.imagem }] : [];
    })
    : [];
  const caminho = atual ? caminhoAte(atual.id, visiveis) : [];
  const usaNevoa = Boolean(atual?.dados.usarNevoa);

  function cartao(sel) {
    if (sel.tipo === 'pino') {
      const pino = atual.dados.pinos.find((p) => p.id === sel.id);
      return pino && (
        <CartaoPino
          pino={pino}
          link={linkDe(pino)}
          mestre={mestre}
          onFechar={() => setSelecionado(null)}
          onEditar={() => setJanela({ modo: 'pino', pino })}
          onAlternarOculto={() => mudar('pinos', (ps) => ps.map((p) => (p.id === pino.id ? { ...p, oculto: !p.oculto } : p)))}
          onApagar={() => apagarPino(pino)}
        />
      );
    }
    if (sel.tipo === 'token') {
      const ficha = agentes.find((a) => a.id === sel.id);
      return ficha && (
        <article className={styles.cartaoPino} style={{ '--c': 'var(--cor)' }}>
          <header>
            <span />
            <div><small>Agente</small><b>{ficha.nome}</b></div>
            <button type="button" className={styles.fecharCartao} onClick={() => setSelecionado(null)} aria-label="Fechar">✕</button>
          </header>
          <button type="button" className={styles.linkPino} onClick={() => navigate(`${base}/fichas/${ficha.id}`)}>Abrir ficha →</button>
          <footer>
            <button type="button" onClick={() => { mudar('tokens', (ts) => ts.filter((t) => t.fichaId !== ficha.id)); setSelecionado(null); }}>
              Tirar do mapa
            </button>
          </footer>
        </article>
      );
    }
    if (sel.tipo === 'nota') {
      const nota = atual.dados.notas.find((n) => n.id === sel.id);
      return nota && (
        <article className={styles.cartaoPino} style={{ '--c': nota.cor }}>
          <header>
            <span />
            <div><small>Post-it{nota.oculta ? ' · oculto' : ''}</small><b>{nota.texto.split('\n')[0]}</b></div>
            <button type="button" className={styles.fecharCartao} onClick={() => setSelecionado(null)} aria-label="Fechar">✕</button>
          </header>
          <footer>
            <button type="button" onClick={() => setJanela({ modo: 'nota', nota })}>Editar</button>
            <button type="button" onClick={() => mudar('notas', (ns) => ns.map((n) => (n.id === nota.id ? { ...n, oculta: !n.oculta } : n)))}>
              {nota.oculta ? 'Mostrar aos jogadores' : 'Ocultar'}
            </button>
            <button type="button" className={styles.perigoTexto} onClick={() => apagarNota(nota)}>Apagar</button>
          </footer>
        </article>
      );
    }
    const rota = atual.dados.rotas.find((r) => r.id === sel.id);
    return rota && (
      <article className={styles.cartaoPino} style={{ '--c': rota.cor }}>
        <header>
          <span />
          <div><small>Rota{rota.oculta ? ' · oculta' : ''}</small><b>{rota.nome || 'Sem nome'}</b></div>
          <button type="button" className={styles.fecharCartao} onClick={() => setSelecionado(null)} aria-label="Fechar">✕</button>
        </header>
        {mestre && (
          <footer>
            <button type="button" onClick={() => setJanela({ modo: 'rota', rota })}>Editar</button>
            <button type="button" onClick={() => mudar('rotas', (rs) => rs.map((r) => (r.id === rota.id ? { ...r, oculta: !r.oculta } : r)))}>
              {rota.oculta ? 'Mostrar aos jogadores' : 'Ocultar'}
            </button>
            <button type="button" className={styles.perigoTexto} onClick={() => apagarRota(rota)}>Apagar</button>
          </footer>
        )}
      </article>
    );
  }

  // Ferramentas do mestre (dentro do mapa: funcionam também em tela cheia)
  const ferramentas = mestre && (
    rascunho !== null ? (
      <>
        <span className={styles.aviso}>Clique no mapa para marcar os pontos da rota ({rascunho.length})</span>
        <button type="button" onClick={() => setRascunho((r) => r.slice(0, -1))} disabled={!rascunho.length}>Desfazer ponto</button>
        <button type="button" aria-pressed="true" disabled={rascunho.length < 2} onClick={() => setJanela({ modo: 'rota', rota: novaRota(rascunho) })}>
          Concluir rota
        </button>
        <button type="button" onClick={() => { setRascunho(null); setFerramenta('mover'); }}>Cancelar</button>
      </>
    ) : (
      <>
        <button type="button" aria-pressed={ferramenta === 'pino'} onClick={() => trocarFerramenta('pino')} title="Clique no mapa para pôr um pino">+ Pino</button>
        <button type="button" aria-pressed={ferramenta === 'rota'} onClick={() => { trocarFerramenta('rota'); setRascunho([]); }} title="Clique nos pontos do caminho">Rota</button>
        <button type="button" aria-pressed={ferramenta === 'texto'} onClick={() => trocarFerramenta('texto')} title="Clique no mapa para colar um post-it">Post-it</button>
        <button type="button" aria-pressed={ferramenta === 'escala'} onClick={() => trocarFerramenta('escala')} title="Marque dois pontos de distância conhecida">Escala</button>
        {usaNevoa && (
          <>
            <button type="button" aria-pressed={ferramenta === 'revelar'} onClick={() => trocarFerramenta('revelar')} title="Pincel que apaga a névoa">Revelar</button>
            <button type="button" aria-pressed={ferramenta === 'cobrir'} onClick={() => trocarFerramenta('cobrir')} title="Pincel que pinta a névoa de volta">Cobrir</button>
            {(ferramenta === 'revelar' || ferramenta === 'cobrir') && PINCEIS.map((p) => (
              <button key={p.rotulo} type="button" aria-pressed={pincel === p.raio} onClick={() => setPincel(p.raio)} title={`Pincel ${p.rotulo}`}>
                {p.rotulo}
              </button>
            ))}
            <button type="button" onClick={() => salvarNevoa('limpa')}>Revelar tudo</button>
            <button type="button" onClick={() => window.confirm('Cobrir o mapa inteiro de névoa?') && salvarNevoa('')}>Cobrir tudo</button>
          </>
        )}
        <button type="button" aria-pressed={Boolean(atual?.dados.atual)} onClick={marcarAtual} title="O mapa onde o grupo está aparece na Visão geral">
          {atual?.dados.atual ? '★ Mapa atual' : '☆ Mapa atual'}
        </button>
        <button type="button" onClick={() => setJanela({ modo: 'mapa', mapa: { ...atual, imagem: carregado?.imagem } })}>Editar mapa</button>
      </>
    )
  );

  // Régua: todos usam (só mostra, não salva); sem escala, só o mestre vê o botão (para lembrar de definir)
  const temEscala = Boolean(atual?.dados.escala);
  const botaoRegua = (temEscala || mestre) && (
    <button type="button" aria-pressed={ferramenta === 'regua'} onClick={() => trocarFerramenta('regua')} title="Clique ponto a ponto; duplo clique recomeça">
      Régua
    </button>
  );

  // Bandeja de agentes: escolher um e clicar no mapa
  const bandeja = mestre && agentes.length > 0 && (
    <div className={styles.bandeja} role="group" aria-label="Agentes">
      {agentes.map((a) => {
        const noMapa = atual?.dados.tokens.some((t) => t.fichaId === a.id);
        return (
          <button
            key={a.id}
            type="button"
            className={styles.agente}
            aria-pressed={agenteEscolhido === a.id}
            onClick={() => {
              const escolher = agenteEscolhido !== a.id;
              setAgenteEscolhido(escolher ? a.id : null);
              setFerramenta(escolher ? 'token' : 'mover');
              setRascunho(null);
            }}
            title={noMapa ? `${a.nome} (no mapa: clique e depois no mapa para mudar de lugar)` : `${a.nome}: clique e depois no mapa`}
          >
            {a.imagem ? <img src={a.imagem} alt="" /> : <span>{a.nome.slice(0, 1)}</span>}
            {noMapa && <i aria-hidden="true">✓</i>}
          </button>
        );
      })}
    </div>
  );

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Mapas</h1>
        <div className={styles.acoesTopo}>
          <div className={styles.visao} role="radiogroup" aria-label="Visão">
            <button type="button" role="radio" aria-checked={mestre} onClick={() => trocarVisao('mestre')}>Mestre</button>
            <button
              type="button"
              role="radio"
              aria-checked={!mestre}
              onClick={() => { trocarVisao('jogadores'); setFerramenta('mover'); setRascunho(null); setAgenteEscolhido(null); setSelecionado(null); }}
            >
              Jogadores
            </button>
          </div>
          {mestre && (
            <button type="button" className={styles.novo} onClick={() => setJanela({ modo: 'mapa', mapa: MAPA_NOVO })}>+ Novo mapa</button>
          )}
        </div>
      </header>

      {erro && <p className="erro">{erro}</p>}
      {!mapas && !erro && <p className={styles.dica}>Carregando…</p>}

      {mapas && visiveis.length === 0 && (
        <p className={styles.vazio}>
          {mestre ? 'Nenhum mapa ainda. Crie o primeiro: com uma imagem ou um pergaminho em branco.' : 'Nenhum mapa revelado ainda.'}
        </p>
      )}

      {visiveis.length > 0 && (
        <nav className={styles.mapas} aria-label="Mapas da campanha">
          {visiveis.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-current={m.id === atual?.id ? 'page' : undefined}
              className={m.dados.oculto ? styles.mapaOculto : ''}
              onClick={() => irPara(m.id)}
            >
              {m.nome}
            </button>
          ))}
        </nav>
      )}

      {atual && (
        <>
          {/* Caminho de volta: Cidade › Hospital › Porão */}
          {caminho.length > 1 && (
            <ol className={styles.caminho} aria-label="Caminho">
              {caminho.map((m) => (
                <li key={m.id}>
                  {m.id === atual.id ? <b>{m.nome}</b> : <button type="button" onClick={() => irPara(m.id)}>{m.nome}</button>}
                </li>
              ))}
            </ol>
          )}

          {ferramenta === 'regua' && (
            <p className={styles.dica}>
              {temEscala ? 'Clique ponto a ponto para medir; duplo clique recomeça.' : 'Este mapa ainda não tem escala: use “Escala” e marque dois pontos de distância conhecida.'}
            </p>
          )}
          {ferramenta === 'escala' && <p className={styles.dica}>Clique em dois pontos cuja distância você sabe (ex.: o começo e o fim de uma rua).</p>}

          {carregado === undefined ? (
            <p className={styles.dica}>Abrindo o mapa…</p>
          ) : (
            <Visualizador
              key={atual.id}
              imagem={carregado.imagem}
              pergaminho={atual.dados.pergaminho}
              mestre={mestre}
              ferramenta={ferramenta}
              pinos={pinos}
              tokens={tokens}
              rotas={rotas}
              notas={notas}
              escala={atual.dados.escala}
              onMedirEscala={(px) => setJanela({ modo: 'escala', px })}
              barra={botaoRegua}
              rascunhoRota={rascunho}
              nevoa={usaNevoa ? { ativa: true, mascara: carregado.nevoa, onMudar: salvarNevoa } : null}
              pincel={pincel}
              selecionado={selecionado}
              onSelecionar={setSelecionado}
              onClicarMapa={clicarMapa}
              onMover={mover}
              cartao={cartao}
              ferramentas={ferramentas}
              rodape={bandeja}
            />
          )}
        </>
      )}

      <Modal
        aberto={Boolean(janela)}
        onFechar={() => setJanela(null)}
        largura={janela?.modo === 'mapa' ? '600px' : '560px'}
        classeCaixa={styles.caixa}
        titulo={{
          pino: atual?.dados.pinos.some((p) => p.id === janela?.pino?.id) ? 'Editar pino' : 'Novo pino',
          rota: atual?.dados.rotas.some((r) => r.id === janela?.rota?.id) ? 'Editar rota' : 'Nova rota',
          nota: atual?.dados.notas.some((n) => n.id === janela?.nota?.id) ? 'Editar post-it' : 'Novo post-it',
          escala: 'Escala do mapa',
          mapa: janela?.mapa?.id ? 'Editar mapa' : 'Novo mapa',
        }[janela?.modo]}
      >
        {janela?.modo === 'pino' && (
          <FormPino key={janela.pino.id} inicial={janela.pino} destinos={destinos} onSalvar={salvarPino} onCancelar={() => setJanela(null)} />
        )}
        {janela?.modo === 'rota' && (
          <FormRota
            key={janela.rota.id}
            inicial={janela.rota}
            onSalvar={salvarRota}
            onCancelar={() => setJanela(null)}
            onExcluir={atual?.dados.rotas.some((r) => r.id === janela.rota.id) ? () => apagarRota(janela.rota) : undefined}
          />
        )}
        {janela?.modo === 'nota' && (
          <FormNota
            key={janela.nota.id}
            inicial={janela.nota}
            onSalvar={salvarNota}
            onCancelar={() => setJanela(null)}
            onExcluir={atual?.dados.notas.some((n) => n.id === janela.nota.id) ? () => apagarNota(janela.nota) : undefined}
          />
        )}
        {janela?.modo === 'escala' && (
          <FormEscala px={janela.px} atual={atual?.dados.escala} onSalvar={salvarEscala} onCancelar={() => setJanela(null)} />
        )}
        {janela?.modo === 'mapa' && (
          <FormMapa
            key={janela.mapa.id ?? 'novo'}
            inicial={janela.mapa}
            onSalvar={salvarMapa}
            onCancelar={() => setJanela(null)}
            onExcluir={janela.mapa.id ? () => excluirMapa(janela.mapa) : undefined}
          />
        )}
      </Modal>
    </section>
  );
}
