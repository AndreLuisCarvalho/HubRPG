import OlhoMedo from './OlhoMedo';
import styles from './EfeitoElemento.module.scss';

// Posições fixas (parecem aleatórias, mas são sempre as mesmas: nada muda entre renders)
const GOTAS = [
  { x: 6, h: 70, d: 0 }, { x: 19, h: 120, d: 0.25 }, { x: 33, h: 50, d: 0.1 }, { x: 52, h: 150, d: 0.35 },
  { x: 67, h: 80, d: 0.05 }, { x: 81, h: 110, d: 0.2 }, { x: 93, h: 60, d: 0.4 },
];
const RUNAS = [
  { r: 'ᚨ', x: 12, d: 0.2 }, { r: 'ᛉ', x: 28, d: 0.5 }, { r: 'ᚷ', x: 45, d: 0.1 },
  { r: 'ᛟ', x: 62, d: 0.6 }, { r: 'ᚱ', x: 76, d: 0.3 }, { r: 'ᛞ', x: 90, d: 0.45 },
];
const CINZAS = Array.from({ length: 14 }, (_, i) => ({ x: (i * 37) % 100, d: (i % 5) * 0.15, t: 1.4 + (i % 4) * 0.25 }));
// Grãos de sal da purificação: espalham em círculo a partir do centro
const SAL = Array.from({ length: 16 }, (_, i) => ({ a: i * 22.5, dist: 90 + (i % 3) * 40, d: (i % 4) * 0.05 }));

// Círculo de proteção: dois anéis e uma estrela de seis pontas, desenhados a giz
const CIRCULO_PROTECAO = [
  'M50 6 a44 44 0 1 0 0.01 0',
  'M50 14 a36 36 0 1 0 0.01 0',
  'M50 16 L79.4 67 L20.6 67 Z',
  'M50 84 L20.6 33 L79.4 33 Z',
];

// Desenho do olho de Conhecimento que se "escreve" na página
const OLHO = 'M10 50 Q50 10 90 50 Q50 90 10 50 Z M50 34 a16 16 0 1 0 0.01 0 M50 44 a6 6 0 1 0 0.01 0';

/**
 * Efeito que toca uma vez ao abrir a página de um ritual. Fica por cima da página,
 * não recebe cliques e some sozinho. Com "reduzir movimento" ligado, não aparece.
 */
export default function EfeitoElemento({ elemento }) {
  return (
    <div className={`${styles.efeito} ${styles[elemento] ?? ''}`} aria-hidden="true">
      {elemento === 'san' && (
        <>
          <div className={styles.manchaSangue} />
          {GOTAS.map((g) => (
            <span key={g.x} className={styles.gota} style={{ '--x': `${g.x}%`, '--h': `${g.h}px`, '--d': `${g.d}s` }} />
          ))}
        </>
      )}

      {elemento === 'con' && (
        <>
          <svg className={styles.olho} viewBox="0 0 100 100"><path d={OLHO} pathLength="1" /></svg>
          {RUNAS.map((r) => (
            <span key={r.r} className={styles.runa} style={{ '--x': `${r.x}%`, '--d': `${r.d}s` }}>{r.r}</span>
          ))}
        </>
      )}

      {elemento === 'ene' && (
        <>
          <div className={styles.chiado} />
          <svg className={styles.raios} viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="62,0 54,22 66,30 50,55 60,62 44,100" />
            <polyline points="18,0 26,18 14,34 28,48 20,70" />
          </svg>
        </>
      )}

      {elemento === 'mor' && (
        <>
          <div className={styles.envelhecer} />
          {CINZAS.map((c) => (
            <span key={c.x} className={styles.cinza} style={{ '--x': `${c.x}%`, '--d': `${c.d}s`, '--t': `${c.t}s` }} />
          ))}
        </>
      )}

      {/* Purificar (esquecer um ritual): não é elemento; luz que lava, círculo de giz e sal */}
      {elemento === 'purificar' && (
        <>
          <div className={styles.luzQueLava} />
          <svg className={styles.protecao} viewBox="0 0 100 100">
            {CIRCULO_PROTECAO.map((d, i) => (
              <path key={d} d={d} pathLength="1" style={{ '--d': `${i * 0.12}s` }} />
            ))}
          </svg>
          {SAL.map((s) => (
            <span key={s.a} className={styles.sal} style={{ '--a': `${s.a}deg`, '--dist': `${s.dist}px`, '--d': `${s.d}s` }} />
          ))}
        </>
      )}

      {/* Medo: um olho enorme e doente toma a tela inteira (ver OlhoMedo) */}
      {elemento === 'med' && <OlhoMedo />}
    </div>
  );
}
