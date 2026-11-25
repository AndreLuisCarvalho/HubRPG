import { useEffect, useRef, useState } from 'react';
import Modal from '../../../../components/Modal/Modal';
import Seletor from '../../../../components/Seletor/Seletor';
import { api } from '../../../../services/api';
import { useConta } from '../../../../conta/conta';
import { useAoMudar } from '../../../../services/tempoReal';
import { pedidoDeAbrir, useVisao } from '../../visao';
import Arena from './Arena';
import { COMBATE_NOVO } from './regrasCombate';
import styles from './Combate.module.scss';

/**
 * Aba Combate: a lista de combates da campanha e, ao abrir um, a arena.
 * O combate fica salvo no servidor a cada mudança (dá para recarregar no meio da luta).
 */
export default function Combate({ campanha }) {
  const [combates, setCombates] = useState(null);
  const [fichas, setFichas] = useState({});
  const [sessoes, setSessoes] = useState([]);
  const [abertoId, setAbertoId] = useState(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');
  const [visao, trocarVisao, podeTrocarVisao] = useVisao(campanha.id);
  const { usuario } = useConta();
  const fila = useRef(Promise.resolve());
  const combatesRef = useRef(combates);
  useEffect(() => { combatesRef.current = combates; });
  const ehOrdem = campanha.sistema_id === 'ordem-paranormal';

  useEffect(() => {
    const vivo = { ok: true };
    Promise.all([
      api.listarCombates(campanha.id),
      api.listarFichasDaLuta(campanha.id),
      api.listarSessoes(campanha.id).catch(() => []),
    ])
      .then(([c, f, s]) => {
        if (!vivo.ok) return;
        setCombates(c);
        setFichas(Object.fromEntries(f.map((x) => [x.id, x])));
        setSessoes(s);
        // ?abrir=3: abre esse combate; senão, o que estiver em andamento
        const pedido = pedidoDeAbrir();
        const alvo = c.find((x) => x.id === pedido) ?? c.find((x) => x.dados.estado === 'andamento');
        if (alvo) setAbertoId(alvo.id);
      })
      .catch((e) => vivo.ok && setErro(e.message));
    return () => { vivo.ok = false; };
  }, [campanha.id]);

  // Tempo real: alguém agiu em outra tela. Recarrega na fila (depois do que esta tela ainda está salvando),
  // e o combate novo chega à arena, que anima o que mudou (golpes, quedas, vez, vitória)
  useAoMudar(campanha.id, ['combates', 'fichas', 'sessoes'], (eventos) => {
    const tabelas = new Set(eventos.map((e) => e.tabela));
    const tudo = tabelas.has('*');
    fila.current = fila.current.then(async () => {
      const [c, f, s] = await Promise.all([
        tudo || tabelas.has('combates') ? api.listarCombates(campanha.id) : null,
        tudo || tabelas.has('fichas') || tabelas.has('combates') ? api.listarFichasDaLuta(campanha.id) : null,
        tudo || tabelas.has('sessoes') ? api.listarSessoes(campanha.id).catch(() => null) : null,
      ]);
      // O mestre começou um combate agora: os jogadores que estão na lista entram nele
      const comecou = c?.find((x) => x.dados.estado === 'andamento'
        && combatesRef.current?.find((y) => y.id === x.id)?.dados.estado !== 'andamento');
      if (c) setCombates(c);
      if (f) setFichas(Object.fromEntries(f.map((x) => [x.id, x])));
      if (s) setSessoes(s);
      if (comecou && !podeTrocarVisao) setAbertoId((atual) => atual ?? comecou.id);
    }).catch(() => {});
  }, { esperar: false });

  const aberto = combates?.find((c) => c.id === abertoId);

  // Salva na hora na tela e manda ao servidor em fila (as mudanças chegam na ordem em que foram feitas)
  function salvarCombate(id, mudancas) {
    setCombates((lista) => lista.map((c) => (c.id === id ? { ...c, ...mudancas } : c)));
    fila.current = fila.current
      .then(() => api.atualizarCombate(id, mudancas))
      .catch((e) => setErro(`Não foi possível salvar o combate: ${e.message}`));
  }

  // Dano/cura numa ficha: muda na tela e grava (o servidor mescla "dados")
  function mudarFicha(fichaId, parcial) {
    setFichas((mapa) => ({ ...mapa, [fichaId]: { ...mapa[fichaId], dados: { ...mapa[fichaId].dados, ...parcial } } }));
    fila.current = fila.current
      .then(() => api.atualizarFicha(fichaId, { dados: parcial }))
      .catch((e) => setErro(`Não foi possível salvar a ficha: ${e.message}`));
  }

  async function criar(nome, sessaoId) {
    const novo = await api.criarCombate(campanha.id, { nome, sessao_id: sessaoId, dados: COMBATE_NOVO });
    setCombates((lista) => [novo, ...lista]);
    setCriando(false);
    setAbertoId(novo.id);
  }

  async function excluir(combate) {
    if (!window.confirm(`Apagar o combate “${combate.nome}”? O dano já gravado nas fichas continua.`)) return;
    try {
      await api.excluirCombate(combate.id);
      setCombates((lista) => lista.filter((c) => c.id !== combate.id));
      setAbertoId(null);
    } catch (e) {
      setErro(e.message);
    }
  }

  // O jogador não tem a chave: fica sempre na visão dos jogadores
  const chaveVisao = podeTrocarVisao && (
    <div className={styles.visao} role="radiogroup" aria-label="Visão">
      <button type="button" role="radio" aria-checked={visao === 'mestre'} onClick={() => trocarVisao('mestre')}>Mestre</button>
      <button type="button" role="radio" aria-checked={visao !== 'mestre'} onClick={() => trocarVisao('jogadores')}>Jogadores</button>
    </div>
  );

  if (!ehOrdem) {
    return (
      <section className={styles.pagina}>
        <header className={styles.topo}><h1>Combate</h1></header>
        <p className={styles.vazio}>Por enquanto a arena de combate funciona só em campanhas de Ordem Paranormal.</p>
      </section>
    );
  }

  if (aberto) {
    return (
      <Arena
        key={aberto.id}
        combate={aberto}
        fichas={fichas}
        sessao={sessoes.find((s) => s.id === aberto.sessao_id)}
        mestre={visao === 'mestre'}
        chaveVisao={chaveVisao}
        // Jogador da campanha: age só com o agente dele
        meuUsuarioId={podeTrocarVisao ? null : usuario.id}
        erro={erro}
        onSalvar={(mudancas) => salvarCombate(aberto.id, mudancas)}
        onMudarFicha={mudarFicha}
        onVoltar={() => setAbertoId(null)}
        onExcluir={() => excluir(aberto)}
      />
    );
  }

  const emAndamento = (combates ?? []).filter((c) => c.dados.estado !== 'encerrado');
  const encerrados = (combates ?? []).filter((c) => c.dados.estado === 'encerrado');
  const nomeSessao = (id) => {
    const s = sessoes.find((x) => x.id === id);
    return s ? `Sessão ${s.numero}${s.titulo ? ` · ${s.titulo}` : ''}` : 'Sem sessão';
  };

  const item = (c) => (
    <li key={c.id}>
      <button type="button" className={styles.itemCombate} onClick={() => setAbertoId(c.id)}>
        <span className={styles.selo} data-estado={c.dados.estado}>
          {{ preparando: 'Preparando', andamento: `Rodada ${c.dados.rodada}`, encerrado: 'Encerrado' }[c.dados.estado]}
        </span>
        <b>{c.nome}</b>
        <small>{nomeSessao(c.sessao_id)} · {c.dados.participantes?.length ?? 0} na luta</small>
      </button>
    </li>
  );

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Combate</h1>
        {combates && <span className={styles.contagem}>{combates.length}</span>}
        <div className={styles.acoesTopo}>
          {chaveVisao}
          {visao === 'mestre' && (
            <button type="button" className={styles.novo} onClick={() => setCriando(true)}>+ Novo combate</button>
          )}
        </div>
      </header>

      <p className={styles.dica}>
        Monte o confronto com os agentes, as fichas de ameaças e as criaturas do livro. A iniciativa decide a ordem
        dos turnos; o dano dado aqui fica gravado na ficha.
      </p>

      {erro && <p className="erro">{erro}</p>}
      {!combates && !erro && <p className={styles.dica}>Carregando…</p>}
      {combates?.length === 0 && <p className={styles.vazio}>Nenhum combate ainda. Crie o primeiro quando a ação começar.</p>}

      {emAndamento.length > 0 && <ul className={styles.listaCombates}>{emAndamento.map(item)}</ul>}
      {encerrados.length > 0 && (
        <>
          <h2 className={styles.subtitulo}>Encerrados</h2>
          <ul className={styles.listaCombates}>{encerrados.map(item)}</ul>
        </>
      )}

      <Modal aberto={criando} onFechar={() => setCriando(false)} largura="460px" titulo="Novo combate">
        {criando && <FormCombate sessoes={sessoes} onCriar={criar} onCancelar={() => setCriando(false)} />}
      </Modal>
    </section>
  );
}

function FormCombate({ sessoes, onCriar, onCancelar }) {
  const ultima = [...sessoes].sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0))[0];
  const [nome, setNome] = useState('');
  const [sessaoId, setSessaoId] = useState(ultima ? String(ultima.id) : '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(e) {
    e.preventDefault();
    if (!nome.trim()) return setErro('Dê um nome ao combate.');
    try {
      setSalvando(true);
      await onCriar(nome.trim(), sessaoId ? Number(sessaoId) : null);
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <label className={styles.campo}>
        <span>Nome</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Emboscada no galpão" maxLength={60} autoFocus />
      </label>
      <div className={styles.campo}>
        <span>Sessão</span>
        <Seletor
          rotulo="Sessão do combate"
          valor={sessaoId}
          placeholder="Sem sessão"
          opcoes={[
            { valor: '', rotulo: 'Sem sessão' },
            ...sessoes.map((s) => ({ valor: String(s.id), rotulo: `Sessão ${s.numero}${s.titulo ? ` · ${s.titulo}` : ''}` })),
          ]}
          onMudar={setSessaoId}
        />
      </div>
      {erro && <p className="erro">{erro}</p>}
      <div className={styles.botoes}>
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario} disabled={salvando}>{salvando ? 'Criando…' : 'Criar e montar'}</button>
      </div>
    </form>
  );
}
