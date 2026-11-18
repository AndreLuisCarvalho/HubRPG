import { useEffect, useState } from 'react';
import Modal from '../../../../components/Modal/Modal';
import { definirContagem } from '../../../../sistemas/ordemParanormal/regras';
import AdicionarParticipantes from './AdicionarParticipantes';
import CaixaEncerrar from './CaixaEncerrar';
import Hud from './Hud';
import Inspecao from './Inspecao';
import LogCombate from './LogCombate';
import PainelAcao from './PainelAcao';
import Palco from './Palco';
import RelatorioCombate from './RelatorioCombate';
import Timeline from './Timeline';
import { montarRelatorio, relatorioPara } from './relatorio';
import { MIRA_DA_ACAO, acoesDisponiveis, carregarLivros } from './acoesCombate';
import { condicaoPorId, venceu } from './condicoes';
import {
  comecar, estadoAproximado, inserirNaOrdem, mover, mudarPvDaCopia, mudarRecursoDaFicha, novoId,
  ordenarPorIniciativa, passarVez, remover, rolarIniciativa, verParticipante,
} from './regrasCombate';
import styles from './Combate.module.scss';
import estilo from './Arena.module.scss';

const LIMITE_LOG = 150;

/**
 * A arena, numa tela só, em 4 zonas: timeline de iniciativa (topo), palco (centro), barra do turno
 * (embaixo) e registro da missão (direita). Fluxo: escolher a ação na barra → clicar no alvo no
 * palco → ver o resultado no registro e no banner.
 * mestre: vê os números de tudo e tem os controles. Jogadores (tela cheia): ameaças só pela cor do
 * estado, ocultos não aparecem; agem com os próprios agentes.
 */
export default function Arena({
  combate, fichas, sessao, mestre, chaveVisao, erro, onSalvar, onMudarFicha, onVoltar, onExcluir,
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [atorId, setAtorId] = useState(null);       // quem está na barra de turno (null = o da vez)
  const [inspecionado, setInspecionado] = useState(null);   // ficha rápida aberta no palco
  const [logAberto, setLogAberto] = useState(false);        // celular: o registro abre por cima
  const [aba, setAba] = useState(null);             // ação aberta na bandeja (atacar, ritual…)
  const [alvoIds, setAlvoIds] = useState([]);       // alvos da ação (o palco também escolhe)
  const [encerrando, setEncerrando] = useState(false);
  const [verPalco, setVerPalco] = useState(false);  // combate encerrado: relatório (padrão) ou o palco
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
   * Registro: cada entrada é [texto do mestre, texto dos jogadores (null = não veem), tipo, carimbo, dados]
   * carimbo: 'acerto' | 'falha' | 'critico' | 'sucesso' | 'fracasso'
   * dados: o que o relatório conta ({ alvo, autor, rid, valor } no dano/cura; { autor, alvo, resultado } no ataque)
   */
  const comLog = (novo, ...entradas) => ({
    ...novo,
    log: [
      ...(novo.log ?? []),
      ...entradas.filter(Boolean).map(([texto, textoJogadores = texto, tipo = 'acao', carimbo = null, extra = null]) => (
        { id: novoId(), rodada: novo.rodada, tipo, texto, textoJogadores, carimbo, ...(extra && { dados: extra }) })),
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
    const quedas = [];

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
      if (pvAntes > 0 && pvDepois === 0) {
        const nome = verAntes.nome;
        const jogadores = p.oculto ? null : `${nome} ${p.lado === 'ameacas' ? 'foi derrotado' : 'caiu'}!`;
        quedas.push([`${nome} ${p.lado === 'ameacas' ? 'foi derrotado' : 'caiu'}.`, jogadores, 'queda', 'falha', { alvo: id }]);
      }
    }

    salvar(comLog(mudarDados({ ...dados, participantes: lista }), ...entradas, ...quedas));
    if (Object.keys(novosGolpes).length) setGolpes((g) => ({ ...g, ...novosGolpes }));
    if (quedas.length) setQueda((q) => q + 1);
  }

  // Texto do registro para uma mudança de PV/SAN (o dos jogadores esconde os números das ameaças)
  function entradaDeRecurso(p, rid, delta, depois, detalhe = '', autor = null) {
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
    return [texto, paraJogadores, delta < 0 ? 'dano' : 'cura', null, { alvo: p.id, autor, rid, valor: Math.abs(delta) }];
  }

  // Dano/cura de um recurso (à mão ou vindo de uma ação; "autor" = quem causou, para o relatório)
  function mudarRecursos(p, deltas, detalhe = '', autor = null) {
    const entradas = Object.entries(deltas).filter(([, d]) => d).map(([rid, d]) => {
      const r = p.ver.recursos.find((x) => x.id === rid);
      const atual = r?.atual ?? 0;
      // O que de fato saiu/entrou: não passa de zero (temporários gastam primeiro) nem do máximo
      const efetivo = d < 0 ? -Math.min(-d, atual + (r?.temporario ?? 0)) : Math.min(d, Math.max(0, (r?.maximo ?? 0) - atual));
      const depois = d < 0 ? Math.max(0, atual - Math.max(0, -d - (r?.temporario ?? 0))) : atual + efetivo;
      return entradaDeRecurso(p, rid, efetivo || d, depois, detalhe, autor);
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
    // Turno novo: a economia de ação volta a ficar livre
    salvar(comLog({ ...novo, economia: {} }, ...entradas));
  }

  // [texto do mestre, texto dos jogadores (null se oculto), tipo]
  const textoDeTurno = (p) => (p.oculto
    ? [`Turno de ${p.ver.nome} (oculto).`, null, 'turno']
    : [`Turno de ${p.ver.nome}.`, `Turno de ${p.ver.nome}.`, 'turno']);

  /*
   * Encerrar: zera as contagens escolhidas na caixa (quem se estabilizou), tira as condições
   * (elas valem só nesta cena) e guarda o relatório da missão.
   */
  function encerrar(zerar) {
    for (const fichaId of zerar) {
      const ficha = fichas[fichaId];
      if (ficha) onMudarFicha(fichaId, { contagens: {} });
    }
    const final = comLog({ ...dados }, ['Combate encerrado.', 'Combate encerrado.', 'sistema']);
    const relatorio = montarRelatorio(final, vistos);
    salvar({
      ...final,
      estado: 'encerrado',
      participantes: final.participantes.map((p) => ({ ...p, condicoes: [] })),
      relatorio,
    });
    setEncerrando(false);
    setInspecionado(null);
    setAtorId(null);
    setAba(null);
    setVerPalco(false);
  }

  const reabrir = () => {
    const { relatorio: _relatorio, ...resto } = dados;
    salvar({ ...resto, estado: dados.rodada ? 'andamento' : 'preparando' });
  };

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

  /* ---------- Quem age, ações e mira ---------- */
  const podeAgirCom = (p) => andamento && (mestre || (p.lado === 'agentes' && !p.oculto));
  // Quem está na barra de turno: o da vez, ou outro que o mestre (ou o jogador) escolheu
  const ator = vistos.find((p) => p.id === atorId && (mestre || !p.oculto)) ?? daVez ?? null;
  const acoes = ator && podeAgirCom(ator) ? acoesDisponiveis(ator, fichas, livro) : [];

  function escolherAba(id) {
    setAba(id);
    setInspecionado(null);
    if (!id || !ator) return setAlvoIds([]);
    // Alvo inicial: o primeiro inimigo de pé (atacar) ou o próprio (item/outros)
    const lista = mestre ? vistos : visiveis;
    const inimigo = lista.find((p) => p.lado !== ator.lado && p.id !== ator.id && !estaCaido(p));
    if (id === 'atacar') setAlvoIds(inimigo ? [inimigo.id] : []);
    else if (id === 'outros') setAlvoIds([ator.id]);
    else setAlvoIds([]);
  }

  function agirCom(p) {
    setAtorId(p.id === daVez?.id ? null : p.id);
    setInspecionado(null);
    setAba(null);
    setAlvoIds([]);
  }

  const mira = aba ? MIRA_DA_ACAO[aba] : null;

  // Clique num retrato: durante uma ação escolhe o alvo; fora dela abre a ficha rápida
  function clicarNoPalco(p) {
    if (mira === 'um') return setAlvoIds([p.id]);
    if (mira === 'varios') return setAlvoIds((ids) => (ids.includes(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id]));
    setInspecionado((atual) => (atual === p.id ? null : p.id));
  }

  function fecharAcao() {
    setAba(null);
    setAlvoIds([]);
  }

  function finalizarTurno() {
    fecharAcao();
    setAtorId(null);
    setInspecionado(null);
    passar(1);
  }

  // Economia de ação: só visual, guardada no combate (todos veem) e zerada a cada turno
  const alternarEconomia = (id) => salvar({ ...dados, economia: { ...dados.economia, [id]: !dados.economia?.[id] } });

  /* ---------- Desenho ---------- */
  const log = (dados.log ?? [])
    .map((e) => ({ ...e, mostrar: mestre ? e.texto : e.textoJogadores }))
    .filter((e) => e.mostrar)
    .reverse();
  const legenda = log.find((e) => !['rodada', 'turno', 'sistema'].includes(e.tipo));

  // Lembretes da vez: morrendo / enlouquecendo
  const lembretes = andamento && ator?.ver.contagens
    ? ['pv', 'san'].flatMap((rid) => {
      const r = ator.ver.recursos.find((x) => x.id === rid);
      const c = ator.ver.contagens[rid];
      if (!r || r.atual > 0 || !c || c.valor >= c.limite) return [];
      return [{ rid, c }];
    })
    : [];

  const inspecao = vistos.find((p) => p.id === inspecionado && (mestre || !p.oculto));
  const verRelatorio = encerrado && dados.relatorio && !verPalco;
  const rotuloAcao = acoes.find((a) => a.id === aba)?.rotulo;

  return (
    <section className={`${estilo.arena} ${!mestre ? estilo.telaCheia : ''}`} aria-label={`Combate: ${combate.nome}`}>
      {/* 1 · Topo: timeline de iniciativa */}
      <header className={estilo.topo}>
        <div className={estilo.topoTitulo}>
          {mestre && <button type="button" className={estilo.voltar} onClick={onVoltar} aria-label="Voltar para a lista de combates">←</button>}
          <div>
            <small>{sessao ? `Sessão ${sessao.numero}` : 'Combate'} · {combate.nome}</small>
            <b className={estilo.rodada}>
              {preparando && 'Preparando'}
              {andamento && `Rodada ${dados.rodada}`}
              {encerrado && 'Encerrado'}
            </b>
          </div>
        </div>
        <Timeline
          participantes={visiveis}
          vez={andamento ? dados.vez : null}
          mestre={mestre}
          preparando={preparando}
          inspecionado={inspecionado}
          onEscolher={(p) => setInspecionado((atual) => (atual === p.id ? null : p.id))}
        />
        <div className={estilo.topoAcoes}>
          {chaveVisao}
          {mestre && !encerrado && (
            <button type="button" className={estilo.icone} onClick={() => setAdicionando(true)} title="Pôr participantes na luta" aria-label="Pôr participantes na luta">+</button>
          )}
          {mestre && andamento && (
            <button type="button" className={estilo.icone} onClick={() => setEncerrando(true)} title="Encerrar combate" aria-label="Encerrar combate">■</button>
          )}
          {encerrado && dados.relatorio && (
            <button type="button" className={estilo.textual} onClick={() => setVerPalco((v) => !v)}>{verPalco ? 'Relatório' : 'Palco'}</button>
          )}
          {mestre && encerrado && <button type="button" className={estilo.textual} onClick={reabrir}>Reabrir</button>}
          {mestre && encerrado && <button type="button" className={`${estilo.textual} ${estilo.perigo}`} onClick={onExcluir}>Apagar</button>}
        </div>
      </header>

      {erro && <p className={`erro ${estilo.erro}`}>{erro}</p>}

      {/* 2 · Centro: o palco (ou o relatório, depois de encerrar) */}
      <div className={estilo.centro}>
        {verRelatorio ? (
          <div className={estilo.rolagemRelatorio}>
            <RelatorioCombate relatorio={relatorioPara(dados.relatorio, mestre)} mestre={mestre} nome={combate.nome} sessao={sessao} />
          </div>
        ) : (
          <Palco
            participantes={visiveis}
            vez={andamento ? dados.vez : null}
            mestre={mestre}
            preparando={preparando}
            mirando={Boolean(mira)}
            alvos={alvoIds}
            selecionado={inspecao?.id}
            golpes={golpes}
            legenda={legenda}
            onEscolher={clicarNoPalco}
            onIniciativa={(p, v) => trocar(p.id, { iniciativa: v })}
            inspecao={inspecao && !aba && (
              <Inspecao
                key={inspecao.id}
                p={inspecao}
                mestre={mestre}
                preparando={preparando}
                podeAgir={podeAgirCom(inspecao) && inspecao.id !== ator?.id}
                onFechar={() => setInspecionado(null)}
                onAgir={() => agirCom(inspecao)}
                onAjustar={(recursoId, delta) => aplicar(mudarRecursos(inspecao, { [recursoId]: delta }))}
                onTirarCondicao={(c) => tirarCondicao(inspecao, c)}
                onIniciativa={(v) => trocar(inspecao.id, { iniciativa: v })}
                onRolarIniciativa={() => trocar(inspecao.id, { iniciativa: rolarIniciativa(inspecao.ver.formula) })}
                onMover={(passo) => {
                  const i = participantes.findIndex((x) => x.id === inspecao.id);
                  reordenar(i, i + passo);
                }}
                onRevelar={() => revelar(inspecao)}
                onTirar={() => { setInspecionado(null); tirar(inspecao); }}
              />
            )}
          />
        )}

        {/* Bandeja da ação: o passo a passo, por cima do palco (o alvo se escolhe clicando nele) */}
        {aba && ator && !verRelatorio && (
          <div className={estilo.bandeja} role="dialog" aria-label={`${rotuloAcao} com ${ator.ver.nome}`}>
            <header>
              <b>{rotuloAcao}</b>
              <small>{ator.ver.nome}{mira ? ' · clique no alvo no palco' : ''}</small>
              <button type="button" onClick={fecharAcao} aria-label="Fechar ação">✕</button>
            </header>
            <PainelAcao
              key={`${ator.id}-${aba}`}
              aba={aba}
              ator={ator}
              mestre={mestre}
              // Jogadores não miram em quem está oculto
              participantes={mestre ? vistos : visiveis}
              fichas={fichas}
              livro={livro}
              rodada={dados.rodada || 1}
              vez={dados.vez}
              alvoIds={alvoIds}
              setAlvoIds={setAlvoIds}
              aplicar={aplicar}
              mudarRecursos={mudarRecursos}
              onMudarFicha={onMudarFicha}
              onFechar={fecharAcao}
            />
          </div>
        )}
      </div>

      {/* 3 · Embaixo: a barra do turno */}
      {!encerrado && (
        <Hud
          ator={ator}
          daVez={daVez}
          mestre={mestre}
          preparando={preparando}
          acoes={acoes}
          economia={dados.economia}
          aba={aba}
          lembretes={lembretes}
          onAba={escolherAba}
          onEconomia={alternarEconomia}
          onFinalizar={finalizarTurno}
          onVoltarTurno={() => { fecharAcao(); setAtorId(null); passar(-1); }}
          onVoltarParaVez={() => agirCom(daVez)}
          onAvancarContagem={(rid) => avancarContagem(ator, rid)}
          podeRolarAmeacas={participantes.some((p) => p.lado === 'ameacas' && p.iniciativa == null)}
          onRolarAmeacas={rolarAmeacas}
          onOrdenar={() => salvar({ ...dados, participantes: ordenarPorIniciativa(participantes) })}
          onComecar={iniciar}
          podeComecar={participantes.length > 0}
        />
      )}

      {/* 4 · Direita: o registro da missão */}
      <LogCombate log={log} aberto={logAberto} onAlternar={() => setLogAberto((v) => !v)} />

      <Modal aberto={encerrando} onFechar={() => setEncerrando(false)} largura="520px" sobretitulo={combate.nome} titulo="Encerrar combate">
        {encerrando && <CaixaEncerrar vistos={vistos} onEncerrar={encerrar} onCancelar={() => setEncerrando(false)} />}
      </Modal>

      {queda > 0 && <div key={queda} className={estilo.pulsoQueda} aria-hidden="true" />}

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
