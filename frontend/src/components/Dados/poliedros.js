/*
 * Geometria dos dados (d4, d6, d8, d10, d12, d20) para desenhar em CSS 3D.
 * Cada dado nasce de uma lista de vértices; as faces são achadas sozinhas (planos que deixam
 * todos os vértices do mesmo lado). Para cada face guardamos:
 *  - "matriz": leva um quadrado 2D centrado na origem até a face (matrix3d)
 *  - "pontos": o contorno da face em % do quadrado (clip-path)
 *  - "frente": a rotação que deixa essa face virada para quem olha, com o número de pé
 * Tudo em unidades do raio: quem desenha multiplica pelo tamanho em px.
 */

const PHI = (1 + Math.sqrt(5)) / 2;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const escala = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norma = (a) => Math.hypot(...a);
const unit = (a) => escala(a, 1 / norma(a));

// Todas as combinações de sinais: sinais([1, PHI, 0]) → (±1, ±PHI, 0)
function sinais(base) {
  let lista = [[]];
  for (const v of base) lista = lista.flatMap((p) => (v === 0 ? [[...p, 0]] : [[...p, v], [...p, -v]]));
  return lista;
}
const ciclos = ([a, b, c]) => [[a, b, c], [b, c, a], [c, a, b]];

// d10: trapezoedro pentagonal. A altura das pontas é a que deixa cada face (pipa) plana.
function d10() {
  const z = 0.12;
  const cos36 = Math.cos(Math.PI / 5);
  const ponta = (z * (1 + cos36)) / (1 - cos36);
  const anel = (desvio, altura) => Array.from({ length: 5 }, (_, k) => {
    const ang = (2 * Math.PI * k) / 5 + desvio;
    return [Math.cos(ang), Math.sin(ang), altura];
  });
  return [[0, 0, ponta], [0, 0, -ponta], ...anel(0, z), ...anel(Math.PI / 5, -z)];
}

const VERTICES = {
  4: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  6: sinais([1, 1, 1]),
  8: ciclos([1, 0, 0]).flatMap(sinais),
  10: d10(),
  12: [...sinais([1, 1, 1]), ...ciclos([0, 1 / PHI, PHI]).flatMap(sinais)],
  20: ciclos([0, 1, PHI]).flatMap(sinais),
};

// Onde fica o "alto" do número: na ponta (triângulos, pipas) ou no meio de uma aresta (quadrados)
const TOPO = { 4: 'vertice', 6: 'aresta', 8: 'vertice', 10: 'longe', 12: 'vertice', 20: 'vertice' };
// Tamanho do número em relação ao raio
export const LETRA = { 4: 0.5, 6: 0.74, 8: 0.56, 10: 0.42, 12: 0.5, 20: 0.42 };

function acharFaces(vs) {
  const EPS = 1e-6;
  const vistas = new Map();
  for (let i = 0; i < vs.length; i++) {
    for (let j = i + 1; j < vs.length; j++) {
      for (let k = j + 1; k < vs.length; k++) {
        let n = cross(sub(vs[j], vs[i]), sub(vs[k], vs[i]));
        if (norma(n) < EPS) continue;
        n = unit(n);
        const lados = vs.map((v) => dot(n, sub(v, vs[i])));
        if (lados.some((s) => s > EPS) && lados.some((s) => s < -EPS)) continue;   // corta o sólido: não é face
        if (lados.some((s) => s > EPS)) n = escala(n, -1);                         // normal para fora
        const noPlano = lados.flatMap((s, idx) => (Math.abs(s) < EPS ? [idx] : []));
        const chave = noPlano.join(',');
        if (!vistas.has(chave)) vistas.set(chave, { indices: noPlano, n });
      }
    }
  }
  return [...vistas.values()];
}

function montar(lados) {
  // Raio 1 (o vértice mais distante encosta na esfera de raio 1)
  const bruto = VERTICES[lados];
  const r = Math.max(...bruto.map(norma));
  const vs = bruto.map((v) => escala(v, 1 / r));

  const faces = acharFaces(vs).map(({ indices, n }) => {
    const pts = indices.map((i) => vs[i]);
    const c = escala(pts.reduce(soma, [0, 0, 0]), 1 / pts.length);

    // Ordena o contorno em volta do centro
    const b1 = unit(sub(pts[0], c));
    const b2 = cross(n, b1);
    pts.sort((p, q) => Math.atan2(dot(sub(p, c), b2), dot(sub(p, c), b1)) - Math.atan2(dot(sub(q, c), b2), dot(sub(q, c), b1)));

    let alvo;
    if (TOPO[lados] === 'aresta') alvo = escala(soma(pts[0], pts[1]), 0.5);
    else if (TOPO[lados] === 'longe') alvo = pts.reduce((m, p) => (norma(sub(p, c)) > norma(sub(m, c)) ? p : m));
    else alvo = pts[0];

    // Base da face: e2 aponta para baixo do número (CSS: y cresce para baixo), e1 × e2 = n
    const e2 = escala(unit(sub(alvo, c)), -1);
    const e1 = cross(e2, n);

    return {
      n,
      c,
      e1,
      e2,
      cantos: pts,   // vértices 3D da face, já em volta do centro (para o dado em WebGL)
      // contorno em % de um quadrado de lado 2 (raio 1 para cada lado)
      pontos: pts.map((p) => {
        const d = sub(p, c);
        return [50 + dot(d, e1) * 50, 50 + dot(d, e2) * 50];
      }),
    };
  });

  numerar(faces, lados);
  return faces;
}

// Faces opostas somam lados + 1, como nos dados de verdade
function numerar(faces, lados) {
  let proximo = 1;
  for (const face of faces) {
    if (face.valor) continue;
    face.valor = proximo;
    const oposta = faces.find((f) => !f.valor && dot(f.n, face.n) < -0.999);
    if (oposta) oposta.valor = lados + 1 - proximo;
    proximo += 1;
    while (faces.some((f) => f.valor === proximo)) proximo += 1;
  }
}

const cache = new Map();

/** Faces do dado de "lados" lados. Dados sem forma própria (d3, d100…) usam o d20 com números próprios. */
export function poliedro(lados) {
  const forma = VERTICES[lados] ? lados : 20;
  if (!cache.has(forma)) cache.set(forma, montar(forma));
  return { forma, faces: cache.get(forma) };
}

/** matrix3d que leva o quadrado da face (centrado na origem, lado 2R) até o lugar dela no dado */
export function matrizDaFace({ e1, e2, n, c }, raio) {
  return `matrix3d(${[...e1, 0, ...e2, 0, ...n, 0, ...escala(c, raio), 1].map((x) => +x.toFixed(5)).join(',')})`;
}

/** Rotação que vira a face para a frente (eixo z da tela) com o número de pé */
export function matrizDeFrente({ e1, e2, n }) {
  const m = [e1[0], e2[0], n[0], 0, e1[1], e2[1], n[1], 0, e1[2], e2[2], n[2], 0, 0, 0, 0, 1];
  return `matrix3d(${m.map((x) => +x.toFixed(5)).join(',')})`;
}

/** Normal da face depois de girar o dado para mostrar "frente" (para a luz de cada face) */
export function normalGirada(face, frente) {
  const { e1, e2, n } = frente;
  return [dot(e1, face.n), dot(e2, face.n), dot(n, face.n)];
}
