import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../../components';
import { api } from '../../../../services/api';
import { reduzirBanner } from '../../../../services/imagem';
import { formatarData, organizarSessoes, quantoFalta } from '../Sessoes/agenda';
import ResumoSessao from '../Sessoes/ResumoSessao';
import styles from './VisaoGeral.module.scss';

const STATUS = [
  { valor: 'ativa', nome: 'Ativa' },
  { valor: 'pausada', nome: 'Pausada' },
  { valor: 'encerrada', nome: 'Encerrada' },
];

/**
 * Primeira tela da campanha, vista pelo mestre e pelos jogadores:
 * banner (editável), sessões (próxima, última e anteriores) e o grupo de agentes.
 * Nada de segredo do mestre aqui.
 */
export default function VisaoGeral({ campanha, onAtualizar }) {
  const [sessoes, setSessoes] = useState(null);
  const [agentes, setAgentes] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const efeito = { ativo: true };   // ignora respostas que chegam depois de sair da página
    Promise.all([api.listarSessoes(campanha.id), api.listarFichas(campanha.id, 'jogador')])
      .then(([s, f]) => {
        if (!efeito.ativo) return;
        setSessoes(s);
        setAgentes(f);
      })
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [campanha.id]);

  return (
    <section className={styles.visao}>
      <Cabecalho campanha={campanha} onAtualizar={onAtualizar} />

      {erro && <p className="erro">{erro}</p>}

      <div className={styles.blocos}>
        <Sessoes campanha={campanha} sessoes={sessoes} />
        <Grupo agentes={agentes} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Banner + descrição, com edição na própria página                 */
/* ---------------------------------------------------------------- */
function Cabecalho({ campanha, onAtualizar }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return <EditarCampanha campanha={campanha} onFechar={() => setEditando(false)} onAtualizar={onAtualizar} />;
  }

  return (
    <header className={styles.cabecalho}>
      <div
        className={styles.banner}
        style={campanha.imagem ? { backgroundImage: `url(${campanha.imagem})` } : undefined}
      >
        <div className={styles.bannerTexto}>
          <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
          <h1 className={styles.nome}>{campanha.nome}</h1>
        </div>
        <div className={styles.bannerCanto}>
          {campanha.status && <StatusBadge status={campanha.status} />}
          <button type="button" className={styles.editar} onClick={() => setEditando(true)}>
            ✎ Editar
          </button>
        </div>
      </div>

      {campanha.descricao && <p className={styles.descricao}>{campanha.descricao}</p>}
    </header>
  );
}

function EditarCampanha({ campanha, onFechar, onAtualizar }) {
  const [rascunho, setRascunho] = useState({
    nome: campanha.nome,
    descricao: campanha.descricao ?? '',
    status: campanha.status || 'ativa',
    imagem: campanha.imagem ?? '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const mudar = (campo, valor) => setRascunho((r) => ({ ...r, [campo]: valor }));

  async function escolherImagem(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';   // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    try {
      setErro('');
      mudar('imagem', await reduzirBanner(arquivo));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!rascunho.nome.trim()) return setErro('A campanha precisa de um nome.');
    try {
      setSalvando(true);
      onAtualizar(await api.atualizarCampanha(campanha.id, { ...rascunho, nome: rascunho.nome.trim() }));
      onFechar();
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  return (
    <form className={styles.edicao} onSubmit={salvar}>
      {/* Prévia do banner: clicar troca a imagem */}
      <label
        className={styles.banner}
        style={rascunho.imagem ? { backgroundImage: `url(${rascunho.imagem})` } : undefined}
      >
        <span className={styles.trocarImagem}>{rascunho.imagem ? 'Trocar imagem' : 'Escolher imagem'}</span>
        <input type="file" accept="image/*" onChange={escolherImagem} aria-label="Imagem do banner" />
      </label>
      {rascunho.imagem && (
        <button type="button" className={styles.linkAcao} onClick={() => mudar('imagem', '')}>
          Remover imagem
        </button>
      )}

      <label className={styles.campo}>
        <span>Nome</span>
        <input value={rascunho.nome} onChange={(e) => mudar('nome', e.target.value)} maxLength={80} />
      </label>

      <label className={styles.campo}>
        <span>Descrição</span>
        <textarea
          value={rascunho.descricao}
          onChange={(e) => mudar('descricao', e.target.value)}
          rows={3}
          placeholder="Do que se trata a campanha, em poucas linhas."
        />
      </label>

      <div className={styles.campo}>
        <span id="status-campanha">Status</span>
        <div className={styles.opcoes} role="radiogroup" aria-labelledby="status-campanha">
          {STATUS.map((s) => (
            <button
              key={s.valor}
              type="button"
              role="radio"
              aria-checked={rascunho.status === s.valor}
              onClick={() => mudar('status', s.valor)}
            >
              {s.nome}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <div className={styles.botoes}>
        <button type="button" className={styles.secundario} onClick={onFechar}>Cancelar</button>
        <button type="submit" className={styles.primario} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- */
/* Sessões: próxima em destaque, resumo da última e as anteriores   */
/* ---------------------------------------------------------------- */
function Sessoes({ campanha, sessoes }) {
  const linkSessoes = `/campanha/${campanha.id}/sessoes`;

  if (!sessoes) return <Bloco titulo="Sessões"><p className={styles.aviso}>Carregando…</p></Bloco>;

  const { proxima, ultima, anteriores } = organizarSessoes(sessoes);

  if (!sessoes.length) {
    return (
      <Bloco titulo="Sessões">
        <p className={styles.aviso}>Nenhuma sessão registrada ainda.</p>
        <Link to={linkSessoes} className={styles.linkAcao}>Registrar a primeira sessão →</Link>
      </Bloco>
    );
  }

  return (
    <Bloco titulo="Sessões" acao={<Link to={linkSessoes} className={styles.linkAcao}>Gerenciar</Link>}>
      {proxima ? (
        <article className={styles.proxima}>
          <span className={styles.etiqueta}>Próxima sessão · {quantoFalta(proxima.data)}</span>
          <b>Sessão {proxima.numero}{proxima.titulo && ` · ${proxima.titulo}`}</b>
          <time dateTime={proxima.data}>{formatarData(proxima.data)}</time>
        </article>
      ) : (
        <p className={styles.semProxima}>Nenhuma sessão marcada.</p>
      )}

      {ultima && (
        <article className={styles.ultima}>
          <span className={styles.etiqueta}>Na última sessão</span>
          <b>
            Sessão {ultima.numero}{ultima.titulo && ` · ${ultima.titulo}`}
            {ultima.data && <small> · {formatarData(ultima.data)}</small>}
          </b>
          {ultima.resumo
            ? <ResumoSessao texto={ultima.resumo} previa />
            : <p className={styles.aviso}>Sem resumo.</p>}
        </article>
      )}

      {anteriores.length > 0 && (
        <div className={styles.anteriores}>
          <span className={styles.etiqueta}>Anteriores</span>
          {anteriores.map((s) => (
            <details key={s.id}>
              <summary>
                <span>Sessão {s.numero}{s.titulo && ` · ${s.titulo}`}</span>
                {s.data && <small>{formatarData(s.data)}</small>}
              </summary>
              {s.resumo
                ? <div className={styles.resumoAnterior}><ResumoSessao texto={s.resumo} previa /></div>
                : <p className={styles.aviso}>Sem resumo.</p>}
            </details>
          ))}
        </div>
      )}
    </Bloco>
  );
}

/* ---------------------------------------------------------------- */
/* Grupo de agentes: foto, nome e jogador (só para ver)              */
/* ---------------------------------------------------------------- */
function Grupo({ agentes }) {
  return (
    <Bloco titulo="Grupo de agentes" contagem={agentes?.length}>
      {!agentes && <p className={styles.aviso}>Carregando…</p>}
      {agentes?.length === 0 && <p className={styles.aviso}>Nenhum agente no grupo ainda.</p>}
      {agentes?.length > 0 && (
        <ul className={styles.grupo}>
          {agentes.map((a) => (
            <li key={a.id}>
              <span className={styles.retrato}>
                {a.imagem ? <img src={a.imagem} alt="" /> : a.nome.charAt(0)}
              </span>
              <span className={styles.quem}>
                <b>{a.nome}</b>
                <small>{a.dados?.jogador || 'Sem jogador'}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}

function Bloco({ titulo, contagem, acao, children }) {
  return (
    <section className={styles.bloco}>
      <header className={styles.topoBloco}>
        <h2>{titulo}</h2>
        {contagem > 0 && <span className={styles.contagem}>{contagem}</span>}
        {acao}
      </header>
      {children}
    </section>
  );
}
