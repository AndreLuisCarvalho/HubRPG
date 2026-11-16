/*
 * Dado em WebGL (three.js), no visual de um d20 de resina: vermelho, arestas arredondadas,
 * números brancos levemente gravados.
 *
 * A forma vem de poliedros.js (as mesmas faces e números do dado em CSS). Para arredondar:
 *  - cada face encolhe um pouco em direção ao próprio centro;
 *  - o vão entre duas faces vira uma tira (aresta) e o vão em volta de cada vértice vira um
 *    polígono (quina). Os pontos da tira e da quina guardam a normal da face de onde vieram,
 *    então a luz passa suave de uma face para a outra e a aresta parece redonda.
 * Os números ficam num atlas (uma textura com todos) e cada face aponta para a sua casa.
 *
 * poliedros.js usa o eixo y do CSS (para baixo); aqui tudo é espelhado em y (three: para cima).
 */
import * as THREE from 'three';
import { LETRA, poliedro } from './poliedros';

export const COR_DADO = '#a3181b';
const CHANFRO = 0.88;   // quanto sobra de cada face; o resto vira aresta arredondada
const CASA = 256;       // px de cada número no atlas

const espelhar = ([x, y, z]) => new THREE.Vector3(x, -y, z);
const chaveDe = (v) => v.map((x) => x.toFixed(4)).join(',');

// Rótulos das faces. Dado sem forma própria (d3, d100…) usa o d20; acima de 20 lados o valor sorteado
// vai escrito na primeira face (por isso esse dado não entra no cache).
function rotular(lados, forma, faces, valor) {
  return faces.map((f, i) => {
    if (forma === lados) return f.valor;
    if (lados > 20 && i === 0) return valor;
    return ((f.valor - 1) % lados) + 1;
  });
}

function desenharAtlas(rotulos, forma, lados) {
  const colunas = Math.ceil(Math.sqrt(rotulos.length));
  const linhas = Math.ceil(rotulos.length / colunas);
  const tela = document.createElement('canvas');
  tela.width = colunas * CASA;
  tela.height = linhas * CASA;
  const ctx = tela.getContext('2d');
  ctx.fillStyle = COR_DADO;
  ctx.fillRect(0, 0, tela.width, tela.height);

  const px = Math.round(LETRA[forma] * (CASA / 2));
  ctx.font = `700 ${px}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  rotulos.forEach((rotulo, i) => {
    const cx = (i % colunas) * CASA + CASA / 2;
    const cy = Math.floor(i / colunas) * CASA + CASA / 2;
    const texto = String(rotulo);
    const medida = ctx.measureText(texto);
    const base = cy + (medida.actualBoundingBoxAscent - medida.actualBoundingBoxDescent) / 2;

    // Gravado: uma sombra escura em cima e o número claro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillText(texto, cx, base - 3);
    ctx.fillStyle = '#f6f1ea';
    ctx.fillText(texto, cx, base);

    // 6 e 9 sublinhados
    if (lados > 8 && (rotulo === 6 || rotulo === 9)) {
      ctx.fillRect(cx - medida.width / 2, base + px * 0.1, medida.width, Math.max(3, px * 0.07));
    }
  });

  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;
  return { textura, colunas, linhas };
}

function montarGeometria(faces, colunas, linhas) {
  const pos = [];
  const nor = [];
  const uv = [];
  const grupos = [];

  // Triângulo virado para fora (o sólido é convexo e centrado na origem)
  function triangulo(a, b, c) {
    const lado = new THREE.Vector3().subVectors(b.p, a.p).cross(new THREE.Vector3().subVectors(c.p, a.p));
    const centro = new THREE.Vector3().add(a.p).add(b.p).add(c.p);
    const [x, y, z] = lado.dot(centro) < 0 ? [a, c, b] : [a, b, c];
    for (const v of [x, y, z]) {
      pos.push(v.p.x, v.p.y, v.p.z);
      nor.push(v.n.x, v.n.y, v.n.z);
      uv.push(v.uv?.[0] ?? 0, v.uv?.[1] ?? 0);
    }
  }
  const leque = (centro, pontos) => pontos.forEach((p, i) => triangulo(centro, p, pontos[(i + 1) % pontos.length]));

  const porVertice = new Map();   // vértice original → cantos encolhidos das faces que tocam nele
  const porAresta = new Map();    // aresta original → os dois pares de cantos

  /* ---------- Faces (com os números) ---------- */
  faces.forEach((f, i) => {
    const n = espelhar(f.n);
    const col = i % colunas;
    const lin = Math.floor(i / colunas);
    const noAtlas = (p) => {
      const d = [p[0] - f.c[0], p[1] - f.c[1], p[2] - f.c[2]];
      const x = d[0] * f.e1[0] + d[1] * f.e1[1] + d[2] * f.e1[2];
      const y = d[0] * f.e2[0] + d[1] * f.e2[1] + d[2] * f.e2[2];
      return [(col + 0.5 + x / 2) / colunas, 1 - (lin + 0.5 + y / 2) / linhas];
    };

    const cantos = f.cantos.map((v) => {
      const p = v.map((x, k) => f.c[k] + CHANFRO * (x - f.c[k]));
      return { p: espelhar(p), n, uv: noAtlas(p), chave: chaveDe(v) };
    });
    leque({ p: espelhar(f.c), n, uv: noAtlas(f.c) }, cantos);

    cantos.forEach((canto, k) => {
      if (!porVertice.has(canto.chave)) porVertice.set(canto.chave, { v: espelhar(f.cantos[k]), cantos: [] });
      porVertice.get(canto.chave).cantos.push(canto);
      const prox = cantos[(k + 1) % cantos.length];
      const chave = [canto.chave, prox.chave].sort().join('|');
      if (!porAresta.has(chave)) porAresta.set(chave, []);
      porAresta.get(chave).push({ [canto.chave]: canto, [prox.chave]: prox });
    });
  });
  grupos.push([0, pos.length / 3, 0]);

  /* ---------- Arestas: tira entre duas faces ---------- */
  const inicioChanfro = pos.length / 3;
  for (const [chave, lados] of porAresta) {
    if (lados.length !== 2) continue;
    const [ka, kb] = chave.split('|');
    const [f, g] = lados;
    triangulo(f[ka], f[kb], g[kb]);
    triangulo(f[ka], g[kb], g[ka]);
  }

  /* ---------- Quinas: polígono em volta de cada vértice ---------- */
  for (const { v, cantos } of porVertice.values()) {
    const eixo = v.clone().normalize();
    const meio = cantos.reduce((s, c) => s.add(c.p), new THREE.Vector3()).divideScalar(cantos.length);
    const ref = new THREE.Vector3().subVectors(cantos[0].p, meio).normalize();
    const outro = new THREE.Vector3().crossVectors(eixo, ref);
    const angulo = (c) => {
      const d = new THREE.Vector3().subVectors(c.p, meio);
      return Math.atan2(d.dot(outro), d.dot(ref));
    };
    const ordem = [...cantos].sort((a, b) => angulo(a) - angulo(b));
    leque({ p: meio, n: eixo }, ordem);
  }
  grupos.push([inicioChanfro, pos.length / 3 - inicioChanfro, 1]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  grupos.forEach(([inicio, qtd, material]) => geo.addGroup(inicio, qtd, material));
  return geo;
}

// Rotação que deixa a face virada para a câmera (+z) com o número de pé
function rotacaoDaFace(f) {
  const e1 = espelhar(f.e1);
  const cima = espelhar(f.e2).negate();
  const n = espelhar(f.n);
  const m = new THREE.Matrix4().makeBasis(e1, cima, n).transpose();
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

const cache = new Map();

/** Geometria, textura e a rotação de cada face de um dado de "lados" lados */
export function pecasDoDado(lados, valor) {
  const { forma, faces } = poliedro(lados);
  const unico = lados > 20;
  const chave = unico ? null : lados;
  if (chave && cache.has(chave)) return cache.get(chave);

  const rotulos = rotular(lados, forma, faces, valor);
  const { textura, colunas, linhas } = desenharAtlas(rotulos, forma, lados);
  const pecas = {
    geometria: montarGeometria(faces, colunas, linhas),
    textura,
    rotulos,
    frentes: faces.map(rotacaoDaFace),
    descartar: unico,   // só os dados fora do cache são apagados ao sair
  };
  if (chave) cache.set(chave, pecas);
  return pecas;
}

export function temWebGL() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

/** Sombra macia (uma mancha redonda) compartilhada por todos os dados */
let texturaSombra = null;
export function sombraRedonda() {
  if (texturaSombra) return texturaSombra;
  const tela = document.createElement('canvas');
  tela.width = tela.height = 128;
  const ctx = tela.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.65)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  texturaSombra = new THREE.CanvasTexture(tela);
  return texturaSombra;
}
