/*
 * Regras dos mapas.
 * mapa.dados: { pergaminho, oculto, pinos: [pino] }
 * pino: { id, x, y (0–1, fração da imagem), tipo, nome, descricao, oculto, link: { tipo, id } | null }
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

export const MAPA_NOVO = { nome: '', imagem: '', dados: { pergaminho: true, oculto: false, pinos: [] } };

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

export const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
