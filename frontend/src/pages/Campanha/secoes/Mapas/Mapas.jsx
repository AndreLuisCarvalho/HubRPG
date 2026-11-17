import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '../../../../components/Modal/Modal';
import { api } from '../../../../services/api';
import { useVisao } from '../../visao';
import CartaoPino from './CartaoPino';
import FormMapa from './FormMapa';
import FormPino from './FormPino';
import { caminhoAte, MAPA_NOVO, novoPino } from './regrasMapa';
import Visualizador from './Visualizador';
import styles from './Mapas.module.scss';

const semImagem = ({ imagem: _imagem, ...resto }) => resto;
const comPadroes = (m) => ({ ...m, dados: { ...MAPA_NOVO.dados, ...m.dados, pinos: m.dados?.pinos ?? [] } });

/**
 * Mapas da campanha: vários mapas ligados por pinos de passagem, com pinos por tipo,
 * descrição e links para as outras abas. Visão do mestre (edita tudo) e dos jogadores (só o revelado).
 */
export default function Mapas({ campanha }) {
  const navigate = useNavigate();
  const [busca, setBusca] = useSearchParams();
  const [mapas, setMapas] = useState(null);
  const [imagens, setImagens] = useState({});   // id → data URL ('' = pergaminho em branco)
  const [catalogo, setCatalogo] = useState({ sessoes: [], arquivos: [], itens: [], fichas: [] });
  const [erro, setErro] = useState('');
  const [visao, trocarVisao] = useVisao(campanha.id);
  const [ferramenta, setFerramenta] = useState('mover');
  const [pinoAberto, setPinoAberto] = useState(null);
  const [janela, setJanela] = useState(null);   // { modo: 'mapa' | 'pino', ... }
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
  const imagem = atual ? imagens[atual.id] : undefined;

  // A imagem só vem ao abrir o mapa (a lista é leve)
  useEffect(() => {
    if (!atual || imagens[atual.id] !== undefined) return undefined;
    const efeito = { ativo: true };
    api.buscarMapa(atual.id)
      .then((m) => efeito.ativo && setImagens((i) => ({ ...i, [m.id]: m.imagem ?? '' })))
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [atual, imagens]);

  function irPara(id) {
    setPinoAberto(null);
    setFerramenta('mover');
    setBusca({ mapa: String(id) });
  }

  /* ---------- Salvar ---------- */
  function salvarDados(mapa, dados) {
    setMapas((lista) => lista.map((m) => (m.id === mapa.id ? { ...m, dados } : m)));
    api.atualizarMapa(mapa.id, { nome: mapa.nome, dados }).catch((e) => setErro(`Não foi possível salvar: ${e.message}`));
  }

  const mudarPinos = (fn) => salvarDados(atual, { ...atual.dados, pinos: fn(atual.dados.pinos) });

  function salvarPino(pino) {
    mudarPinos((pinos) => (pinos.some((p) => p.id === pino.id) ? pinos.map((p) => (p.id === pino.id ? pino : p)) : [...pinos, pino]));
    setJanela(null);
    setPinoAberto(pino.id);
  }

  function apagarPino(pino) {
    if (!window.confirm(`Apagar o pino “${pino.nome || 'sem nome'}”?`)) return;
    mudarPinos((pinos) => pinos.filter((p) => p.id !== pino.id));
    setPinoAberto(null);
  }

  async function salvarMapa(mapa) {
    if (mapa.id) {
      const salvo = await api.atualizarMapa(mapa.id, mapa);
      setMapas((lista) => lista.map((m) => (m.id === salvo.id ? comPadroes(salvo) : m)));
      if (mapa.imagem !== undefined) setImagens((i) => ({ ...i, [salvo.id]: mapa.imagem }));
    } else {
      const salvo = await api.criarMapa(campanha.id, { ...mapa, imagem: mapa.imagem ?? '' });
      setMapas((lista) => [...lista, comPadroes(semImagem(salvo))]);
      setImagens((i) => ({ ...i, [salvo.id]: salvo.imagem ?? '' }));
      irPara(salvo.id);
    }
    setJanela(null);
  }

  async function excluirMapa(mapa) {
    if (!window.confirm(`Apagar o mapa “${mapa.nome}” e os pinos dele? Isso não pode ser desfeito.`)) return;
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

  const pinos = atual ? atual.dados.pinos.filter((p) => mestre || !p.oculto) : [];
  const caminho = atual ? caminhoAte(atual.id, visiveis) : [];

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Mapas</h1>
        <div className={styles.acoesTopo}>
          <div className={styles.visao} role="radiogroup" aria-label="Visão">
            <button type="button" role="radio" aria-checked={mestre} onClick={() => trocarVisao('mestre')}>Mestre</button>
            <button type="button" role="radio" aria-checked={!mestre} onClick={() => { trocarVisao('jogadores'); setFerramenta('mover'); }}>Jogadores</button>
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

          {mestre && ferramenta === 'pino' && <p className={styles.dica}>Clique no mapa onde o pino deve ficar.</p>}

          {imagem === undefined ? (
            <p className={styles.dica}>Abrindo o mapa…</p>
          ) : (
            <Visualizador
              key={atual.id}
              imagem={imagem}
              pergaminho={atual.dados.pergaminho}
              pinos={pinos}
              mestre={mestre}
              ferramenta={ferramenta}
              pinoAberto={pinoAberto}
              onAbrirPino={setPinoAberto}
              onAdicionarPino={(x, y) => setJanela({ modo: 'pino', pino: novoPino(x, y) })}
              onMoverPino={(id, pos) => mudarPinos((ps) => ps.map((p) => (p.id === id ? { ...p, ...pos } : p)))}
              cartao={(pino) => (
                <CartaoPino
                  pino={pino}
                  link={linkDe(pino)}
                  mestre={mestre}
                  onFechar={() => setPinoAberto(null)}
                  onEditar={() => setJanela({ modo: 'pino', pino })}
                  onAlternarOculto={() => mudarPinos((ps) => ps.map((p) => (p.id === pino.id ? { ...p, oculto: !p.oculto } : p)))}
                  onApagar={() => apagarPino(pino)}
                />
              )}
              barra={mestre && (
                <>
                  <button
                    type="button"
                    aria-pressed={ferramenta === 'pino'}
                    onClick={() => setFerramenta((f) => (f === 'pino' ? 'mover' : 'pino'))}
                    title="Clique no mapa para pôr um pino"
                  >
                    + Pino
                  </button>
                  <button type="button" onClick={() => setJanela({ modo: 'mapa', mapa: { ...atual, imagem } })}>Editar mapa</button>
                </>
              )}
            />
          )}
        </>
      )}

      <Modal
        aberto={Boolean(janela)}
        onFechar={() => setJanela(null)}
        largura={janela?.modo === 'pino' ? '560px' : '600px'}
        classeCaixa={styles.caixa}
        titulo={janela?.modo === 'pino'
          ? (atual?.dados.pinos.some((p) => p.id === janela.pino.id) ? 'Editar pino' : 'Novo pino')
          : (janela?.mapa?.id ? 'Editar mapa' : 'Novo mapa')}
      >
        {janela?.modo === 'pino' && (
          <FormPino key={janela.pino.id} inicial={janela.pino} destinos={destinos} onSalvar={salvarPino} onCancelar={() => setJanela(null)} />
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
