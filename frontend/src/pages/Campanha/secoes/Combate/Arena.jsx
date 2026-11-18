import { useEffect, useState } from 'react';
import Modal from '../../../../components/Modal/Modal';
import { definirContagem } from '../../../../sistemas/ordemParanormal/regras';
import AdicionarParticipantes from './AdicionarParticipantes';
import Gaveta from './Gaveta';
import Palco from './Palco';
import { MIRA_DA_ACAO, acoesDisponiveis, carregarLivros } from './acoesCombate';
import { condicaoPorId, venceu } from './condicoes';
import {
  comecar, estadoAproximado, inserirNaOrdem, mover, mudarPvDaCopia, mudarRecursoDaFicha, novoId,
  ordenarPorIniciativa, passarVez, remover, rolarIniciativa, verParticipante,
} from './regrasCombate';
import styles from './Combate.module.scss';

const LIMITE_LOG = 150;

/**
 * A arena: o palco (retratos dos agentes e caveiras das ameaças) e a gaveta lateral de quem foi
 * clicado, com as ações. mestre: vê os números de tudo e tem os controles. Jogadores (tela cheia):
 * ameaças só pela cor do estado, ocultos não aparecem; agem com os próprios agentes.
 */
export default function Arena({
  combate, fichas, sessao, mestre, chaveVisao, erro, onSalvar, onMudarFicha, onVoltar, onExcluir,
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [gaveta, setGaveta] = useState(null);       // id de quem está na gaveta, ou 'registro'
  const [aba, setAba] = useState(null);             // ação aberta na gaveta (atacar, ritual…)
  const [alvoIds, setAlvoIds] = useState([]);       // alvos da ação (o palco também escolhe)
  const [livro, setLivro] = useState(null);         // bestiário e rituais (chegam depois)
  // Último golpe de cada participante (anima o número saltando e a tremida)
  const [golpes, setGolpes] = useState({});
  const [queda, setQueda] = useState(0);
  const dados = combate.dados;
  const { participantes, estado } = dados;
  const preparando = estado === 'preparando';
  const andamento = estado === 'andamento';
  const encerrado = estado === 'encerrado';

  useEffect(() => {
    const vivo = { ok: true };
    carregarLivros().then((l) => vivo.ok && setLivro(l));
    return () => { vivo.ok = false; };
  }, []);

  const vistos = participantes.map((p) => ({ ...p, ver: verParticipante(p, fichas) }));
  const visiveis = mestre ? vistos : vistos.filter((p) => !p.oculto);
  const daVez = vistos.find((p) => p.id === dados.vez);

  /*
   * Registro: cada entrada é [texto do mestre, texto dos jogadores (null = não veem), tipo, carimbo]
   * carimbo: 'acerto' | 'falha' | 'critico' | 'sucesso' | 'fracasso'
   */
  const comLog = (novo, ...entradas) => ({
    ...novo,
    log: [
      ...(novo.log ?? []),
      ...entradas.filter(Boolean).map(([texto, textoJogadores = texto, tipo = 'acao', carimbo = null]) => (
        { id: novoId(), rodada: novo.rodada, tipo, texto, textoJogadores, carimbo })),
    ].slice(-LIMITE_LOG),
  });

  const salvar = (novo) => onSalvar({ dados: novo });

  /*
   * Aplica mudanças de PV/SAN/PE (efeitos: [{ id, deltas: { pv: −7, san: −2 } }]) num salvamento só,
   * mais as entradas do registro e outra mudança qualquer no combate (mudarDados).
   */
  function aplicar({ efeitos = [], entradas = [], mudarDados = (d) => d }) {
    let lista = participantes;
    const novosGolpes = {};
    let caiu = false;

    for (const { id, deltas } of efeitos) {
      const p = lista.find((x) => x.id === id);
      if (!p) continue;
      const mudancas = Object.entries(deltas).filter(([, d]) => d);
      if (!mudancas.length) continue;
      const verAntes = verParticipante(p, fichas);
      const pvAntes = verAntes.recursos.find((r) => r.id === 'pv')?.atual;
      let verDepois;

      if (p.catalogo) {
        const copia = mudancas.reduce((c, [rid, d]) => (rid === 'pv' ? mudarPvDaCopia(c, d) : c), p);
        lista = lista.map((x) => (x.id === id ? copia : x));
        verDepois = verParticipante(copia, fichas);
      } else {
        const ficha = fichas[p.fichaId];
        if (!ficha) continue;
        let atual = ficha.dados;
        let parcial = {};
        for (const [rid, d] of mudancas) {
          const mud = mudarRecursoDaFicha(atual, rid, d);
          atual = { ...atual, ...mud };
          parcial = { ...parcial, ...mud };
        }
        onMudarFicha(p.fichaId, parcial);
        verDepois = verParticipante(p, { ...fichas, [p.fichaId]: { ...ficha, dados: atual } });
      }

      const [rid, delta] = mudancas.find(([r]) => r === 'pv') ?? mudancas[0];
      const recurso = verAntes.recursos.find((r) => r.id === rid);
      const total = mudancas.reduce((s, [, d]) => s + d, 0);
      novosGolpes[id] = { chave: novoId(), delta: Math.sign(delta) * Math.abs(total), sigla: recurso?.sigla, cor: recurso?.cor };
      const pvDepois = verDepois.recursos.find((r) => r.id === 'pv')?.atual;
      if (pvAntes > 0 && pvDepois === 0) caiu = true;
    }

    salvar(comLog(mudarDados({ ...dados, participantes: lista }), ...entradas));
    if (Object.keys(novosGolpes).length) setGolpes((g) => ({ ...g, ...novosGolpes }));
    if (caiu) setQueda((q) => q + 1);
  }

  // Texto do registro para uma mudança de PV/SAN (o dos jogadores esconde os números das ameaças)
  function entradaDeRecurso(p, rid, delta, depois, detalhe = '') {
    const recurso = p.ver.recursos.find((r) => r.id === rid);
    const nome = p.ver.nome;
    const verbo = delta < 0 ? `perdeu ${-delta} ${recurso.sigla}` : `recuperou ${delta} ${recurso.sigla}`;
    const texto = `${nome} ${verbo} (${depois}/${recurso.maximo})${detalhe ? ` · ${detalhe}` : ''}.`;
    let paraJogadores = texto;
    if (p.oculto) paraJogadores = null;
    else if (p.lado === 'ameacas') {
      const aprox = estadoAproximado({ atual: depois, maximo: recurso.maximo });
      paraJogadores = delta < 0 ? `${nome} foi atingido: ${aprox.rotulo.toLowerCase()}.` : `${nome} se recuperou.`;
    }
    return [texto, paraJogadores, delta < 0 ? 'dano' : 'cura'];
  }

  // Dano/cura de um recurso (à mão ou vindo de uma ação)
  function mudarRecursos(p, deltas, detalhe = '') {
    const entradas = Object.entries(deltas).filter(([, d]) => d).map(([rid, d]) => {
      const r = p.ver.recursos.find((x) => x.id === rid);
      const atual = r?.atual ?? 0;
      // O que de fato saiu/entrou: não passa de zero (temporários gastam primeiro) nem do máximo
      const efetivo = d < 0 ? -Math.min(-d, atual + (r?.temporario ?? 0)) : Math.min(d, Math.max(0, (r?.maximo ?? 0) - atual));
      const depois = d < 0 ? Math.max(0, atual - Math.max(0, -d - (r?.temporario ?? 0))) : atual + efetivo;
      return entradaDeRecurso(p, rid, efetivo || d, depois, detalhe);
    });
    // Golpe que as resistências zeraram: registra mesmo assim
    if (!entradas.length && detalhe) {
      entradas.push([`${p.ver.nome} não sofreu dano · ${detalhe}.`, p.oculto ? null : `${p.ver.nome} não parece afetado.`, 'acao']);
    }
    return { efeitos: [{ id: p.id, deltas }], entradas };
  }

  /* ---------- Turnos ---------- */
  function iniciar() {
    const semIniciativa = participantes.filter((p) => p.iniciativa == null);
    if (semIniciativa.length && !window.confirm(`${semIniciativa.length} participante(s) sem iniciativa vão para o fim da ordem. Começar mesmo assim?`)) return;
    const novo = comecar(dados);
    const primeiro = vistos.find((p) => p.id === novo.vez);
    salvar(comLog(novo, ['O combate começou.', 'O combate começou.', 'sistema'], textoDeTurno(primeiro)));
  }

  function passar(passo) {
    let novo = passarVez(dados, fichas, passo);
    const proximo = vistos.find((p) => p.id === novo.vez);
    const entradas = [];
    if (novo.rodada !== dados.rodada && passo > 0) entradas.push([`Rodada ${novo.rodada}`, `Rodada ${novo.rodada}`, 'rodada']);

    // Condições que venceram agora (só andando para a frente)
    if (passo > 0) {
      const presentes = new Set(participantes.map((p) => p.id));
      novo = {
        ...novo,
        participantes: novo.participantes.map((p) => {
          const sairam = (p.condicoes ?? []).filter((c) => venceu(c, { vez: novo.vez, rodada: novo.rodada, presentes }));
          if (!sairam.length) return p;
          const nome = verParticipante(p, fichas).nome;
          for (const c of sairam) {
            const texto = `${nome} não está mais ${condicaoPorId(c.id)?.nome.toLowerCase() ?? c.id}.`;
            entradas.push([texto, p.oculto ? null : texto, 'sistema']);
          }
          return { ...p, condicoes: p.condicoes.filter((c) => !sairam.includes(c)) };
        }),
      };
    }

    if (passo > 0 && proximo) entradas.push(textoDeTurno(proximo));
    salvar(comLog(novo, ...entradas));
  }

  // [texto do mestre, texto dos jogadores (null se oculto), tipo]
  const textoDeTurno = (p) => (p.oculto
    ? [`Turno de ${p.ver.nome} (oculto).`, null, 'turno']
    : [`Turno de ${p.ver.nome}.`, `Turno de ${p.ver.nome}.`, 'turno']);

  function encerrar() {
    if (!window.confirm('Encerrar este combate? Ele fica salvo na lista como encerrado.')) return;
    salvar(comLog({ ...dados, estado: 'encerrado' }, ['Combate encerrado.', 'Combate encerrado.', 'sistema']));
  }

  const reabrir = () => salvar({ ...dados, estado: dados.rodada ? 'andamento' : 'preparando' });

  // Morrendo / Enlouquecendo: o mestre avança a contagem na vez do agente
  function avancarContagem(p, recursoId) {
    const contagem = p.ver.contagens?.[recursoId];
    const ficha = fichas[p.fichaId];
    if (!contagem || !ficha) return;
    const valor = Math.min(contagem.valor + 1, contagem.limite);
    onMudarFicha(p.fichaId, definirContagem(ficha.dados, contagem.id, valor));
    const fim = valor >= contagem.limite;
    const texto = fim
      ? `${p.ver.nome} ficou ${contagem.final.toLowerCase()}.`
      : `${p.ver.nome}: ${contagem.rotulo.toLowerCase()} ${valor}/${contagem.limite}.`;
    salvar(comLog(dados, [texto, p.oculto ? null : texto, 'dano', fim ? 'falha' : null]));
  }

  /* ---------- Participantes ---------- */
  function adicionar(novos) {
    setAdicionando(false);
    if (!novos.length) return;
    const lista = andamento ? inserirNaOrdem(participantes, novos) : [...participantes, ...novos];
    const nomes = novos.map((n) => verParticipante(n, fichas).nome).join(', ');
    const visiveisNovos = novos.filter((n) => !n.oculto).map((n) => verParticipante(n, fichas).nome).join(', ');
    // Na preparação só o mestre vê quem entrou (ele ainda pode esconder alguém antes de começar)
    const paraJogadores = andamento && visiveisNovos ? `Entrou na luta: ${visiveisNovos}.` : null;
    salvar(comLog({ ...dados, participantes: lista }, [`Entrou na luta: ${nomes}.`, paraJogadores, 'sistema']));
  }

  const trocar = (id, mudancas) =>
    salvar({ ...dados, participantes: participantes.map((p) => (p.id === id ? { ...p, ...mudancas } : p)) });

  function rolarAmeacas() {
    salvar({
      ...dados,
      participantes: participantes.map((p) => (p.lado === 'ameacas' && p.iniciativa == null
        ? { ...p, iniciativa: rolarIniciativa(verParticipante(p, fichas).formula) }
        : p)),
    });
  }

  function revelar(p) {
    const novo = { ...dados, participantes: participantes.map((x) => (x.id === p.id ? { ...x, oculto: !x.oculto } : x)) };
    salvar(p.oculto ? comLog(novo, [`${p.ver.nome} foi revelado.`, `${p.ver.nome} surge!`, 'sistema']) : novo);
  }

  function tirar(p) {
    if (!window.confirm(`Tirar ${p.ver.nome} do combate?`)) return;
    salvar(remover(dados, p.id, fichas));
  }

  function tirarCondicao(p, c) {
    const texto = `${p.ver.nome} não está mais ${condicaoPorId(c.id)?.nome.toLowerCase() ?? c.id}.`;
    salvar(comLog(
      { ...dados, participantes: participantes.map((x) => (x.id === p.id ? { ...x, condicoes: x.condicoes.filter((y) => y.uid !== c.uid) } : x)) },
      [texto, p.oculto ? null : texto, 'sistema'],
    ));
  }

  const reordenar = (de, para) => salvar({ ...dados, participantes: mover(participantes, de, para) });

  /* ---------- Gaveta, ações e mira ---------- */
  const podeAgirCom = (p) => andamento && (mestre || (p.lado === 'agentes' && !p.oculto));

  function abrir(p) {
    setGaveta(p.id);
    setAba(null);
    setAlvoIds([]);
  }

  function escolherAba(id) {
    setAba(id);
    const ator = vistos.find((p) => p.id === gaveta);
    if (!id || !ator) return setAlvoIds([]);
    // Alvo inicial: o primeiro inimigo de pé (atacar) ou o próprio (condição)
    const lista = mestre ? vistos : visiveis;
    const inimigo = lista.find((p) => p.lado !== ator.lado && p.id !== ator.id && !estaCaido(p));
    if (id === 'atacar') setAlvoIds(inimigo ? [inimigo.id] : []);
    else if (id === 'condicao') setAlvoIds([ator.id]);
    else setAlvoIds([]);
  }

  const mira = aba ? MIRA_DA_ACAO[aba] : null;

  // Clique no palco: durante uma ação escolhe o alvo; fora dela abre a gaveta
  function clicarNoPalco(p) {
    if (mira === 'um') return setAlvoIds([p.id]);
    if (mira === 'varios') return setAlvoIds((ids) => (ids.includes(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id]));
    if (gaveta === p.id) return fecharGaveta();
    abrir(p);
  }

  function fecharGaveta() {
    setGaveta(null);
    setAba(null);
    setAlvoIds([]);
  }

  /* ---------- Desenho ---------- */
  const log = (dados.log ?? [])
    .map((e) => ({ ...e, mostrar: mestre ? e.texto : e.textoJogadores }))
    .filter((e) => e.mostrar)
    .reverse();
  const legenda = log.find((e) => e.tipo !== 'rodada');

  let faixaVez = null;
  if (andamento && daVez) {
    faixaVez = !mestre && daVez.oculto ? 'Algo se move nas sombras…' : `Vez de ${daVez.ver.nome}`;
  }

  // Lembretes da vez: morrendo / enlouquecendo
  const lembretes = andamento && daVez?.ver.contagens
    ? ['pv', 'san'].flatMap((rid) => {
      const r = daVez.ver.recursos.find((x) => x.id === rid);
      const c = daVez.ver.contagens[rid];
      if (!r || r.atual > 0 || !c || c.valor >= c.limite) return [];
      return [{ rid, c }];
    })
    : [];

  const naGaveta = gaveta === 'registro' ? null : vistos.find((p) => p.id === gaveta && (mestre || !p.oculto));
  const gavetaAberta = gaveta === 'registro' || Boolean(naGaveta);
  const telaCheia = !mestre;

  return (
    <section className={`${styles.pagina} ${styles.arena} ${telaCheia ? styles.telaCheia : ''}`}>
      <header className={styles.topo}>
        {!telaCheia && <button type="button" className={styles.voltar} onClick={onVoltar} aria-label="Voltar para a lista de combates">← Combates</button>}
        <div className={styles.titulo}>
          <span className={styles.sobre}>{sessao ? `Sessão ${sessao.numero}${sessao.titulo ? ` · ${sessao.titulo}` : ''}` : 'Combate'}</span>
          <h1>{combate.nome}</h1>
        </div>
        <div className={styles.acoesTopo}>
          {chaveVisao}
          {mestre && !encerrado && (
            <button type="button" className={styles.secundario} onClick={() => setAdicionando(true)}>+ Participantes</button>
          )}
        </div>
      </header>

      {erro && <p className="erro">{erro}</p>}

      {/* Barra de comando: o que fazer agora */}
      <div className={styles.comando}>
        {preparando && (
          <>
            <span className={styles.rodada}>Preparando</span>
            <p>{mestre ? 'Digite a iniciativa embaixo de cada retrato e role a das ameaças.' : 'O combate vai começar…'}</p>
            {mestre && (
              <div className={styles.botoes}>
                <button type="button" className={styles.secundario} onClick={rolarAmeacas} disabled={!participantes.some((p) => p.lado === 'ameacas' && p.iniciativa == null)}>Rolar ameaças</button>
                <button type="button" className={styles.secundario} onClick={() => salvar({ ...dados, participantes: ordenarPorIniciativa(participantes) })}>Ordenar</button>
                <button type="button" className={styles.primario} onClick={iniciar} disabled={!participantes.length}>Começar combate</button>
              </div>
            )}
          </>
        )}
        {andamento && (
          <>
            <span className={styles.rodada}>Rodada {dados.rodada}</span>
            <p className={styles.vezAtual} key={dados.vez}>{faixaVez}</p>
            <div className={styles.botoes}>
              {daVez && podeAgirCom(daVez) && (
                <button type="button" className={styles.agir} onClick={() => abrir(daVez)}>Agir com {daVez.ver.nome}</button>
              )}
              {mestre && <button type="button" className={styles.secundario} onClick={() => passar(-1)} aria-label="Voltar um turno">◂</button>}
              <button type="button" className={styles.primario} onClick={() => passar(1)}>Próximo turno ▸</button>
            </div>
            {mestre && lembretes.map(({ rid, c }) => (
              <div key={rid} className={styles.lembrete}>
                <span>{daVez.ver.nome} está <b>{c.rotulo.toLowerCase()}</b> ({c.valor}/{c.limite}). Na {c.limite}ª, fica {c.final.toLowerCase()}.</span>
                <button type="button" className={styles.perigo} onClick={() => avancarContagem(daVez, rid)}>Avançar contagem</button>
              </div>
            ))}
          </>
        )}
        {encerrado && (
          <>
            <span className={styles.rodada}>Encerrado</span>
            <p>Combate encerrado{dados.rodada ? ` na rodada ${dados.rodada}` : ''}.</p>
            {mestre && (
              <div className={styles.botoes}>
                <button type="button" className={styles.secundario} onClick={reabrir}>Reabrir</button>
                <button type="button" className={styles.perigo} onClick={onExcluir}>Apagar</button>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.mesa} data-gaveta={gavetaAberta || undefined}>
        <div className={styles.areaPalco}>
          <Palco
            participantes={visiveis}
            ordem={visiveis.map((p) => p.id)}
            vez={andamento ? dados.vez : null}
            mestre={mestre}
            preparando={preparando}
            mirando={Boolean(mira)}
            alvos={alvoIds}
            selecionado={naGaveta?.id}
            golpes={golpes}
            legenda={legenda}
            onEscolher={clicarNoPalco}
            onIniciativa={(p, v) => trocar(p.id, { iniciativa: v })}
          />
          <div className={styles.rodapePalco}>
            <button type="button" className={styles.discreto} onClick={() => (gaveta === 'registro' ? fecharGaveta() : setGaveta('registro'))}>
              {gaveta === 'registro' ? 'Esconder registro' : `Registro da missão (${log.filter((e) => e.tipo !== 'rodada').length})`}
            </button>
            {mestre && andamento && <button type="button" className={styles.discreto} onClick={encerrar}>Encerrar combate</button>}
          </div>
        </div>

        {gavetaAberta && (
          <Gaveta
            key={naGaveta?.id ?? 'registro'}
            p={naGaveta}
            aba={aba}
            acoes={naGaveta ? acoesDisponiveis(naGaveta, fichas, livro, mestre) : []}
            mestre={mestre}
            preparando={preparando}
            podeAgir={naGaveta ? podeAgirCom(naGaveta) : false}
            log={log}
            painel={naGaveta && {
              ator: naGaveta,
              mestre,
              // Jogadores não miram em quem está oculto
              participantes: mestre ? vistos : visiveis,
              fichas,
              livro,
              rodada: dados.rodada || 1,
              vez: dados.vez,
              alvoIds,
              setAlvoIds,
              aplicar,
              mudarRecursos,
              onFechar: () => setAba(null),
            }}
            onAba={escolherAba}
            onFechar={fecharGaveta}
            onAjustar={(recursoId, delta) => aplicar(mudarRecursos(naGaveta, { [recursoId]: delta }))}
            onTirarCondicao={(c) => tirarCondicao(naGaveta, c)}
            onIniciativa={(v) => trocar(naGaveta.id, { iniciativa: v })}
            onRolarIniciativa={() => trocar(naGaveta.id, { iniciativa: rolarIniciativa(naGaveta.ver.formula) })}
            onMover={(passo) => {
              const i = participantes.findIndex((x) => x.id === naGaveta.id);
              reordenar(i, i + passo);
            }}
            onRevelar={() => revelar(naGaveta)}
            onTirar={() => { tirar(naGaveta); }}
          />
        )}
      </div>

      {queda > 0 && <div key={queda} className={styles.pulsoQueda} aria-hidden="true" />}

      <Modal aberto={adicionando} onFechar={() => setAdicionando(false)} largura="720px" titulo="Participantes" classeCaixa={styles.caixa}>
        {adicionando && (
          <AdicionarParticipantes
            fichas={Object.values(fichas)}
            participantes={participantes}
            onAdicionar={adicionar}
            onCancelar={() => setAdicionando(false)}
          />
        )}
      </Modal>
    </section>
  );
}

const estaCaido = (p) => {
  const pv = p.ver.recursos.find((r) => r.id === 'pv');
  return (pv?.maximo ?? 0) > 0 && pv.atual === 0;
};
