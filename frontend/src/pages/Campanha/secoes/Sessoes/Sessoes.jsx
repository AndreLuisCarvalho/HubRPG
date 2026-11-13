import { useEffect, useState } from 'react';
import { api } from '../../../../services/api';
import { formatarData, organizarSessoes, quantoFalta } from './agenda';
import ResumoSessao from './ResumoSessao';
import styles from './Sessoes.module.scss';

const VAZIA = { titulo: '', dia: '', hora: '', resumo: '', notas_mestre: '' };

// "2026-11-20T20:00" ⇄ { dia: '2026-11-20', hora: '20:00' }
const separar = (data = '') => ({ dia: data.slice(0, 10), hora: data.includes('T') ? data.slice(11, 16) : '' });
const juntar = ({ dia, hora }) => (dia ? (hora ? `${dia}T${hora}` : dia) : '');

/**
 * Registro das sessões da campanha: criar, editar e apagar.
 * A Visão geral só mostra o que é feito aqui.
 */
export default function Sessoes({ campanha }) {
  const [sessoes, setSessoes] = useState(null);
  const [erro, setErro] = useState('');
  // null = nenhum formulário; 'nova' = criando; número = id da sessão em edição
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    const efeito = { ativo: true };
    api.listarSessoes(campanha.id)
      .then((s) => efeito.ativo && setSessoes(s))
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [campanha.id]);

  async function salvar(sessao, rascunho) {
    const dados = {
      titulo: rascunho.titulo.trim(),
      data: juntar(rascunho),
      resumo: rascunho.resumo.trim(),
      notas_mestre: rascunho.notas_mestre.trim(),
    };
    const salva = sessao
      ? await api.atualizarSessao(sessao.id, dados)
      : await api.criarSessao(campanha.id, dados);
    setSessoes((lista) => (sessao ? lista.map((s) => (s.id === salva.id ? salva : s)) : [...lista, salva]));
    setEditando(null);
  }

  async function excluir(sessao) {
    const nome = `Sessão ${sessao.numero}${sessao.titulo ? ` (${sessao.titulo})` : ''}`;
    if (!window.confirm(`Apagar a ${nome}? Isso não pode ser desfeito.`)) return;
    try {
      await api.excluirSessao(sessao.id);
      setSessoes((lista) => lista.filter((s) => s.id !== sessao.id));
    } catch (e) {
      setErro(e.message);
    }
  }

  // Marcadas primeiro (da mais próxima), depois as jogadas (da mais recente)
  const { futuras = [] } = sessoes ? organizarSessoes(sessoes) : {};
  const ordenadas = sessoes
    ? [...futuras, ...sessoes.filter((s) => !futuras.includes(s)).sort((a, b) => b.numero - a.numero)]
    : [];

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Sessões</h1>
        {sessoes && <span className={styles.contagem}>{sessoes.length}</span>}
        {editando !== 'nova' && (
          <button type="button" className={styles.nova} onClick={() => setEditando('nova')}>+ Nova sessão</button>
        )}
      </header>

      <p className={styles.dica}>
        Marque a data para a sessão aparecer como <b>próxima</b> na Visão geral. Depois de jogar,
        escreva o resumo: ele vira o “na última sessão”.
      </p>

      {erro && <p className="erro">{erro}</p>}
      {!sessoes && !erro && <p className={styles.dica}>Carregando…</p>}

      {editando === 'nova' && (
        <FormSessao
          titulo={`Sessão ${(Math.max(0, ...(sessoes ?? []).map((s) => s.numero)) || 0) + 1}`}
          onSalvar={(r) => salvar(null, r)}
          onCancelar={() => setEditando(null)}
        />
      )}

      {sessoes?.length === 0 && editando !== 'nova' && (
        <p className={styles.vazio}>Nenhuma sessão ainda. Comece pela primeira.</p>
      )}

      <ul className={styles.lista}>
        {ordenadas.map((s) => (
          <li key={s.id}>
            {editando === s.id ? (
              <FormSessao
                titulo={`Sessão ${s.numero}`}
                inicial={{ titulo: s.titulo ?? '', resumo: s.resumo ?? '', notas_mestre: s.notas_mestre ?? '', ...separar(s.data ?? '') }}
                onSalvar={(r) => salvar(s, r)}
                onCancelar={() => setEditando(null)}
              />
            ) : (
              <CartaoSessao sessao={s} marcada={futuras.includes(s)} onEditar={() => setEditando(s.id)} onExcluir={() => excluir(s)} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CartaoSessao({ sessao, marcada, onEditar, onExcluir }) {
  const [verNotas, setVerNotas] = useState(false);

  return (
    <article className={`${styles.cartao} ${marcada ? styles.marcada : ''}`}>
      <header>
        <span className={styles.numero}>Sessão {sessao.numero}</span>
        {marcada && <span className={styles.selo}>Marcada · {quantoFalta(sessao.data)}</span>}
      </header>
      {sessao.titulo && <b className={styles.tituloSessao}>{sessao.titulo}</b>}
      {sessao.data && <time dateTime={sessao.data}>{formatarData(sessao.data)}</time>}
      {sessao.resumo
        ? <ResumoSessao texto={sessao.resumo} previa />
        : !marcada && <p className={styles.semResumo}>Sem resumo ainda.</p>}

      {/* Escondidas por padrão: não é sigilo de verdade (ainda não há login), só discrição */}
      {sessao.notas_mestre && verNotas && (
        <div className={styles.notasMestre}>
          <span className={styles.numero}>Notas do mestre</span>
          <ResumoSessao texto={sessao.notas_mestre} />
        </div>
      )}

      <div className={styles.acoes}>
        {sessao.notas_mestre && (
          <button type="button" onClick={() => setVerNotas((v) => !v)} aria-expanded={verNotas}>
            {verNotas ? 'Esconder notas do mestre' : 'Notas do mestre'}
          </button>
        )}
        <button type="button" onClick={onEditar}>Editar</button>
        <button type="button" className={styles.perigo} onClick={onExcluir}>Apagar</button>
      </div>
    </article>
  );
}

function FormSessao({ titulo, inicial = VAZIA, onSalvar, onCancelar }) {
  const [rascunho, setRascunho] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const mudar = (campo, valor) => setRascunho((r) => ({ ...r, [campo]: valor }));

  async function enviar(e) {
    e.preventDefault();
    try {
      setSalvando(true);
      setErro('');
      await onSalvar(rascunho);
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <span className={styles.numero}>{titulo}</span>

      <label className={styles.campo}>
        <span>Título</span>
        <input value={rascunho.titulo} onChange={(e) => mudar('titulo', e.target.value)} placeholder="Ex.: O hospital abandonado" maxLength={80} />
      </label>

      <div className={styles.linha}>
        <label className={styles.campo}>
          <span>Data</span>
          <input type="date" value={rascunho.dia} onChange={(e) => mudar('dia', e.target.value)} />
        </label>
        <label className={styles.campo}>
          <span>Hora (opcional)</span>
          <input type="time" value={rascunho.hora} onChange={(e) => mudar('hora', e.target.value)} disabled={!rascunho.dia} />
        </label>
      </div>

      <label className={styles.campo}>
        <span>Resumo</span>
        <textarea
          value={rascunho.resumo}
          onChange={(e) => mudar('resumo', e.target.value)}
          rows={5}
          placeholder={'O que aconteceu, para todos lerem. Dica de formato:\n1. Título de um tópico\nTermo: explicação\n- item de lista'}
        />
        <small className={styles.ajuda}>
          Linhas como “1. O Gancho” viram tópicos que abrem e fecham; “Termo: explicação” fica em destaque;
          linhas com “-” viram lista.
        </small>
      </label>

      <label className={styles.campo}>
        <span>Notas do mestre</span>
        <textarea
          value={rascunho.notas_mestre}
          onChange={(e) => mudar('notas_mestre', e.target.value)}
          rows={4}
          placeholder="Mecânicas, segredos, o que os jogadores ainda não sabem… Não aparece na Visão geral."
        />
      </label>

      {erro && <p className="erro">{erro}</p>}

      <div className={styles.botoes}>
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  );
}
