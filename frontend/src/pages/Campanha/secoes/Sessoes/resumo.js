/**
 * Lê o texto livre de um resumo de sessão e encontra a estrutura que já está nele,
 * sem obrigar ninguém a aprender uma sintaxe:
 *
 *   "1. O Gancho (A Missão)"     → tópico numerado (vira um bloco que abre e fecha)
 *   "## Atmosfera" ou "# Atmosfera" → tópico sem número
 *   "Relógios Parados: travam…"  → termo em destaque + explicação
 *   "- lanterna" / "• lanterna"   → item de lista
 *   qualquer outra linha         → parágrafo
 *
 * Devolve { intro: blocos[], topicos: [{ numero, titulo, blocos[] }] }.
 */
export function lerResumo(texto = '') {
  const intro = [];
  const topicos = [];
  let destino = intro;

  for (const bruta of texto.split('\n')) {
    const linha = bruta.trim();
    if (!linha) continue;

    const titulo = lerTitulo(linha);
    if (titulo) {
      const topico = { ...titulo, blocos: [] };
      topicos.push(topico);
      destino = topico.blocos;
      continue;
    }

    const item = linha.match(/^[-•*]\s+(.+)$/);
    if (item) { destino.push({ tipo: 'item', texto: item[1] }); continue; }

    const termo = linha.match(/^([^:]{2,40}):\s+(.+)$/);
    if (termo && termo[1].trim().split(/\s+/).length <= 5) {
      destino.push({ tipo: 'termo', termo: termo[1].trim(), texto: termo[2] });
      continue;
    }

    destino.push({ tipo: 'paragrafo', texto: linha });
  }

  return { intro, topicos };
}

// "1. O Gancho" / "2) Atmosfera" / "## Atmosfera" — só linhas curtas e sem ponto final
function lerTitulo(linha) {
  const numerado = linha.match(/^(\d{1,2})[.)]\s+(.{2,70})$/);
  if (numerado && !/[.!?:]$/.test(numerado[2])) return { numero: numerado[1], titulo: numerado[2] };

  const marcado = linha.match(/^#{1,3}\s+(.{2,70})$/);
  if (marcado) return { numero: null, titulo: marcado[1] };

  return null;
}

// Prévia de um tópico fechado: a primeira frase. Se ela só anuncia uma lista
// ("…utiliza uma mecânica própria:"), mostra os nomes dos termos no lugar.
export function primeiraFrase(blocos) {
  const primeiro = blocos.find((b) => b.tipo === 'paragrafo') ?? blocos[0];
  if (!primeiro) return '';
  const termos = blocos.filter((b) => b.tipo === 'termo').map((b) => b.termo);
  if (termos.length && (primeiro.tipo === 'termo' || primeiro.texto.endsWith(':'))) return termos.join(' · ');
  const texto = primeiro.tipo === 'termo' ? `${primeiro.termo}: ${primeiro.texto}` : primeiro.texto;
  const fim = texto.search(/[.!?](\s|$)/);
  return fim > 0 && fim < 160 ? texto.slice(0, fim + 1) : `${texto.slice(0, 140).trimEnd()}…`;
}
