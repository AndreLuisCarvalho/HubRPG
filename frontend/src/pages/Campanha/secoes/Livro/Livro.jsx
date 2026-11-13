import { useDeferredValue, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { obterSistema } from '../../../../sistemas';
import Seletor from '../../../../components/Seletor/Seletor';
import styles from './Livro.module.scss';

// Busca sem acento e sem maiúsculas: "acao" acha "Ação"
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Livro do sistema: consulta rápida das regras para o mestre, com busca.
 * O conteúdo vem do sistema da campanha (resumos com a página do livro).
 */
export default function Livro({ campanha }) {
  const sistema = obterSistema(campanha.sistema_id);
  const [secoes, setSecoes] = useState(null);
  const [busca, setBusca] = useState('');
  const termo = useDeferredValue(normalizar(busca.trim()));
  // Seção aberta fica no endereço (?secao=combate): o "voltar" do navegador funciona
  const [parametros, setParametros] = useSearchParams();

  useEffect(() => {
    const efeito = { ativo: true };   // desligado ao sair da página
    sistema?.livro?.().then((s) => efeito.ativo && setSecoes(s));
    return () => { efeito.ativo = false; };
  }, [sistema]);

  if (!sistema?.livro) {
    return <p className={styles.aviso}>Este sistema ainda não tem livro de consulta.</p>;
  }
  if (!secoes) return <p className={styles.aviso}>Abrindo o livro…</p>;

  const atual = secoes.find((s) => s.id === parametros.get('secao')) ?? secoes[0];
  // Trocar de seção limpa os filtros (eles também moram no endereço)
  const abrirSecao = (id) => setParametros({ secao: id }, { replace: false });

  // Filtros da seção atual: { elemento: 'san', circulo: '2' } (vazio = todos)
  const escolhas = Object.fromEntries((atual.filtros ?? []).map((f) => [f.id, parametros.get(f.id) || null]));
  const filtrar = (id, valor) => {
    const novos = new URLSearchParams(parametros);
    if (valor) novos.set(id, valor); else novos.delete(id);
    setParametros(novos, { replace: true });
  };
  const algumFiltro = Object.values(escolhas).some(Boolean);
  const visiveis = algumFiltro ? aplicarFiltros(atual.entradas, escolhas) : atual.entradas;

  // Com busca: procura em todas as seções (nome, linha de resumo e texto)
  const resultados = termo.length >= 2
    ? secoes.flatMap((s) => s.entradas
      .filter((en) => normalizar(`${en.nome} ${en.sobre ?? ''} ${en.texto} ${en.busca ?? ''}`).includes(termo))
      .map((en) => ({ ...en, secao: s.titulo })))
    : null;

  return (
    <section className={styles.livro}>
      <header className={styles.topo}>
        <div>
          <span className={styles.sistema}>{sistema.nome}</span>
          <h1 className={styles.titulo}>Livro do sistema</h1>
        </div>
        <input
          type="search"
          className={styles.busca}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar regra, ritual, item…"
          aria-label="Buscar no livro"
        />
      </header>

      <div className={styles.area}>
        <nav className={styles.indice} aria-label="Seções do livro">
          {secoes.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={!resultados && s.id === atual.id ? 'page' : undefined}
              onClick={() => { setBusca(''); abrirSecao(s.id); }}
            >
              {s.titulo}
              <small>{s.entradas.length}</small>
            </button>
          ))}
        </nav>

        <div className={styles.conteudo}>
          {resultados ? (
            <>
              <p className={styles.contagem}>
                {resultados.length
                  ? `${resultados.length} resultado${resultados.length === 1 ? '' : 's'} para “${busca.trim()}”`
                  : `Nada encontrado para “${busca.trim()}”.`}
              </p>
              {resultados.map((en) => <Entrada key={`${en.secao}-${en.nome}`} entrada={en} secao={en.secao} aberta />)}
            </>
          ) : (
            <>
              <header className={styles.cabecalhoSecao}>
                <h2>{atual.titulo}</h2>
                <p>{atual.descricao}</p>
              </header>
              {atual.filtros && (
                <div className={styles.filtros}>
                  {atual.filtros.map((f) => (
                    <Filtro key={f.id} filtro={f} valor={escolhas[f.id]} onMudar={(v) => filtrar(f.id, v)} />
                  ))}
                  {algumFiltro && (
                    <p className={styles.contagem}>
                      {visiveis.length} de {atual.entradas.length}
                      <button type="button" className={styles.limpar} onClick={() => abrirSecao(atual.id)}>Limpar filtros</button>
                    </p>
                  )}
                </div>
              )}
              {visiveis.map((en) => <Entrada key={en.nome} entrada={en} />)}
              {algumFiltro && !visiveis.length && <p className={styles.contagem}>Nada com esses filtros.</p>}
            </>
          )}

          <p className={styles.rodape}>
            Resumos para consulta rápida, escritos com as nossas palavras. O texto completo de cada regra
            está no livro, na página indicada.
          </p>
        </div>
      </div>
    </section>
  );
}

// Fica a entrada que tem todas as tags escolhidas (sem a tag, passa); "aplicar" pode ajustá-la ou tirá-la
function aplicarFiltros(entradas, escolhas) {
  return entradas.flatMap((en) => {
    const passa = Object.entries(escolhas).every(([id, v]) => !v || !en.tags?.[id] || en.tags[id].includes(v));
    if (!passa) return [];
    if (!en.aplicar) return [en];
    const ajuste = en.aplicar(escolhas);
    return ajuste ? [{ ...en, ...ajuste }] : [];
  });
}

// Um grupo de filtro: botões quando são poucas opções, select próprio quando são muitas
function Filtro({ filtro, valor, onMudar }) {
  const { rotulo, opcoes } = filtro;
  if (opcoes.length > 8) {
    return (
      <div className={styles.filtro}>
        <span className={styles.rotuloFiltro}>{rotulo}</span>
        <Seletor
          className={styles.seletorFiltro}
          valor={valor ?? ''}
          opcoes={[{ valor: '', rotulo: 'Todas' }, ...opcoes.map((o) => ({ valor: o.valor, rotulo: o.nome }))]}
          onMudar={(v) => onMudar(v || null)}
          rotulo={rotulo}
        />
      </div>
    );
  }
  return (
    <div className={styles.filtro} role="group" aria-label={rotulo}>
      <span className={styles.rotuloFiltro}>{rotulo}</span>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          className={styles.chip}
          style={o.cor ? { '--el': o.cor } : undefined}
          aria-pressed={valor === o.valor}
          onClick={() => onMudar(valor === o.valor ? null : o.valor)}   // clicar de novo desmarca
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

// Uma regra/ritual/item. Com "sobre" (listas longas), começa fechada e abre ao clicar.
function Entrada({ entrada, secao, aberta = false }) {
  const { nome, pagina, sobre, texto, tabela, roda, elemento } = entrada;
  const corpo = (
    <>
      {texto && texto.split('\n').map((p) => <p key={p}>{p}</p>)}
      {roda && (
        // A roda de opressão: cada um oprime o seguinte, e o último volta ao primeiro
        <ol className={styles.roda} aria-label="Cada elemento oprime o seguinte">
          {[...roda, roda[0]].map((el, i) => (
            <li key={`${el.id}-${i}`}>
              {i > 0 && <span className={styles.seta} aria-hidden>›</span>}
              <span className={styles.chipElemento} style={{ '--el': el.cor }}>{el.nome}</span>
            </li>
          ))}
        </ol>
      )}
      {elemento && (
        <dl className={styles.campos}>
          {elemento.campos.map(([rotulo, valor]) => (
            <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>
          ))}
        </dl>
      )}
      {tabela && (
        <div className={styles.tabela}>
          <table>
            <thead><tr>{tabela.colunas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {tabela.linhas.map((linha) => (
                <tr key={linha.join('|')}>{linha.map((v, i) => <td key={i}>{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const titulo = (
    <span className={styles.tituloEntrada}>
      <b>{nome}</b>
      {secao && <small className={styles.daSecao}>{secao}</small>}
      {pagina && <small className={styles.pagina}>p. {pagina}</small>}
    </span>
  );

  // Elemento: cartão com a cor dele, o lema e quem ele oprime
  if (elemento) {
    return (
      <article className={`${styles.entrada} ${styles.elemento}`} style={{ '--el': elemento.cor }}>
        <header className={styles.topoElemento}>
          {titulo}
          <span className={styles.lema}>{elemento.lema}</span>
          <span className={styles.relacoes}>
            {elemento.oprime && <span>Oprime <b>{elemento.oprime}</b></span>}
            {elemento.oprimidoPor && <span>Oprimido por <b>{elemento.oprimidoPor}</b></span>}
            {!elemento.oprime && !elemento.oprimidoPor && <span>Fora da roda de opressão</span>}
          </span>
        </header>
        {corpo}
      </article>
    );
  }

  if (sobre) {
    return (
      <details className={styles.entrada} open={aberta}>
        <summary>
          {titulo}
          <span className={styles.sobre}>{sobre}</span>
        </summary>
        {corpo}
      </details>
    );
  }

  return (
    <article className={styles.entrada}>
      {titulo}
      {corpo}
    </article>
  );
}
