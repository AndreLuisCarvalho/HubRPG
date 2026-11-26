import { useEffect, useRef, useState } from 'react';
import Modal from '../../../../components/Modal/Modal';
import { definirContagem } from '../../../../sistemas/ordemParanormal/regras';
import AdicionarParticipantes from './AdicionarParticipantes';
import CaixaEncerrar from './CaixaEncerrar';
import Hud from './Hud';
import Inspecao from './Inspecao';
import LogCombate from './LogCombate';
import PainelAcao from './PainelAcao';
import IconeArma from './IconeArma';
import PedidoDeReacao from './PedidoDeReacao';
import EscolherFundoDoCombate from './EscolherFundoDoCombate';
import { cenarioDe } from './cenarios';
import { pedidoVivo } from './reacao';
import OrdemLateral from './OrdemLateral';
import Palco from './Palco';
import RelatorioCombate from './RelatorioCombate';
import RolagemIniciativa from './RolagemIniciativa';
import Timeline from './Timeline';
import { montarRelatorio, relatorioPara, textoDaQueda } from './relatorio';
import { carregarLivros, cartasDaMao, miraDaCarta } from './acoesCombate';
import { condicaoPorId, venceu } from './condicoes';
import {
  agentesCaidos, ameacasDerrotadas, comecar, comoCaiu, estadoAproximado, sortearDerrota, sortearVitoria, inserirNaOrdem, mover, mudarPvDaCopia, mudarRecursoDaFicha, novoId,
  ordenarPorIniciativa, passarVez, remover, rolarIniciativaCompleta, comIniciativa, verParticipante,
} from './regrasCombate';
import styles from './Combate.module.scss';
import estilo from './Arena.module.scss';

const LIMITE_LOG = 150;

/**
 * A arena como um campo de duelo, numa tela só: timeline de iniciativa (topo), campo com as cartas
 * (ameaças em cima, agentes embaixo) e, na base, quem age com a mão de cartas de ação. O registro
 * da missão abre numa gaveta. Fluxo: jogar uma carta da mão → clicar no alvo no campo → ver o
 * golpe, o banner e o registro.
 * mestre: vê os números de tudo e tem os controles. Jogadores (tela cheia): ameaças só pela cor do
 * estado, ocultos não aparecem; agem com os próprios agentes.
 */
export default function Arena({
  combate, fichas, sessao, mestre, chaveVisao, erro, onSalvar, onMudarFicha, onVoltar, onExcluir, meuUsuarioId = null,
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [escolhendoFundo, setEscolhendoFundo] = useState(false);
  const [atorId, setAtorId] = useState(null);       // quem está na barra de turno (null = o da vez)
  const [inspecionado, setInspecionado] = useState(null);   // ficha rápida aberta no palco
  const [logAberto, setLogAberto] = useState(false);        // gaveta do registro
  const [carta, setCarta] = useState(null);         // carta da mão em jogo ({ id, aba, escolha… })
  const [anuncio, setAnuncio] = useState(null);     // faixa de turno / abertura cruzando a tela
  const [dadosIniciativa, setDadosIniciativa] = useState(null);   // jogadores: dados rolando na abertura
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
  const aba = carta?.aba ?? null;

  // Faixa de turno: cruza a tela quando a vez muda; "Combate!" quando a luta começa
  const antes = useRef({ estado, vez: dados.vez, rodada: dados.rodada });
  const nomeDaVez = daVez && (mestre || !daVez.oculto) ? daVez.ver.nome : null;
  const ladoDaVez = daVez?.lado;
  useEffect(() => {
    const a = antes.current;
    antes.current = { estado, vez: dados.vez, rodada: dados.rodada };
    if (estado !== 'andamento' || (a.estado === estado && a.vez === dados.vez)) return;
    const abertura = a.estado === 'preparando';
    const rodadaNova = !abertura && a.rodada !== dados.rodada;
    if (!nomeDaVez && !abertura && !rodadaNova) return;
    const faixa = {
      chave: novoId(),
      titulo: abertura ? 'Combate!' : rodadaNova ? `Rodada ${dados.rodada}` : null,
      nome: nomeDaVez,
      lado: ladoDaVez,
    };
    // Abertura: a tela dos Jogadores ainda vai ver os dados de iniciativa rolando (o mestre vai direto)
    // (chave própria: os dois ficam lado a lado na arena e não podem ter a mesma)
    if (abertura) setDadosIniciativa({ chave: novoId(), depois: faixa });
    if (!abertura || mestre) setAnuncio(faixa);
  }, [estado, dados.vez, dados.rodada, nomeDaVez, ladoDaVez, mestre]);

  // Os dados aparecem quando a visão está em Jogadores (na hora, ou quando o mestre trocar para ela)
  const verDadosIniciativa = Boolean(dadosIniciativa && !mestre && andamento);
  function fimDosDados() {
    if (dadosIniciativa) setAnuncio({ ...dadosIniciativa.depois, chave: novoId() });
    setDadosIniciativa(null);
  }

  // Vitória ou derrota: o carimbo bate na tela de todos; depois o mestre recebe a caixa de encerrar
  // (o desfecho que já estava salvo ao abrir a arena não carimba de novo)
  const desfecho = dados.vitoria
    ? { ...dados.vitoria, derrota: false }
    : dados.derrota ? { ...dados.derrota, derrota: true } : null;
  const desfechoId = desfecho?.id ?? null;
  const [carimboVisto, setCarimboVisto] = useState(desfechoId);
  const carimbo = andamento && desfechoId && desfechoId !== carimboVisto ? desfecho : null;
  const caixaAberta = useRef(desfechoId);
  useEffect(() => {
    if (!mestre || !andamento || !desfechoId || caixaAberta.current === desfechoId) return undefined;
    const espera = setTimeout(() => {
      caixaAberta.current = desfechoId;
      setEncerrando(true);
    }, desfecho?.derrota ? 5200 : 2600);   // a derrota fica mais tempo: tem a lista dos caídos
    return () => clearTimeout(espera);
  }, [desfechoId, desfecho?.derrota, mestre, andamento]);

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

  // Entradas do registro que esta tela já conhece (as que ela mesma fez ou que já estavam ao abrir)
  const logVisto = useRef(new Set((dados.log ?? []).map((e) => e.id)));
  const salvar = (novo) => {
    (novo.log ?? []).forEach((e) => logVisto.current.add(e.id));
    onSalvar({ dados: novo });
  };

  // Tempo real: o que chegou de outra tela (dano, cura, queda) anima aqui também
  useEffect(() => {
    const novas = (dados.log ?? []).filter((e) => !logVisto.current.has(e.id));
    if (!novas.length) return;
    novas.forEach((e) => logVisto.current.add(e.id));
    const remotos = {};
    for (const e of novas) {
      if (!['dano', 'cura'].includes(e.tipo) || !e.dados?.alvo) continue;
      const p = participantes.find((x) => x.id === e.dados.alvo);
      if (!p || (!mestre && p.oculto)) continue;
      const recurso = verParticipante(p, fichas).recursos.find((r) => r.id === e.dados.rid);
      const delta = (e.tipo === 'dano' ? -1 : 1) * (e.dados.valor ?? 0);
      remotos[p.id] = { chave: novoId(), delta: (remotos[p.id]?.delta ?? 0) + delta, sigla: recurso?.sigla, cor: recurso?.cor };
    }
    const caiu = novas.some((e) => e.tipo === 'queda');
    if (!Object.keys(remotos).length && !caiu) return;
    // No próximo quadro (a arena já desenhou o combate novo; daí os números saltam)
    requestAnimationFrame(() => {
      if (Object.keys(remotos).length) setGolpes((g) => ({ ...g, ...remotos }));
      if (caiu) setQueda((q) => q + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só ao registro novo
  }, [dados.log]);

  /*
   * Aplica mudanças de PV/SAN/PE (efeitos: [{ id, deltas: { pv: −7, san: −2 } }]) num salvamento só,
   * mais as entradas do registro e outra mudança qualquer no combate (mudarDados).
   */
  function aplicar({ efeitos = [], entradas = [], mudarDados = (d) => d }) {
    let lista = participantes;
    let fichasDepois = fichas;
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
        fichasDepois = { ...fichasDepois, [p.fichaId]: { ...ficha, dados: atual } };
        verDepois = verParticipante(p, fichasDepois);
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

    // Vitória: a última ameaça caiu (ou, se alguém voltou a ficar de pé, o carimbo sai)
    let novo = mudarDados({ ...dados, participantes: lista });
    const fim = [];
    if (andamento) {
      const vistosDepois = novo.participantes.map((p) => ({ ...p, ver: verParticipante(p, fichasDepois) }));
      const venceu = ameacasDerrotadas(vistosDepois);
      if (venceu && !novo.vitoria) {
        const palavra = sortearVitoria();
        novo = { ...novo, vitoria: { id: novoId(), palavra, rodada: novo.rodada } };
        fim.push([`${palavra}! Todas as ameaças caíram.`, `${palavra}!`, 'vitoria', 'sucesso']);
      } else if (!venceu && novo.vitoria) {
        const { vitoria: _vitoria, ...resto } = novo;
        novo = resto;
      }

      // Derrota: o último agente caiu (ou, se alguém levantou, o carimbo sai)
      const perdeu = !venceu && agentesCaidos(vistosDepois);
      if (perdeu && !novo.derrota) {
        const palavra = sortearDerrota();
        const caidos = quemCaiuEComo(vistosDepois, [...(novo.log ?? []), ...entradas.filter(Boolean).map(([, , tipo, , extra]) => ({ tipo, dados: extra }))]);
        novo = { ...novo, derrota: { id: novoId(), palavra, rodada: novo.rodada, caidos } };
        fim.push([`${palavra}. Todos os agentes caíram.`, `${palavra}.`, 'derrota', 'fracasso']);
      } else if (!perdeu && novo.derrota) {
        const { derrota: _derrota, ...resto } = novo;
        novo = resto;
      }
    }
    salvar(comLog(novo, ...entradas, ...quedas, ...fim));
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
    setCarta(null);
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
  // Quem entra na luta já rola a iniciativa e cai no lugar certo da ordem
  function adicionar(entrando) {
    setAdicionando(false);
    if (!entrando.length) return;
    const novos = entrando.map((n) => comIniciativa(n, fichas));
    const lista = andamento ? inserirNaOrdem(participantes, novos) : ordenarPorIniciativa([...participantes, ...novos]);
    const nomes = novos.map((n) => verParticipante(n, fichas).nome).join(', ');
    const visiveisNovos = novos.filter((n) => !n.oculto).map((n) => verParticipante(n, fichas).nome).join(', ');
    // Na preparação só o mestre vê quem entrou (ele ainda pode esconder alguém antes de começar)
    const paraJogadores = andamento && visiveisNovos ? `Entrou na luta: ${visiveisNovos}.` : null;
    const rolagens = novos.map((n) => {
      const r = n.iniRolagem;
      return `${verParticipante(n, fichas).nome} ${n.iniciativa}${r ? ` (${r.formula}, d20 ${r.natural})` : ''}`;
    }).join(' · ');
    salvar(comLog(
      { ...dados, participantes: lista },
      [`Entrou na luta: ${nomes}.`, paraJogadores, 'sistema'],
      [`Iniciativa: ${rolagens}.`, null, 'sistema'],
    ));
  }

  const trocar = (id, mudancas) =>
    salvar({ ...dados, participantes: participantes.map((p) => (p.id === id ? { ...p, ...mudancas } : p)) });

  // Rola para quem ficou sem iniciativa (combates antigos) e arruma a ordem
  function rolarQuemFalta() {
    salvar({ ...dados, participantes: ordenarPorIniciativa(participantes.map((p) => comIniciativa(p, fichas))) });
  }

  // Valor digitado pelo mestre: substitui o rolado (o bônus continua valendo no desempate)
  const mudarIniciativa = (p, v) => trocar(p.id, { iniciativa: v, iniRolagem: p.iniRolagem ? { ...p.iniRolagem, manual: true } : null });

  function rolarDeNovo(p) {
    const nova = rolarIniciativaCompleta(p.ver.formula);
    const lista = participantes.map((x) => (x.id === p.id ? { ...x, ...nova } : x));
    salvar(comLog(
      { ...dados, participantes: preparando ? ordenarPorIniciativa(lista) : lista },
      [`${p.ver.nome} rolou a iniciativa de novo: ${nova.iniciativa} (${nova.iniRolagem.formula}, d20 ${nova.iniRolagem.natural}).`, null, 'sistema'],
    ));
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
  // O mestre controla só as ameaças (e monitora os agentes); os jogadores, só os agentes à vista
  // (meuUsuarioId: conta do jogador da campanha, que só age com o agente dele; null = a tela da mesa, qualquer agente)
  const podeControlar = (p) => andamento && (mestre ? p.lado === 'ameacas' : p.lado === 'agentes' && !p.oculto
    && (meuUsuarioId == null || fichas[p.fichaId]?.dono_id === meuUsuarioId));
  // Reação na hora: uma ameaça atacou um agente desta tela (a do jogador dono, ou a da mesa)
  const pedido = dados.pedidoReacao;
  const alvoDoPedido = pedido && vistos.find((p) => p.id === pedido.alvo);
  const autorDoPedido = pedido && vistos.find((p) => p.id === pedido.autor);
  const reagirAqui = Boolean(!mestre && pedidoVivo(pedido) && alvoDoPedido && podeControlar(alvoDoPedido));
  function responderReacao(tipo) {
    aplicar({
      mudarDados: (d) => (d.pedidoReacao?.id === pedido.id && !d.pedidoReacao.escolha
        ? { ...d, pedidoReacao: { ...d.pedidoReacao, escolha: tipo } }
        : d),
    });
  }

  // Só quem está de pé age: ameaça derrotada (PV 0) e agente caído (PV 0 ou SAN 0) só passam a vez
  const podeAgirCom = (p) => podeControlar(p) && !foraDeCombate(p);
  // Quem está na barra de turno: o da vez, ou outro que o mestre (ou o jogador) escolheu
  const ator = vistos.find((p) => p.id === atorId && (mestre || !p.oculto)) ?? daVez ?? null;
  const agindo = Boolean(ator && podeAgirCom(ator));
  const atorCaido = Boolean(ator && foraDeCombate(ator));
  // Mestre na vez de um agente, ou a vez de quem caiu: a mão aparece apagada, só para ver
  const soVer = Boolean(andamento && ator && !agindo && (mestre || (atorCaido && podeControlar(ator))));
  const cartas = agindo || soVer ? cartasDaMao(ator, fichas, livro, agindo && mestre) : [];

  // Jogar uma carta da mão (null recolhe)
  function jogarCarta(nova) {
    if (nova && !agindo) return;
    setCarta(nova);
    setInspecionado(null);
    if (!nova || !ator) return setAlvoIds([]);
    // Alvo inicial: o primeiro inimigo de pé (ataque) ou o próprio (item/condição)
    const lista = mestre ? vistos : visiveis;
    const inimigo = lista.find((p) => p.lado !== ator.lado && p.id !== ator.id && !estaCaido(p));
    if (nova.aba === 'atacar') setAlvoIds(inimigo ? [inimigo.id] : []);
    else if (miraDaCarta(nova) === 'um') setAlvoIds([ator.id]);
    else setAlvoIds([]);
  }

  function agirCom(p) {
    setAtorId(p.id === daVez?.id ? null : p.id);
    setInspecionado(null);
    setCarta(null);
    setAlvoIds([]);
  }

  const mira = miraDaCarta(carta);

  // Clique num retrato: durante uma ação escolhe o alvo; fora dela abre a ficha rápida
  function clicarNoPalco(p) {
    if (mira === 'um') return setAlvoIds([p.id]);
    if (mira === 'varios') return setAlvoIds((ids) => (ids.includes(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id]));
    setInspecionado((atual) => (atual === p.id ? null : p.id));
  }

  function fecharAcao() {
    setCarta(null);
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
  // O ataque mais novo que esta tela pode ver (anima o golpe no campo)
  const ataque = log.find((e) => e.tipo === 'ataque' && e.dados?.autor);
  const ultimoAtaque = ataque ? { id: ataque.id, ...ataque.dados } : null;
  const contaLog = log.filter((e) => e.tipo !== 'rodada' && e.tipo !== 'turno').length;

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
  const rotuloAcao = carta?.nome;

  return (
    <section
      className={`${estilo.arena} ${!mestre ? estilo.telaCheia : ''}`}
      aria-label={`Combate: ${combate.nome}`}
      // Celular: com uma carta em jogo o painel dela toma o lugar da barra do turno
      data-acao={(aba && agindo && !verRelatorio) || undefined}
      // O cenário dá o tom da barra do turno
      data-cenario={cenarioDe(dados.fundo)}
    >
      {/* 1 · Topo: timeline de iniciativa */}
      <header className={estilo.topo}>
        <div className={estilo.topoTitulo}>
          {/* Todos saem da arena (o jogador também: a tela cheia cobre o menu da campanha) */}
          <button type="button" className={estilo.voltar} onClick={onVoltar} aria-label="Sair do combate" title="Sair do combate">←</button>
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
          <button
            type="button"
            className={estilo.textual}
            onClick={() => setLogAberto((v) => !v)}
            aria-expanded={logAberto}
            title="Registro da missão"
          >
            <span className={estilo.soLargo}>Registro</span><span aria-hidden="true" className={estilo.soCelular}>☰</span> <b className={estilo.conta}>{contaLog}</b>
          </button>
          {mestre && !encerrado && (
            <button type="button" className={estilo.icone} onClick={() => setEscolhendoFundo(true)} title="Fundo do combate" aria-label="Fundo do combate">▨</button>
          )}
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
      <div
        className={estilo.centro}
        data-acao={(aba && agindo && !verRelatorio) || undefined}
        data-ordem={(mestre && !verRelatorio) || undefined}
      >
        {mestre && !verRelatorio && (
          <OrdemLateral
            participantes={vistos}
            vez={andamento ? dados.vez : null}
            inspecionado={inspecionado}
            onEscolher={(p) => setInspecionado((atual) => (atual === p.id ? null : p.id))}
          />
        )}
        {verRelatorio ? (
          <div className={estilo.rolagemRelatorio}>
            <RelatorioCombate relatorio={relatorioPara(dados.relatorio, mestre)} mestre={mestre} nome={combate.nome} sessao={sessao} />
          </div>
        ) : (
          <Palco
            fundo={dados.fundo}
            combateId={combate.id}
            participantes={visiveis}
            vez={andamento ? dados.vez : null}
            mestre={mestre}
            preparando={preparando}
            mirando={Boolean(mira)}
            alvos={alvoIds}
            selecionado={inspecao?.id}
            golpes={golpes}
            legenda={legenda}
            ultimoAtaque={ultimoAtaque}
            onEscolher={clicarNoPalco}
            onIniciativa={mudarIniciativa}
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
                onIniciativa={(v) => mudarIniciativa(inspecao, v)}
                onRolarIniciativa={() => rolarDeNovo(inspecao)}
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

        {/* Painel da carta em jogo: o passo a passo, ao lado do campo (o alvo se escolhe clicando na carta) */}
        {aba && agindo && !verRelatorio && (
          <div className={estilo.bandeja} data-tom={carta.tom} role="dialog" aria-label={`${rotuloAcao} com ${ator.ver.nome}`}>
            <header>
              <span className={estilo.bandejaIcone} aria-hidden="true">
                {carta.arma ? <IconeArma id={carta.arma} className={estilo.bandejaArma} /> : carta.icone}
              </span>
              <div>
                <small>{carta.tipo} · {ator.ver.nome}</small>
                <b>{rotuloAcao}</b>
              </div>
              <button type="button" onClick={fecharAcao} aria-label="Recolher carta">✕</button>
            </header>
            {mira && <p className={estilo.bandejaDica}>{mira === 'varios' ? 'Clique nas cartas dos alvos no campo.' : 'Clique na carta do alvo no campo.'}</p>}
            <PainelAcao
              key={`${ator.id}-${carta.id}`}
              aba={aba}
              escolha={carta.escolha}
              itemUid={carta.item}
              pedidoReacao={dados.pedidoReacao}
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
          cartas={cartas}
          soVer={soVer}
          caido={atorCaido}
          cartaId={carta?.id}
          economia={dados.economia}
          lembretes={lembretes}
          onCarta={jogarCarta}
          onEconomia={alternarEconomia}
          // O jogador só passa a vez do próprio agente (o mestre pode passar qualquer uma)
          onFinalizar={mestre || (daVez && podeControlar(daVez)) ? finalizarTurno : null}
          onVoltarTurno={() => { fecharAcao(); setAtorId(null); passar(-1); }}
          onVoltarParaVez={() => agirCom(daVez)}
          onAvancarContagem={(rid) => avancarContagem(ator, rid)}
          podeRolarAmeacas={participantes.some((p) => p.iniciativa == null)}
          onRolarAmeacas={rolarQuemFalta}
          onOrdenar={() => salvar({ ...dados, participantes: ordenarPorIniciativa(participantes) })}
          onComecar={iniciar}
          podeComecar={participantes.length > 0}
        />
      )}

      {/* O registro da missão, numa gaveta */}
      <LogCombate log={log} aberto={logAberto} onFechar={() => setLogAberto(false)} />

      {/* Abertura (jogadores): um d20 por participante à vista, na ordem do turno */}
      {verDadosIniciativa && (
        <RolagemIniciativa key={dadosIniciativa.chave} participantes={visiveis} onFim={fimDosDados} />
      )}

      {/* Carimbo de vitória (verde) ou de derrota (vermelho, com a lista de quem caiu e como) */}
      {carimbo && (
        <div
          key={carimbo.id}
          className={`${estilo.vitoria} ${carimbo.derrota ? estilo.derrota : ''}`}
          onAnimationEnd={(e) => e.target === e.currentTarget && setCarimboVisto(carimbo.id)}
          role="status"
        >
          <span>{carimbo.palavra}</span>
          <small>{carimbo.derrota ? 'Todos os agentes caíram' : 'Todas as ameaças caíram'}</small>
          {carimbo.derrota && carimbo.caidos?.length > 0 && (
            <ul className={estilo.caidos}>
              {carimbo.caidos.map((c, i) => (
                <li key={c.id} style={{ '--i': i }}>
                  <b>{c.nome}</b> {textoDaQueda(c, mestre)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Faixa de turno cruzando a tela */}
      {anuncio && (
        <div key={anuncio.chave} className={estilo.anuncio} data-lado={anuncio.lado} onAnimationEnd={(e) => e.target === e.currentTarget && setAnuncio(null)} aria-live="polite">
          {anuncio.titulo && <b>{anuncio.titulo}</b>}
          {anuncio.nome && <span>Vez de {anuncio.nome}</span>}
        </div>
      )}

      <Modal aberto={encerrando} onFechar={() => setEncerrando(false)} largura="520px" sobretitulo={combate.nome} titulo="Encerrar combate">
        {encerrando && <CaixaEncerrar vistos={vistos} onEncerrar={encerrar} onCancelar={() => setEncerrando(false)} />}
      </Modal>

      {queda > 0 && <div key={queda} className={estilo.pulsoQueda} aria-hidden="true" />}

      {escolhendoFundo && mestre && (
        <EscolherFundoDoCombate
          combateId={combate.id}
          fundo={dados.fundo}
          onEscolher={(fundo) => aplicar({ mudarDados: (d) => ({ ...d, fundo }) })}
          onFechar={() => setEscolhendoFundo(false)}
        />
      )}

      {reagirAqui && (
        <PedidoDeReacao
          key={pedido.id}
          pedido={pedido}
          atacante={autorDoPedido && !autorDoPedido.oculto ? autorDoPedido.ver.nome : 'Algo'}
          alvo={alvoDoPedido.ver.nome}
          onResponder={responderReacao}
        />
      )}

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

/**
 * A lista da derrota: cada agente, como caiu e o último que o feriu (pelo registro).
 * porOculto: quem feriu estava oculto (os jogadores leem "algo que ninguém viu").
 */
function quemCaiuEComo(vistos, historico) {
  return vistos.filter((p) => p.lado === 'agentes' && !p.ver.perdida).map((p) => {
    const como = comoCaiu(p);
    const rid = como === 'enlouqueceu' ? 'san' : 'pv';
    // O último golpe com autor (o dano à mão na ficha rápida não tem autor)
    const golpe = [...historico].reverse()
      .find((e) => e.tipo === 'dano' && e.dados?.alvo === p.id && e.dados.rid === rid && e.dados.autor);
    const autor = golpe?.dados?.autor ? vistos.find((x) => x.id === golpe.dados.autor) : null;
    return {
      id: p.id,
      nome: p.ver.nome,
      como,
      por: autor?.ver.nome ?? null,
      porOculto: Boolean(autor?.oculto),
    };
  });
}

// Fora de combate: não age (a vez dele só passa)
const foraDeCombate = (p) => (p.lado === 'ameacas' ? estaCaido(p) : comoCaiu(p) !== null);

const estaCaido = (p) => {
  const pv = p.ver.recursos.find((r) => r.id === 'pv');
  return (pv?.maximo ?? 0) > 0 && pv.atual === 0;
};
