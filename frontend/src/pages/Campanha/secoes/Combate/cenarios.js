/*
 * Fundos do combate. Em dados.fundo:
 *   null / { tipo: 'cenario', id }                       → um cenário desenhado no site
 *   { tipo: 'imagem', versao, enquadre: { x, y, z } }   → imagem/GIF enviada (a imagem fica em /combates/:id/fundo)
 * O cenário também dá o tom da barra do turno (data-cenario na arena).
 */
export const CENARIOS = [
  { id: 'sangue', nome: 'Padrão', descricao: 'Escuro, com sangue nas bordas' },
  { id: 'galpao', nome: 'Galpão abandonado', descricao: 'Vigas, lâmpada balançando, poeira' },
  { id: 'floresta', nome: 'Floresta à noite', descricao: 'Árvores, neblina rasteira, lua' },
  { id: 'ritual', nome: 'Círculo ritual', descricao: 'Símbolos no chão, velas' },
  { id: 'chuva', nome: 'Rua sob chuva', descricao: 'Poste, chuva, asfalto molhado' },
];

/** Id do cenário em uso ('imagem' quando é uma imagem enviada) */
export function cenarioDe(fundo) {
  if (fundo?.tipo === 'imagem') return 'imagem';
  return CENARIOS.some((c) => c.id === fundo?.id) ? fundo.id : 'sangue';
}
