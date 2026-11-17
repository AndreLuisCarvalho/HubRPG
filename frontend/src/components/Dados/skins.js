/*
 * Aparência dos dados: cores livres ou uma skin.
 * Toda skin é desenhada aqui mesmo (canvas), sem imagem de fora. Cada uma diz:
 *  - base / aresta / numero: cores do corpo, da aresta arredondada e dos números
 *  - material: acabamento no three.js (rugosidade, metal, verniz)
 *  - brilho: 'numeros' (só os números acendem) ou 'tudo' (o desenho da face também)
 *  - pintar(ctx, x, y, lado, sorte): o desenho de uma face no atlas
 * O dado em CSS (sem WebGL) usa só a cor base.
 */

export const COR_PADRAO = '#a3181b';
export const COR_DANO_PADRAO = '#a3181b';

export const PALETA = [
  '#a3181b', '#d1452e', '#c4974a', '#e0c45c', '#3f7d4a', '#2f6f8f',
  '#2b3f8f', '#5b2b8f', '#8f2b6f', '#1d1f23', '#6b6e75', '#ece6da',
];

// Números claros em dado escuro e escuros em dado claro
export function corDoNumero(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#1b1712' : '#f6f1ea';
}

/* ---------- Pincéis ---------- */
function veio(ctx, x, y, lado, sorte, cor, largura) {
  ctx.strokeStyle = cor;
  ctx.lineWidth = largura;
  ctx.lineCap = 'round';
  ctx.beginPath();
  let px = x + sorte() * lado;
  let py = y + sorte() * lado;
  ctx.moveTo(px, py);
  for (let i = 0; i < 5; i++) {
    const nx = px + (sorte() - 0.5) * lado * 0.6;
    const ny = py + (sorte() - 0.5) * lado * 0.6;
    ctx.quadraticCurveTo(px + (sorte() - 0.5) * lado * 0.3, py + (sorte() - 0.5) * lado * 0.3, nx, ny);
    px = nx;
    py = ny;
  }
  ctx.stroke();
}

function pontos(ctx, x, y, lado, sorte, cor, qtd, raioMax) {
  ctx.fillStyle = cor;
  for (let i = 0; i < qtd; i++) {
    ctx.beginPath();
    ctx.arc(x + sorte() * lado, y + sorte() * lado, sorte() * raioMax + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- Skins ---------- */
export const SKINS = [
  {
    id: 'sangue', nome: 'Sangue', grupo: 'Elementos',
    base: '#7a0a0f', aresta: '#9c1219', numero: '#f3e6d3',
    material: { roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 },
    pintar(ctx, x, y, lado, sorte) {
      for (let i = 0; i < 4; i++) veio(ctx, x, y, lado, sorte, 'rgba(30, 0, 2, 0.55)', 6 + sorte() * 6);
      for (let i = 0; i < 3; i++) veio(ctx, x, y, lado, sorte, 'rgba(232, 40, 46, 0.45)', 2 + sorte() * 2);
    },
  },
  {
    id: 'morte', nome: 'Morte', grupo: 'Elementos',
    base: '#3d3d42', aresta: '#55555b', numero: '#e8e6e1',
    material: { roughness: 0.85, clearcoat: 0 },
    pintar(ctx, x, y, lado, sorte) {
      pontos(ctx, x, y, lado, sorte, 'rgba(10, 10, 12, 0.55)', 70, 3);
      pontos(ctx, x, y, lado, sorte, 'rgba(200, 200, 205, 0.18)', 50, 2.5);
      // Espiral fraca: o tempo que se esvai
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 6; a += 0.2) {
        const r = a * lado * 0.022;
        ctx.lineTo(x + lado / 2 + Math.cos(a) * r, y + lado / 2 + Math.sin(a) * r);
      }
      ctx.stroke();
    },
  },
  {
    id: 'conhecimento', nome: 'Conhecimento', grupo: 'Elementos',
    base: '#b98d24', aresta: '#d9b04a', numero: '#2a1c04',
    material: { roughness: 0.32, metalness: 0.75, clearcoat: 0.3 },
    pintar(ctx, x, y, lado, sorte) {
      // Sigilos: círculos e traços finos gravados
      ctx.strokeStyle = 'rgba(70, 45, 0, 0.45)';
      ctx.lineWidth = 2;
      const cx = x + lado / 2;
      const cy = y + lado / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, lado * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = sorte() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * lado * 0.42, cy + Math.sin(a) * lado * 0.42);
        ctx.lineTo(cx + Math.cos(a) * lado * 0.48, cy + Math.sin(a) * lado * 0.48);
        ctx.stroke();
      }
    },
  },
  {
    id: 'energia', nome: 'Energia', grupo: 'Elementos',
    base: '#3a128a', aresta: '#5a26c0', numero: '#f4ecff', brilho: 'tudo', intensidade: 1.4,
    material: { roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 },
    pintar(ctx, x, y, lado, sorte) {
      // Descargas caóticas que acendem
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = sorte() > 0.5 ? 'rgba(214, 120, 255, 0.9)' : 'rgba(120, 220, 255, 0.85)';
        ctx.lineWidth = 2 + sorte() * 2;
        ctx.beginPath();
        let px = x + sorte() * lado;
        let py = y + sorte() * lado;
        ctx.moveTo(px, py);
        for (let k = 0; k < 6; k++) {
          px += (sorte() - 0.5) * lado * 0.35;
          py += (sorte() - 0.5) * lado * 0.35;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    },
  },
  {
    id: 'medo', nome: 'Medo', grupo: 'Elementos',
    base: '#0b0b0d', aresta: '#2a2a2e', numero: '#fafafa',
    material: { roughness: 0.45, clearcoat: 0.6 },
    pintar(ctx, x, y, lado, sorte) {
      // Rachaduras brancas
      for (let i = 0; i < 3; i++) veio(ctx, x, y, lado, sorte, 'rgba(255, 255, 255, 0.28)', 1.5);
    },
  },
  {
    id: 'dossie', nome: 'Dossiê', grupo: 'Ordem',
    base: '#d8ccb0', aresta: '#e6dcc4', numero: '#1d1a16',
    material: { roughness: 0.95, clearcoat: 0 },
    pintar(ctx, x, y, lado, sorte) {
      // Linhas de papel pautado e um carimbo vermelho torto
      ctx.strokeStyle = 'rgba(80, 95, 140, 0.25)';
      ctx.lineWidth = 1.5;
      for (let ly = y + lado * 0.12; ly < y + lado; ly += lado * 0.12) {
        ctx.beginPath();
        ctx.moveTo(x, ly);
        ctx.lineTo(x + lado, ly);
        ctx.stroke();
      }
      if (sorte() > 0.45) {
        ctx.save();
        ctx.translate(x + lado * (0.25 + sorte() * 0.5), y + lado * (0.25 + sorte() * 0.5));
        ctx.rotate((sorte() - 0.5) * 0.8);
        ctx.strokeStyle = 'rgba(179, 54, 44, 0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(-lado * 0.3, -lado * 0.1, lado * 0.6, lado * 0.2);
        ctx.restore();
      }
      pontos(ctx, x, y, lado, sorte, 'rgba(120, 90, 40, 0.12)', 25, 5);
    },
  },
  {
    id: 'ferrugem', nome: 'Ferrugem', grupo: 'Ordem',
    base: '#7a3e1c', aresta: '#9a5428', numero: '#ead2b0',
    material: { roughness: 0.9, metalness: 0.35, clearcoat: 0 },
    pintar(ctx, x, y, lado, sorte) {
      pontos(ctx, x, y, lado, sorte, 'rgba(40, 18, 6, 0.4)', 40, 9);
      pontos(ctx, x, y, lado, sorte, 'rgba(200, 110, 50, 0.3)', 50, 5);
      pontos(ctx, x, y, lado, sorte, 'rgba(90, 100, 95, 0.25)', 12, 8);
    },
  },
  {
    id: 'neon', nome: 'Neon', grupo: 'Ordem',
    base: '#121218', aresta: '#24242e', numero: '#3fd8f0', brilho: 'numeros', intensidade: 0.9,
    material: { roughness: 0.3, clearcoat: 0.8 },
    pintar(ctx, x, y, lado, sorte) {
      // Grade de investigação, bem fraca
      ctx.strokeStyle = 'rgba(255, 60, 200, 0.18)';
      ctx.lineWidth = 1.5;
      const passo = lado / 6;
      const desvio = sorte() * passo;
      for (let k = desvio; k < lado; k += passo) {
        ctx.beginPath();
        ctx.moveTo(x + k, y);
        ctx.lineTo(x + k, y + lado);
        ctx.moveTo(x, y + k);
        ctx.lineTo(x + lado, y + k);
        ctx.stroke();
      }
    },
  },
];

export const skinPorId = (id) => SKINS.find((s) => s.id === id) ?? null;

/**
 * Aparência final de um dado: { chave, base, aresta, numero, skin, material }.
 * estilo = o que a ficha guardou ({ cor, corDano, skin }); tipo = 'teste' | 'dano'.
 */
export function aparencia(estilo = {}, tipo = 'teste') {
  const skin = skinPorId(estilo?.skin);
  if (skin) {
    return { chave: `skin:${skin.id}`, base: skin.base, aresta: skin.aresta, numero: skin.numero, skin, material: skin.material };
  }
  const base = (tipo === 'dano' ? estilo?.corDano ?? estilo?.cor : estilo?.cor) ?? COR_PADRAO;
  return { chave: `cor:${base}`, base, aresta: base, numero: corDoNumero(base), skin: null, material: null };
}
