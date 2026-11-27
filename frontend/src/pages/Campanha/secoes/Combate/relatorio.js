/*
 * Relatório de missão: o resumo de um combate encerrado, montado a partir do registro.
 * Fica guardado em combate.dados.relatorio (uma foto do fim da luta: nomes e números não mudam depois).
 *
 * As entradas do registro trazem "dados" quando dá para contar:
 *   dano / cura: { alvo, autor, rid, valor }   ataque: { autor, alvo, resultado }   queda: { alvo }
 */
import { estadoAproximado, marcaDe } from './regrasCombate';

export function montarRelatorio(dados, vistos) {
  const linha = (p) => ({
    id: p.id,
    nome: p.ver.nome,
    lado: p.lado,
    oculto: Boolean(p.oculto),
    situacao: situacaoDe(p),
    pv: p.ver.recursos.find((r) => r.id === 'pv') ?? null,
    danoCausado: 0,
    danoSofrido: 0,
    curou: 0,
    acertos: 0,
    erros: 0,
    criticos: 0,
    quedas: 0,
  });
  const porId = Object.fromEntries(vistos.map((p) => [p.id, linha(p)]));

  for (const e of dados.log ?? []) {
    const d = e.dados;
    if (!d) continue;
    if (e.tipo === 'dano' && d.rid !== 'pe') {
      if (porId[d.alvo]) porId[d.alvo].danoSofrido += d.valor;
      if (d.autor && porId[d.autor]) porId[d.autor].danoCausado += d.valor;
    }
    if (e.tipo === 'cura' && d.autor && porId[d.autor]) porId[d.autor].curou += d.valor;
    if (e.tipo === 'ataque' && porId[d.autor]) {
      if (d.resultado === 'falha') porId[d.autor].erros += 1;
      else porId[d.autor].acertos += 1;
      if (d.resultado === 'critico') porId[d.autor].criticos += 1;
    }
    if (e.tipo === 'queda' && porId[d.alvo]) porId[d.alvo].quedas += 1;
  }

  // Momentos marcantes: críticos, quedas e contagens que chegaram ao fim
  const momentos = (dados.log ?? [])
    .filter((e) => e.carimbo === 'critico' || e.tipo === 'queda' || (e.tipo === 'dano' && e.carimbo === 'falha'))
    .map((e) => ({ id: e.id, rodada: e.rodada, tipo: e.tipo, carimbo: e.carimbo, texto: e.texto, textoJogadores: e.textoJogadores }));

  return {
    vitoria: dados.vitoria?.palavra ?? null,
    derrota: dados.derrota?.palavra ?? null,
    caidos: dados.derrota?.caidos ?? [],
    rodadas: dados.rodada || 0,
    inicio: dados.inicio ?? null,
    fim: Date.now(),
    participantes: Object.values(porId),
    momentos,
  };
}

function situacaoDe(p) {
  const marca = marcaDe(p);
  if (marca) return marca.replace(/\s\d+\/\d+$/, '');   // "Morrendo 2/3" → "Morrendo"
  const pv = p.ver.recursos.find((r) => r.id === 'pv');
  return p.lado === 'ameacas' ? 'De pé' : estadoAproximado(pv).rotulo;
}

/**
 * O que cada um vê: o mestre tudo; os jogadores sem quem ficou oculto, sem os números das
 * ameaças e só com os momentos que tinham texto para eles.
 */
export function relatorioPara(relatorio, mestre) {
  if (mestre) return relatorio;
  return {
    ...relatorio,
    participantes: relatorio.participantes.filter((p) => !p.oculto),
    momentos: relatorio.momentos.filter((m) => m.textoJogadores).map((m) => ({ ...m, texto: m.textoJogadores })),
  };
}

/** Derrota: "tombou pelas mãos de Capanga" / "enlouqueceu diante de algo que ninguém viu" */
export function textoDaQueda(c, mestre) {
  if (!c.por) return c.como === 'enlouqueceu' ? 'perdeu a sanidade' : 'tombou';
  const verbo = c.como === 'enlouqueceu' ? 'enlouqueceu diante de' : 'tombou pelas mãos de';
  return `${verbo} ${c.porOculto && !mestre ? 'algo que ninguém viu' : c.por}`;
}

/*
 * Momentos para mostrar, sem repetição: os críticos de um mesmo atacante no mesmo alvo viram uma
 * linha só ("André Carvalho: 2 críticos em Zumbi de Sangue (Faca)", R6–R7); quedas e contagens
 * ficam como estão. [{ id, rodadas: 'R6' | 'R6–R7' | 'R6, R9', carimbo, texto }], na ordem da luta.
 */
const ATAQUE = /^(.+?) atacou (.+?) com (.+?)(?::|\s\(|\.$)/;

export function resumirMomentos(momentos) {
  const linhas = [];
  const criticos = new Map();   // "autor>alvo" → linha
  for (const m of momentos) {
    const achado = m.carimbo === 'critico' && m.texto.match(ATAQUE);
    if (!achado) {
      linhas.push({ id: m.id, rodadasLista: [m.rodada], carimbo: m.carimbo, texto: m.texto });
      continue;
    }
    const [, autor, alvo, arma] = achado;
    const chave = `${autor}>${alvo}`;
    const linha = criticos.get(chave);
    if (linha) {
      linha.n += 1;
      linha.rodadasLista.push(m.rodada);
      linha.armas.add(arma);
    } else {
      const nova = { id: m.id, rodadasLista: [m.rodada], carimbo: 'critico', autor, alvo, n: 1, armas: new Set([arma]) };
      criticos.set(chave, nova);
      linhas.push(nova);
    }
  }
  return linhas.map((l) => ({
    id: l.id,
    carimbo: l.carimbo,
    rodadas: rotuloDasRodadas(l.rodadasLista),
    texto: l.autor
      ? `${l.autor}: ${l.n > 1 ? `${l.n} críticos` : 'crítico'} em ${l.alvo} (${[...l.armas].join(', ')})`
      : l.texto,
  }));
}

// [6, 7] → "R6–R7"; [6, 9] → "R6, R9"; [6] → "R6"
function rotuloDasRodadas(lista) {
  const unicas = [...new Set(lista)].sort((a, b) => a - b);
  if (unicas.length === 1) return `R${unicas[0]}`;
  const seguidas = unicas.every((r, i) => i === 0 || r === unicas[i - 1] + 1);
  return seguidas ? `R${unicas[0]}–R${unicas[unicas.length - 1]}` : unicas.map((r) => `R${r}`).join(', ');
}

/** Destaques: quem mais causou dano, quem mais sofreu e quem mais acertou crítico (só agentes) */
export function destaquesDo(relatorio) {
  const agentes = relatorio.participantes.filter((p) => p.lado === 'agentes');
  const maior = (campo) => agentes.reduce((m, p) => (p[campo] > (m?.[campo] ?? 0) ? p : m), null);
  return [
    { rotulo: 'Mais dano causado', p: maior('danoCausado'), campo: 'danoCausado' },
    { rotulo: 'Mais golpes sofridos', p: maior('danoSofrido'), campo: 'danoSofrido' },
    { rotulo: 'Críticos', p: maior('criticos'), campo: 'criticos' },
  ].filter((d) => d.p);
}

/** "42 min" entre o começo e o fim (ou null) */
export function duracao(relatorio) {
  if (!relatorio.inicio || !relatorio.fim) return null;
  const min = Math.max(1, Math.round((relatorio.fim - relatorio.inicio) / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`;
}
