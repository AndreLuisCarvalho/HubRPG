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
