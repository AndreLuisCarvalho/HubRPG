/*
 * Dado em WebGL (three.js), no visual de um d20 de resina: arestas arredondadas e números
 * levemente gravados. Cor e desenho das faces vêm da aparência (skins.js).
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
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LETRA, poliedro } from './poliedros';
import { corDoNumero } from './skins';

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

// Sorteio com semente: o desenho de cada face é sempre o mesmo para a mesma skin
function sorteador(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (texto) => [...texto].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

const novaTela = (colunas, linhas) => {
  const tela = document.createElement('canvas');
  tela.width = colunas * CASA;
  tela.height = linhas * CASA;
  return tela;
};

function escreverNumeros(ctx, rotulos, colunas, forma, lados, cor, gravado) {
  const px = Math.round(LETRA[forma] * (CASA / 2));
  ctx.font = `700 ${px}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const escuro = cor === corDoNumero('#ffffff');   // número escuro em dado claro

  rotulos.forEach((rotulo, i) => {
    const cx = (i % colunas) * CASA + CASA / 2;
    const cy = Math.floor(i / colunas) * CASA + CASA / 2;
    const texto = String(rotulo);
    const medida = ctx.measureText(texto);
    const base = cy + (medida.actualBoundingBoxAscent - medida.actualBoundingBoxDescent) / 2;

    // Gravado: sombra escura em cima (número claro) ou luz embaixo (número escuro)
    if (gravado) {
      ctx.fillStyle = escuro ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.45)';
      ctx.fillText(texto, cx, base + (escuro ? 2 : -3));
    }
    ctx.fillStyle = cor;
    ctx.fillText(texto, cx, base);

    // 6 e 9 sublinhados
    if (lados > 8 && (rotulo === 6 || rotulo === 9)) {
      ctx.fillRect(cx - medida.width / 2, base + px * 0.1, medida.width, Math.max(3, px * 0.07));
    }
  });
}

function comoTextura(tela) {
  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;
  return textura;
}

function desenharAtlas(rotulos, forma, lados, ap) {
  const colunas = Math.ceil(Math.sqrt(rotulos.length));
  const linhas = Math.ceil(rotulos.length / colunas);
  const tela = novaTela(colunas, linhas);
  const ctx = tela.getContext('2d');
  ctx.fillStyle = ap.base;
  ctx.fillRect(0, 0, tela.width, tela.height);

  // Desenho da skin, casa por casa (recortado para não vazar na vizinha)
  if (ap.skin) {
    rotulos.forEach((_, i) => {
      const x = (i % colunas) * CASA;
      const y = Math.floor(i / colunas) * CASA;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, CASA, CASA);
      ctx.clip();
      ap.skin.pintar(ctx, x, y, CASA, sorteador(hash(ap.skin.id) + i * 7919));
      ctx.restore();
    });
  }
  escreverNumeros(ctx, rotulos, colunas, forma, lados, ap.numero, true);

  // Brilho (mapa de emissão: preto não acende). "tudo" acende o desenho e os números; "numeros" só os números.
  let brilho = null;
  if (ap.skin?.brilho) {
    const telaBrilho = novaTela(colunas, linhas);
    const c2 = telaBrilho.getContext('2d');
    c2.fillStyle = '#000';
    c2.fillRect(0, 0, telaBrilho.width, telaBrilho.height);
    if (ap.skin.brilho === 'tudo') {
      rotulos.forEach((_, i) => {
        const x = (i % colunas) * CASA;
        const y = Math.floor(i / colunas) * CASA;
        c2.save();
        c2.beginPath();
        c2.rect(x, y, CASA, CASA);
        c2.clip();
        ap.skin.pintar(c2, x, y, CASA, sorteador(hash(ap.skin.id) + i * 7919));   // mesmo desenho da face
        c2.restore();
      });
    }
    escreverNumeros(c2, rotulos, colunas, forma, lados, ap.numero, false);
    brilho = comoTextura(telaBrilho);
  }

  return { textura: comoTextura(tela), brilho, colunas, linhas };
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
const LIMITE_CACHE = 24;

/**
 * Geometria, texturas e a rotação de cada face de um dado de "lados" lados com a aparência "ap"
 * (de skins.js). A geometria é uma só por forma; as texturas, uma por forma + aparência.
 */
export function pecasDoDado(lados, valor, ap) {
  const { forma, faces } = poliedro(lados);
  const unico = lados > 20;
  const chave = unico ? null : `${lados}|${ap.chave}`;
  if (chave && cache.has(chave)) {
    // Mais recente vai para o fim (o primeiro é o primeiro a sair)
    const pecas = cache.get(chave);
    cache.delete(chave);
    cache.set(chave, pecas);
    return pecas;
  }

  const rotulos = rotular(lados, forma, faces, valor);
  const { textura, brilho, colunas, linhas } = desenharAtlas(rotulos, forma, lados, ap);
  const pecas = {
    geometria: geometriaDa(forma, faces, colunas, linhas, unico),
    textura,
    brilho,
    rotulos,
    frentes: faces.map(rotacaoDaFace),
    descartar: unico,   // só os dados fora do cache são apagados ao sair
  };
  if (chave) {
    cache.set(chave, pecas);
    // Arrastar o seletor de cor cria uma textura por cor: guarda só as mais recentes
    while (cache.size > LIMITE_CACHE) {
      const [antiga, velhas] = cache.entries().next().value;
      cache.delete(antiga);
      velhas.textura.dispose();
      velhas.brilho?.dispose();
    }
  }
  return pecas;
}

// O atlas tem sempre a mesma grade para a mesma forma, então a geometria pode ser compartilhada
const geometrias = new Map();
function geometriaDa(forma, faces, colunas, linhas, unico) {
  if (unico) return montarGeometria(faces, colunas, linhas);
  if (!geometrias.has(forma)) geometrias.set(forma, montarGeometria(faces, colunas, linhas));
  return geometrias.get(forma);
}

/** Os dois materiais do dado: faces (com os números) e arestas arredondadas */
export function materiaisDo(pecas, ap) {
  const acabamento = { roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, ...ap.material };
  const brilho = pecas.brilho
    ? { emissive: 0xffffff, emissiveMap: pecas.brilho, emissiveIntensity: ap.skin?.intensidade ?? 1 }
    : {};
  return [
    new THREE.MeshPhysicalMaterial({ map: pecas.textura, ...acabamento, ...brilho }),
    new THREE.MeshPhysicalMaterial({ color: ap.aresta, ...acabamento }),
  ];
}

/** Renderizador, cena, luzes e reflexos do ambiente, prontos numa <canvas> */
export function criarPalco(canvas, { fov = 26, distancia = 30 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environment = ambiente;
  cena.environmentIntensity = 0.55;

  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(-4, 7, 10);
  const contraluz = new THREE.DirectionalLight(0xffe2c4, 0.6);
  contraluz.position.set(6, -3, 4);
  cena.add(sol, contraluz);

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(0, 0, distancia);

  return {
    renderer,
    cena,
    camera,
    descartar() {
      ambiente.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
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
