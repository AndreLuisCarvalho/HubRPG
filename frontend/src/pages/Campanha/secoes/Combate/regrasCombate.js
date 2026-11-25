/*
 * Regras da aba Combate (Ordem Paranormal). Funções puras: recebem o combate/ficha e devolvem o novo.
 *
 * combate.dados = {
 *   estado: 'preparando' | 'andamento' | 'encerrado',
 *   rodada, vez (id do participante da vez),
 *   participantes: [{ id, lado: 'agentes' | 'ameacas', iniciativa, oculto,
 *                     fichaId }                                   ← ficha da campanha (o PV mora nela)
 *                   | { catalogo, nome, pv, pvMax, defesa, iniciativaFormula }  ← cópia do livro
 *   ],
 * }
 * A ordem do array é a ordem dos turnos.
 */
import {
  calcularDefesa, contagemDoRecurso, dadosDoTeste, definirAtual, ehMonstro, ehNpcSimples, perderRecurso, recursos, resumo,
} from '../../../../sistemas/ordemParanormal/regras';
import { lerFormula, rolarTeste } from '../../../../components/Dados/formula';

export const COMBATE_NOVO = { estado: 'preparando', rodada: 0, vez: null, participantes: [] };

export const novoId = () => Math.random().toString(36).slice(2, 10);

/* ---------- Vitória ---------- */
// O carimbo que bate na tela quando a última ameaça cai (sorteado a cada vitória)
export const PALAVRAS_DE_VITORIA = [
  'Vitória',
  'Missão cumprida',
  'Ameaça contida',
  'Ameaça neutralizada',
  'Caso encerrado',
  'Ordem restaurada',
  'Fenômeno contido',
  'Sobrevivemos',
  'Fim da linha',
  'Área segura',
  'Arquivo fechado',
  'O Outro Lado recua',
  'A Ordem prevalece',
  'Selado',
  'Contenção completa',
];

export const sortearVitoria = () => PALAVRAS_DE_VITORIA[Math.floor(Math.random() * PALAVRAS_DE_VITORIA.length)];

/** Todas as ameaças (inclusive as ocultas) com PV zerado — precisa haver ao menos uma */
export function ameacasDerrotadas(vistos) {
  const ameacas = vistos.filter((p) => p.lado === 'ameacas');
  return ameacas.length > 0 && ameacas.every((p) => {
    const pv = p.ver.recursos.find((r) => r.id === 'pv');
    return (pv?.maximo ?? 0) > 0 && pv.atual === 0;
  });
}

/* ---------- Participantes ---------- */

export function daFicha(ficha, lado) {
  return { id: novoId(), lado, fichaId: ficha.id, iniciativa: null, oculto: false };
}

// Cópias numeradas: "Zumbi de Sangue 1", "Zumbi de Sangue 2"… continuando a numeração que já existe
export function copiasDoLivro(monstro, quantidade, participantes) {
  const existentes = participantes.filter((p) => p.catalogo === monstro.id).map((p) => p.numero ?? 0);
  let numero = existentes.length ? Math.max(...existentes) : 0;
  const sozinho = quantidade === 1 && !existentes.length;
  return Array.from({ length: quantidade }, () => {
    numero += 1;
    return {
      id: novoId(),
      lado: 'ameacas',
      catalogo: monstro.id,
      numero: sozinho ? null : numero,
      nome: monstro.nome,
      pv: monstro.pv,
      pvMax: monstro.pv,
      defesa: monstro.defesa,
      elemento: monstro.elemento,
      iniciativaFormula: monstro.sentidos?.iniciativa || '1d20',
      iniciativa: null,
      oculto: false,
    };
  });
}

/**
 * Tudo que a arena precisa de um participante, juntando com a ficha (quando há):
 * { nome, imagem, recursos: [{ id, sigla, atual, maximo, cor }], defesa, formula, resumo }
 * ficha === undefined: a ficha foi apagada (ou ainda não carregou)
 */
export function verParticipante(p, fichas) {
  if (p.catalogo) {
    return {
      nome: p.numero ? `${p.nome} ${p.numero}` : p.nome,
      imagem: '',
      elemento: p.elemento,
      recursos: [{ id: 'pv', sigla: 'PV', nome: 'Vida', cor: '#d42a3c', atual: p.pv, maximo: p.pvMax, temporario: 0 }],
      defesa: p.defesa,
      formula: p.iniciativaFormula,
      doLivro: true,
    };
  }
  const ficha = fichas[p.fichaId];
  if (!ficha) return { nome: 'Ficha apagada', imagem: '', recursos: [], defesa: '—', formula: '1d20', perdida: true };
  const { dados } = ficha;
  const agente = !ehMonstro(dados) && !ehNpcSimples(dados);
  return {
    nome: ficha.nome,
    imagem: ficha.imagem,
    elemento: ehMonstro(dados) ? dados.elemento : '',
    recursos: recursos(dados),
    defesa: defesaDaFicha(dados),
    formula: formulaDeIniciativa(dados),
    tipo: ficha.tipo,
    resumo: resumo(dados),   // "Combatente · NEX 40%", "VD 20 · Sangue"…
    // Morrendo / Enlouquecendo (só agentes): { id, rotulo, final, limite, valor }
    contagens: agente ? { pv: contagemDoRecurso(dados, 'pv'), san: contagemDoRecurso(dados, 'san') } : null,
    estilo: dados.dado,
  };
}

function defesaDaFicha(dados) {
  if (ehMonstro(dados)) return dados.defesa ?? 10;
  if (ehNpcSimples(dados)) return dados.npc?.defesa ?? 10;
  return calcularDefesa(dados);
}

function formulaDeIniciativa(dados) {
  if (ehMonstro(dados)) return dados.sentidos?.iniciativa || '1d20';
  if (ehNpcSimples(dados)) {
    const bonus = dados.npc?.pericias?.find((p) => p.id === 'iniciativa')?.bonus ?? 0;
    return bonus ? `1d20+${bonus}` : '1d20';
  }
  return dadosDoTeste(dados, 'iniciativa');
}

/** Rola a iniciativa de uma fórmula do livro ("2d20+5": fica com o maior e soma) */
export function rolarIniciativa(formula) {
  return rolarIniciativaCompleta(formula).iniciativa;
}

/**
 * A rolagem inteira, para mostrar e desempatar:
 * { iniciativa, iniRolagem: { formula, natural, bonus, sorte } } — empate: maior bônus, depois a sorte
 */
export function rolarIniciativaCompleta(formula) {
  const usada = lerFormula(formula) ? formula : '1d20';
  const teste = rolarTeste(lerFormula(usada));
  return {
    iniciativa: teste.total,
    iniRolagem: { formula: usada, natural: teste.natural, bonus: teste.total - teste.natural, sorte: Math.random() },
  };
}

/** Dá iniciativa a quem ainda não tem (quem entra na luta rola na hora) */
export const comIniciativa = (p, fichas) => (p.iniciativa != null ? p : { ...p, ...rolarIniciativaCompleta(verParticipante(p, fichas).formula) });

/* ---------- Recursos ---------- */

/**
 * Muda um recurso de uma FICHA em "delta" (negativo = dano, positivo = cura).
 * Devolve só o pedaço de "dados" que mudou (o servidor mescla).
 */
export function mudarRecursoDaFicha(dados, id, delta) {
  if (ehMonstro(dados)) {
    return { pv: limitar((dados.pv ?? 0) + delta, 0, dados.pvMax ?? 0) };
  }
  if (ehNpcSimples(dados)) {
    const npc = { pv: 10, pvMax: 10, ...dados.npc };
    return { npc: { ...npc, pv: limitar(npc.pv + delta, 0, npc.pvMax) } };
  }
  if (delta < 0) return perderRecurso(dados, id, -delta);
  const atual = recursos(dados).find((r) => r.id === id)?.atual ?? 0;
  return definirAtual(dados, id, atual + delta);
}

/** Mesma coisa para uma cópia do livro (o PV mora no próprio participante) */
export const mudarPvDaCopia = (p, delta) => ({ ...p, pv: limitar(p.pv + delta, 0, p.pvMax) });

const limitar = (v, min, max) => Math.min(Math.max(v, min), max);

/** O que os jogadores veem de uma ameaça: só um estado aproximado */
export function estadoAproximado(pv) {
  if (!pv || pv.maximo <= 0) return { id: 'ileso', rotulo: 'Ileso' };
  if (pv.atual <= 0) return { id: 'caido', rotulo: 'Caído' };
  if (pv.atual >= pv.maximo) return { id: 'ileso', rotulo: 'Ileso' };
  if (pv.atual >= pv.maximo / 2) return { id: 'ferido', rotulo: 'Ferido' };
  return { id: 'muitoFerido', rotulo: 'Muito ferido' };
}

/* ---------- Turnos ---------- */

// Maior iniciativa primeiro; quem não rolou vai para o fim (o sort é estável: empate mantém a ordem)
// Quem vai antes: maior iniciativa; empate → maior bônus; de novo → sorteio (guardado na rolagem)
const antesNaOrdem = (a, b) => ((b.iniciativa ?? -Infinity) - (a.iniciativa ?? -Infinity))
  || ((b.iniRolagem?.bonus ?? 0) - (a.iniRolagem?.bonus ?? 0))
  || ((b.iniRolagem?.sorte ?? 0) - (a.iniRolagem?.sorte ?? 0));

export const ordenarPorIniciativa = (participantes) => [...participantes].sort(antesNaOrdem);

export function comecar(dados) {
  const participantes = ordenarPorIniciativa(dados.participantes);
  return { ...dados, estado: 'andamento', rodada: 1, vez: participantes[0]?.id ?? null, participantes, inicio: Date.now() };
}

// Ameaça com PV 0 não tem turno (agente caído tem: está morrendo e conta os turnos)
const caido = (p, fichas) => p.lado === 'ameacas' && verParticipante(p, fichas).recursos[0]?.atual === 0;

/** Passa a vez (passo +1 ou −1), pulando ameaças derrotadas; virar a lista muda a rodada */
export function passarVez(dados, fichas, passo = 1) {
  const lista = dados.participantes;
  if (!lista.length) return dados;
  let i = Math.max(0, lista.findIndex((p) => p.id === dados.vez));
  let rodada = dados.rodada || 1;
  for (let tentativas = 0; tentativas < lista.length; tentativas += 1) {
    i += passo;
    if (i >= lista.length) { i = 0; rodada += 1; }
    if (i < 0) { i = lista.length - 1; rodada = Math.max(1, rodada - 1); }
    if (!caido(lista[i], fichas)) break;
  }
  return { ...dados, vez: lista[i].id, rodada };
}

/** Entra no meio da luta: fica na posição da iniciativa dele (sem iniciativa, no fim) */
export function inserirNaOrdem(participantes, novos) {
  const lista = [...participantes];
  for (const novo of novos) {
    const pos = novo.iniciativa == null ? -1 : lista.findIndex((p) => antesNaOrdem(novo, p) < 0);
    if (pos < 0) lista.push(novo);
    else lista.splice(pos, 0, novo);
  }
  return lista;
}

export function mover(lista, de, para) {
  if (para < 0 || para >= lista.length || de === para) return lista;
  const nova = [...lista];
  const [item] = nova.splice(de, 1);
  nova.splice(para, 0, item);
  return nova;
}

/** Tira um participante; se era a vez dele, passa para o próximo */
export function remover(dados, id, fichas) {
  const eraAVez = dados.vez === id && dados.estado === 'andamento';
  const base = eraAVez ? passarVez(dados, fichas) : dados;
  const participantes = base.participantes.filter((p) => p.id !== id);
  return { ...base, participantes, vez: participantes.some((p) => p.id === base.vez) ? base.vez : participantes[0]?.id ?? null };
}

/** Carimbo do estado: Morto/Insano > Morrendo/Derrotado > Enlouquecendo (ou null) */
export function marcaDe(p) {
  const { ver } = p;
  const pv = ver.recursos.find((r) => r.id === 'pv');
  const san = ver.recursos.find((r) => r.id === 'san');
  const c = (rid) => ver.contagens?.[rid];
  const fim = (rid) => (c(rid) && c(rid).valor >= c(rid).limite ? c(rid).final : null);
  const conta = (rid) => (c(rid)?.valor ? ` ${c(rid).valor}/${c(rid).limite}` : '');
  const final = fim('pv') ?? fim('san');
  if (final) return final;
  if (pv && pv.maximo > 0 && pv.atual === 0) return p.lado === 'ameacas' ? 'Derrotado' : `Morrendo${conta('pv')}`;
  if (san && san.atual === 0) return `Enlouquecendo${conta('san')}`;
  return null;
}
