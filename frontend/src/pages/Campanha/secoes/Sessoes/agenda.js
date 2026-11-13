// Ajudantes de sessões, usados pela Visão geral e pela página de Sessões.
// "data" vem do banco como texto: "2026-11-20" ou "2026-11-20T20:00" (hora local).

// "2026-11-20" sozinho seria lido como meia-noite UTC (o dia anterior no Brasil): força hora local
export function lerData(data) {
  if (!data) return null;
  const d = new Date(data.includes('T') ? data : `${data}T00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const temHora = (data) => Boolean(data?.includes('T'));

// "sex, 20 de nov · 20:00"
export function formatarData(data) {
  const d = lerData(data);
  if (!d) return '';
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const hora = temHora(data) ? ` · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '';
  return dia + hora;
}

// "hoje", "amanhã", "em 5 dias"
export function quantoFalta(data, agora = new Date()) {
  const d = lerData(data);
  if (!d) return '';
  const meiaNoite = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dias = Math.round((meiaNoite(d) - meiaNoite(agora)) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

/**
 * Separa as sessões em: a próxima marcada (data no futuro), a última jogada e as anteriores.
 * Sessão sem data conta como já jogada (registro de algo que aconteceu).
 */
export function organizarSessoes(sessoes, agora = new Date()) {
  const futuras = sessoes
    .filter((s) => lerData(s.data) > agora)
    .sort((a, b) => lerData(a.data) - lerData(b.data));
  const jogadas = sessoes
    .filter((s) => !futuras.includes(s))
    .sort((a, b) => b.numero - a.numero);
  return { proxima: futuras[0] ?? null, ultima: jogadas[0] ?? null, anteriores: jogadas.slice(1), futuras };
}
