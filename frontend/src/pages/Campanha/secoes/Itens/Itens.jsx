import { useEffect, useState } from 'react';
import Modal from '../../../../components/Modal/Modal';
import Seletor from '../../../../components/Seletor/Seletor';
import { useRolagem } from '../../../../components/Dados/rolagem';
import { api } from '../../../../services/api';
import { useAoMudar } from '../../../../services/tempoReal';
import {
  comOItem, ITEM_NOVO, itemDoLivro, semOItem, temDano, TIPOS_DE_ITEM,
} from '../../../../sistemas/ordemParanormal/itensCampanha';
import { pedidoDano } from '../../../../sistemas/ordemParanormal/rolagens';
import CartaItem from './CartaItem';
import DoLivro from './DoLivro';
import FormItem from './FormItem';
import { pedidoDeAbrir } from '../../visao';
import styles from './Itens.module.scss';

const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Itens da campanha: o catálogo do mestre em cartas. Cada carta pode ser entregue a um agente
 * (vai para o inventário dele, e para os ataques se causar dano); o catálogo guarda quem está com ela.
 */
export default function Itens({ campanha }) {
  const [itens, setItens] = useState(null);
  const [sessoes, setSessoes] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [erro, setErro] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [busca, setBusca] = useState('');
  // { modo: 'ver' | 'editar' | 'novo' | 'livro', item }
  const [janela, setJanela] = useState(null);
  const temLivro = campanha.sistema_id === 'ordem-paranormal';
  // Jogador: só vê (o servidor já manda só os liberados e os que estão com o agente dele)
  const mestre = campanha.papel === 'mestre';

  useEffect(() => {
    const efeito = { ativo: true };
    Promise.all([
      api.listarItens(campanha.id),
      api.listarSessoes(campanha.id).catch(() => []),
      api.listarFichas(campanha.id, 'jogador').catch(() => []),
    ])
      .then(([i, s, f]) => {
        if (!efeito.ativo) return;
        setItens(i);
        setSessoes(s);
        setAgentes(f);
        // ?abrir=7 (vindo de um pino do mapa): abre a carta desse item
        const pedido = pedidoDeAbrir();
        const alvo = i.find((x) => x.id === pedido);
        if (alvo) setJanela({ modo: 'ver', item: alvo });
      })
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [campanha.id]);

  // Tempo real: item novo, liberado ou entregue a um agente (espera fechar a carta aberta)
  useAoMudar(campanha.id, ['itens', 'fichas'], (eventos) => {
    const tudo = eventos.some((e) => e.tabela === '*');
    if (tudo || eventos.some((e) => e.tabela === 'itens')) api.listarItens(campanha.id).then(setItens).catch(() => {});
    if (tudo || eventos.some((e) => e.tabela === 'fichas')) api.listarFichas(campanha.id, 'jogador').then(setAgentes).catch(() => {});
  });

  const fechar = () => setJanela(null);

  async function salvar(item) {
    const salvo = item.id ? await api.atualizarItem(item.id, item) : await api.criarItem(campanha.id, item);
    setItens((lista) => (item.id ? lista.map((i) => (i.id === salvo.id ? salvo : i)) : [salvo, ...lista]));
    return salvo;
  }

  // Tira o item da ficha de quem está com ele (se a ficha ainda existir)
  async function tirarDoDono(dono) {
    try {
      const ficha = await api.buscarFicha(dono.fichaId);
      await api.atualizarFicha(ficha.id, { dados: semOItem(ficha.dados, dono) });
    } catch {
      // ficha apagada: nada a tirar
    }
  }

  async function entregar(item, fichaId) {
    try {
      setErro('');
      if (item.dados.dono) await tirarDoDono(item.dados.dono);
      const ficha = await api.buscarFicha(fichaId);
      const { mudancas, dono } = comOItem(ficha.dados, item, ficha);
      await api.atualizarFicha(ficha.id, { dados: mudancas });
      const salvo = await salvar({ ...item, dados: { ...item.dados, dono } });
      setJanela({ modo: 'ver', item: salvo });
    } catch (e) {
      setErro(e.message);
    }
  }

  async function recolher(item) {
    try {
      setErro('');
      await tirarDoDono(item.dados.dono);
      const salvo = await salvar({ ...item, dados: { ...item.dados, dono: null } });
      setJanela({ modo: 'ver', item: salvo });
    } catch (e) {
      setErro(e.message);
    }
  }

  async function excluir(item) {
    const aviso = item.dados.dono ? ` A cópia que está com ${item.dados.dono.nome} continua na ficha.` : '';
    if (!window.confirm(`Apagar “${item.nome}” do catálogo?${aviso} Isso não pode ser desfeito.`)) return;
    try {
      await api.excluirItem(item.id);
      setItens((lista) => lista.filter((i) => i.id !== item.id));
      fechar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const termo = normalizar(busca.trim());
  const visiveis = (itens ?? []).filter((i) =>
    (tipo === 'todos' || i.dados.tipo === tipo) && (!termo || normalizar(i.nome).includes(termo)));
  const tiposUsados = Object.entries(TIPOS_DE_ITEM).filter(([id]) => itens?.some((i) => i.dados.tipo === id));

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Itens</h1>
        {itens && <span className={styles.contagem}>{itens.length}</span>}
        <div className={styles.acoesTopo}>
          {mestre && temLivro && (
            <button type="button" className={styles.secundario} onClick={() => setJanela({ modo: 'livro' })}>+ Do livro</button>
          )}
          {mestre && <button type="button" className={styles.novo} onClick={() => setJanela({ modo: 'novo', item: ITEM_NOVO })}>+ Novo item</button>}
        </div>
      </header>

      <p className={styles.dica}>
        {mestre
          ? <>As cartas dos itens que o grupo ganha. Abra uma carta para <b>entregar</b> a um agente (ela vai para o inventário dele) ou <b>liberar</b> para os jogadores verem.</>
          : 'Os itens que o mestre mostrou ao grupo e os que estão com o seu agente.'}
      </p>

      {erro && <p className="erro">{erro}</p>}
      {!itens && !erro && <p className={styles.dica}>Carregando…</p>}

      {itens?.length > 0 && (
        <div className={styles.barra}>
          <div className={styles.filtros} role="tablist" aria-label="Filtrar por tipo">
            <button type="button" role="tab" aria-selected={tipo === 'todos'} onClick={() => setTipo('todos')}>Todos</button>
            {tiposUsados.map(([id, nome]) => (
              <button key={id} type="button" role="tab" aria-selected={tipo === id} onClick={() => setTipo(id)}>{nome}</button>
            ))}
          </div>
          <input
            type="search"
            className={styles.busca}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item…"
            aria-label="Buscar item"
          />
        </div>
      )}

      {itens?.length === 0 && (
        <p className={styles.vazio}>Nenhum item ainda. Crie o primeiro ou traga um do livro.</p>
      )}

      <ul className={styles.cartas}>
        {visiveis.map((item) => (
          <li key={item.id}>
            <CartaItem item={item} onAbrir={() => setJanela({ modo: 'ver', item })} />
          </li>
        ))}
      </ul>

      {/* Uma janela só: trocar de "livro" para "novo" (ou "ver" para "editar") não fecha e reabre */}
      <Modal
        aberto={Boolean(janela)}
        onFechar={fechar}
        largura={{ ver: '760px', livro: '620px' }[janela?.modo] ?? '820px'}
        classeCaixa={styles.caixa}
        sobretitulo={janela?.modo === 'ver' ? 'Item da campanha' : undefined}
        titulo={{ novo: 'Novo item', editar: 'Editar item', livro: 'Trazer do livro' }[janela?.modo]}
      >
        {janela?.modo === 'ver' && (
          <DetalheItem
            item={janela.item}
            sessoes={sessoes}
            agentes={agentes}
            mestre={mestre}
            onLiberar={async () => {
              try {
                const salvo = await salvar({ ...janela.item, dados: { ...janela.item.dados, liberado: !janela.item.dados.liberado } });
                setJanela({ modo: 'ver', item: salvo });
              } catch (e) {
                setErro(e.message);
              }
            }}
            onEntregar={(fichaId) => entregar(janela.item, fichaId)}
            onRecolher={() => recolher(janela.item)}
            onEditar={() => setJanela({ modo: 'editar', item: janela.item })}
            onExcluir={() => excluir(janela.item)}
          />
        )}
        {(janela?.modo === 'novo' || janela?.modo === 'editar') && (
          <FormItem
            key={janela.item.id ?? janela.item.dados.origem ?? 'novo'}
            inicial={janela.item}
            sessoes={sessoes}
            onCancelar={fechar}
            onSalvar={async (item) => setJanela({ modo: 'ver', item: await salvar(item) })}
          />
        )}
        {janela?.modo === 'livro' && (
          <DoLivro onEscolher={(id) => setJanela({ modo: 'novo', item: itemDoLivro(id) })} />
        )}
      </Modal>
    </section>
  );
}

function DetalheItem({ item, sessoes, agentes, mestre, onLiberar, onEntregar, onRecolher, onEditar, onExcluir }) {
  const { rolar } = useRolagem();
  const [verNota, setVerNota] = useState(false);
  const [entregando, setEntregando] = useState(false);
  const { dados } = item;
  const sessao = sessoes.find((s) => s.id === dados.sessaoId);
  const dono = dados.dono;
  const opcoesAgente = agentes
    .filter((a) => a.id !== dono?.fichaId)
    .map((a) => ({ valor: String(a.id), rotulo: a.nome }));

  async function entregarA(id) {
    setEntregando(true);
    await onEntregar(Number(id));
    setEntregando(false);
  }

  return (
    <div className={styles.detalhe}>
      <CartaItem item={item} grande />

      <div className={styles.painel}>
        <h2 className={styles.nomeDetalhe}>{item.nome}</h2>

        <dl className={styles.fatos}>
          <div>
            <dt>Com quem está</dt>
            <dd>{dono ? dono.nome : 'No cofre da Ordem'}</dd>
          </div>
          <div>
            <dt>Achado em</dt>
            <dd>{sessao ? `Sessão ${sessao.numero}${sessao.titulo ? ` · ${sessao.titulo}` : ''}` : '—'}</dd>
          </div>
        </dl>

        {mestre && (
          <label className={styles.liberar}>
            <input type="checkbox" checked={Boolean(dados.liberado)} onChange={onLiberar} />
            Liberado para os jogadores verem
          </label>
        )}

        {mestre && <div className={styles.campo}>
          <span>{dono ? 'Passar para' : 'Entregar a'}</span>
          {opcoesAgente.length ? (
            <Seletor
              rotulo="Entregar a um agente"
              valor=""
              placeholder={entregando ? 'Entregando…' : 'Escolher agente…'}
              opcoes={opcoesAgente}
              desativado={entregando}
              onMudar={entregarA}
            />
          ) : (
            <small className={styles.ajuda}>{agentes.length ? 'Só há um agente, e ele já está com o item.' : 'Crie a ficha de um jogador para entregar.'}</small>
          )}
        </div>}

        <div className={styles.botoes}>
          {temDano(item) && (
            <button
              type="button"
              className={styles.primario}
              onClick={() => rolar(pedidoDano({ nome: item.nome, danos: dados.danos }, { subtitulo: 'Dano do item' }))}
            >
              Rolar dano
            </button>
          )}
          {mestre && dono && <button type="button" className={styles.secundario} onClick={onRecolher}>Recolher ao cofre</button>}
          {mestre && <button type="button" className={styles.secundario} onClick={onEditar}>Editar</button>}
          {mestre && <button type="button" className={styles.perigo} onClick={onExcluir}>Apagar</button>}
        </div>

        {mestre && dados.notaMestre && (
          <div className={styles.nota}>
            <button type="button" className={styles.secundario} onClick={() => setVerNota((v) => !v)} aria-expanded={verNota}>
              {verNota ? 'Esconder nota do mestre' : 'Nota do mestre'}
            </button>
            {verNota && <p>{dados.notaMestre}</p>}
          </div>
        )}

        {mestre && dono && (
          <small className={styles.ajuda}>
            Editar a carta não muda a cópia que já está na ficha. Para atualizar, recolha e entregue de novo.
          </small>
        )}
      </div>
    </div>
  );
}
