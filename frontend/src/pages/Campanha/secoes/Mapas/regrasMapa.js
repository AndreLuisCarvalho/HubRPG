/*
 * Regras dos mapas.
 * mapa.dados: { pergaminho, oculto, usarNevoa, pinos: [pino], tokens: [token], rotas: [rota] }
 * pino:  { id, x, y (0–1, fração da imagem), tipo, nome, descricao, oculto, link: { tipo, id } | null }
 * token: { fichaId, x, y } — um agente no mapa (foto e nome vêm da ficha)
 * rota:  { id, nome, cor, oculta, pontos: [{ x, y }] }
 * nota:  { id, x, y, texto, cor, oculta } — post-it preso por alfinete (cor = cor do papel)
 * escala: { px, valor, unidade } — "px pixels do mapa valem valor unidade" (ex.: 300 px = 100 m)
 * atual: true no mapa onde o grupo está (aparece na Visão geral)
 * A névoa (máscara) fica fora de "dados", na coluna própria do mapa.
 */

// Tipos de pino: cor do alfinete + ícone a tinta (desenhos em IconePino)
export const TIPOS_PINO = {
  lugar: { nome: 'Lugar', cor: '#9a8f7a' },
  pista: { nome: 'Pista', cor: '#e0b23a' },
  perigo: { nome: 'Perigo', cor: '#c4202f' },
  refugio: { nome: 'Refúgio', cor: '#3f9e5a' },
  npc: { nome: 'NPC', cor: '#3d7fd1' },
  paranormal: { nome: 'Paranormal', cor: '#8b3fd6' },
  tesouro: { nome: 'Tesouro', cor: '#d4772a' },
  passagem: { nome: 'Passagem', cor: '#6b4f2c' },
};

// Para onde um pino pode apontar
export const TIPOS_LINK = {
  mapa: 'Outro mapa',
  arquivo: 'Arquivo',
  item: 'Item',
  ficha: 'Ficha (NPC, agente, monstro)',
  sessao: 'Sessão',
};

export const MAPA_NOVO = {
  nome: '', imagem: '',
  dados: {
    pergaminho: true, oculto: false, usarNevoa: false, atual: false, escala: null,
    pinos: [], tokens: [], rotas: [], notas: [],
  },
};

// Cores das rotas (tinta): a do grupo, a do culto…
export const CORES_ROTA = ['#7a1f1f', '#1f3f7a', '#2d5a2a', '#5a2d6b', '#8a5a12', '#1c1c1c'];

// Mapa sem imagem: pergaminho em branco neste tamanho
export const PAPEL_EM_BRANCO = { w: 1600, h: 1100 };

const novoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const novoPino = (x, y) => ({
  id: novoId(), x, y, tipo: 'lugar', nome: '', descricao: '', oculto: false, link: null,
});

/** Mapa "pai": o primeiro que tem uma passagem para este (para o caminho de volta) */
export function caminhoAte(mapaId, mapas) {
  const caminho = [];
  let atual = mapas.find((m) => m.id === mapaId);
  while (atual && caminho.length < 6 && !caminho.includes(atual)) {
    caminho.unshift(atual);
    const filho = atual;
    atual = mapas.find((m) => m !== filho && (m.dados.pinos ?? [])
      .some((p) => p.link?.tipo === 'mapa' && p.link.id === filho.id));
  }
  return caminho;
}

export const novaRota = (pontos) => ({ id: novoId(), nome: '', cor: CORES_ROTA[0], oculta: false, pontos });

/** Curva suave passando pelos pontos (Catmull-Rom → Bézier), em "d" de <path> */
export function caminhoDaRota(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0].x} ${pts[0].y}`;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  }
  return d;
}

// Cores do papel dos post-its
export const CORES_NOTA = ['#f4e06d', '#f3a6b8', '#9fd0ee', '#b5e3a1', '#f6b871', '#efe9dc'];

export const novaNota = (x, y) => ({ id: novoId(), x, y, texto: '', cor: CORES_NOTA[0], oculta: false });

/** Distância em pixels do mapa entre dois pontos (frações) */
export const distanciaPx = (a, b, tamanho) => Math.hypot((b.x - a.x) * tamanho.w, (b.y - a.y) * tamanho.h);

/** "350 m", "1,2 km" — pela escala do mapa */
export function formatarDistancia(px, escala) {
  if (!escala?.px || !escala.valor) return null;
  let valor = (px * escala.valor) / escala.px;
  let unidade = escala.unidade;
  if (unidade === 'm' && valor >= 1000) {
    valor /= 1000;
    unidade = 'km';
  }
  const casas = valor < 10 ? 1 : 0;
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })} ${unidade}`;
}

export const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
