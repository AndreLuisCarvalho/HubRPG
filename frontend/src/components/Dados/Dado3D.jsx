import { LETRA, matrizDaFace, matrizDeFrente, normalGirada, poliedro } from './poliedros';
import styles from './Dado3D.module.scss';

// Luz vindo de cima e um pouco da esquerda (y da tela cresce para baixo)
const LUZ = (() => {
  const v = [-0.35, -0.75, 0.6];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();

// Sombreado fixo por face (sem filter: animar dezenas de faces com filter trava a animação).
// luz < 1 escurece a cor do dado, luz > 1 clareia.
function corDaFace(incidencia) {
  const luz = 0.42 + 0.72 * Math.max(0, incidencia);
  if (luz <= 1) return `color-mix(in srgb, var(--dado) ${Math.round(luz * 100)}%, #050505)`;
  return `color-mix(in srgb, var(--dado) ${Math.round((2 - luz) * 100)}%, #fff)`;
}

const contorno = (pontos, k = 1) =>
  `polygon(${pontos.map(([x, y]) => `${50 + (x - 50) * k}% ${50 + (y - 50) * k}%`).join(',')})`;

/**
 * Um dado em CSS 3D. "estado":
 *  - ocioso:  gira devagar esperando a rolagem
 *  - rolando: entra voando, gira e para com "valor" virado para a frente
 * "usado" = conta no resultado (no teste só o maior d20 conta); "destaque" = brilho embaixo.
 */
export default function Dado3D({
  lados = 20, valor, tamanho = 96, tipo = 'teste', estado = 'rolando', lancamento = {}, usado = true, destaque = false,
  cor, corNumero,
}) {
  const { forma, faces } = poliedro(lados);
  const raio = tamanho / 2;

  // Dado sem forma própria (d3, d100…): usa o d20 e escreve o valor numa das faces
  const rotulos = faces.map((f, i) => {
    if (forma === lados) return f.valor;
    return i === 0 ? valor ?? lados : ((f.valor - 1) % lados) + 1;
  });
  const frente = faces[Math.max(0, rotulos.indexOf(valor ?? lados))];
  const { rx = 720, ry = 540, rz = 180, dx = 0, atraso = 0 } = lancamento;

  const classes = [
    styles.dado,
    styles[estado],
    tipo === 'dano' ? styles.dano : '',
    usado ? '' : styles.apagado,
    destaque ? styles.destaque : '',
  ].join(' ');

  return (
    <div
      className={classes}
      style={{
        '--tam': `${tamanho}px`,
        '--rx': `${rx}deg`,
        '--ry': `${ry}deg`,
        '--rz': `${rz}deg`,
        '--dx': `${dx}px`,
        '--atraso': `${atraso}ms`,
        ...(cor && { '--dado': cor }),
        ...(corNumero && { '--tinta': corNumero }),
      }}
      aria-hidden="true"
    >
      <span className={styles.sombra} />
      <div className={styles.voo}>
        <div className={styles.giro}>
          <div className={styles.corpo} style={{ transform: `rotateX(-18deg) rotateY(16deg) ${matrizDeFrente(frente)}` }}>
            {faces.map((f, i) => {
              const [nx, ny, nz] = normalGirada(f, frente);
              const numero = rotulos[i];
              return (
                <div
                  key={i}
                  className={styles.face}
                  style={{
                    width: tamanho,
                    height: tamanho,
                    left: -raio,
                    top: -raio,
                    transform: matrizDaFace(f, raio),
                    clipPath: contorno(f.pontos),
                  }}
                >
                  {/* Aresta: linha fina mais clara (o chanfro pegando luz); miolo com a cor sombreada */}
                  <span
                    className={styles.miolo}
                    style={{ clipPath: contorno(f.pontos, 0.955), background: corDaFace(nx * LUZ[0] + ny * LUZ[1] + nz * LUZ[2]) }}
                  />
                  <b
                    className={lados > 8 && (numero === 6 || numero === 9) ? styles.sublinhado : ''}
                    style={{ fontSize: raio * LETRA[forma] }}
                  >
                    {numero}
                  </b>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
