import { useEffect, useState } from 'react';
import { ImagemEnquadrada } from '../../../../components/Enquadre/Enquadre';
import { api } from '../../../../services/api';
import { cenarioDe } from './cenarios';
import styles from './FundoDoCombate.module.scss';

// Imagens já baixadas ("combate:versão" → data URL): trocar de cenário e voltar não baixa de novo
const baixadas = new Map();

/** A imagem enviada para o combate, buscada só quando a versão muda */
function useImagemDoCombate(combateId, versao) {
  const chave = versao != null ? `${combateId}:${versao}` : null;
  const [imagem, setImagem] = useState(() => (chave ? baixadas.get(chave) ?? null : null));
  useEffect(() => {
    if (!chave) return undefined;
    if (baixadas.has(chave)) { setImagem(baixadas.get(chave)); return undefined; }
    let vivo = true;
    api.fundoDoCombate(combateId)
      .then(({ imagem: src }) => { baixadas.set(chave, src); if (vivo) setImagem(src); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [chave, combateId]);
  return imagem;
}

/**
 * O fundo do campo de duelo: um cenário desenhado (camadas em CSS/SVG, animadas de leve) ou a
 * imagem/GIF que o mestre enviou, enquadrada. Fica atrás das cartas (o pai é position: relative).
 */
export default function FundoDoCombate({ fundo, combateId, className = '' }) {
  const cena = cenarioDe(fundo);
  const imagem = useImagemDoCombate(combateId, cena === 'imagem' ? fundo.versao : null);

  return (
    <div className={`${styles.fundo} ${className}`} data-cena={cena} aria-hidden="true">
      {cena === 'imagem' && (imagem ? <ImagemEnquadrada src={imagem} enquadre={fundo.enquadre} /> : null)}
      {cena !== 'imagem' && <Cena id={cena} />}
      <i className={styles.vinheta} />
    </div>
  );
}

/** Só o desenho do cenário (também usado nas miniaturas da escolha) */
export function Cena({ id }) {
  if (id === 'galpao') return <Galpao />;
  if (id === 'floresta') return <Floresta />;
  if (id === 'ritual') return <Ritual />;
  if (id === 'chuva') return <Chuva />;
  return <i className={styles.sangue} />;
}

function Galpao() {
  return (
    <>
      <i className={styles.galpaoParede} />
      {/* Treliças do telhado */}
      <svg className={styles.galpaoTeto} viewBox="0 0 800 160" preserveAspectRatio="none">
        <path d="M0 150 L400 10 L800 150" />
        <path d="M80 122 L80 150 M160 94 L160 150 M240 66 L240 150 M320 38 L320 150 M400 10 L400 150 M480 38 L480 150 M560 66 L560 150 M640 94 L640 150 M720 122 L720 150" />
        <path d="M80 150 L160 94 M160 150 L240 66 M240 150 L320 38 M320 150 L400 10 M480 150 L400 10 M560 150 L480 38 M640 150 L560 66 M720 150 L640 94" />
        <path d="M0 150 L800 150" />
      </svg>
      <span className={styles.lampada}><i /></span>
      <i className={styles.poeira} />
      <i className={styles.galpaoChao} />
    </>
  );
}

function Floresta() {
  return (
    <>
      <i className={styles.lua} />
      <svg className={styles.arvoresFundo} viewBox="0 0 800 300" preserveAspectRatio="none">
        <path d="M0 300 L0 120 L20 160 L40 90 L60 150 L80 70 L105 160 L120 110 L150 170 L170 60 L195 150 L215 100 L240 170 L260 80 L290 165 L310 120 L340 175 L360 90 L385 160 L410 70 L440 170 L460 110 L490 165 L515 75 L540 160 L560 100 L590 170 L615 85 L640 160 L665 105 L690 170 L715 70 L740 155 L765 110 L800 160 L800 300 Z" />
      </svg>
      <svg className={styles.arvoresFrente} viewBox="0 0 800 400" preserveAspectRatio="none">
        <path d="M0 0 L46 0 L40 400 L0 400 Z M30 60 L-20 120 M34 140 L90 90 M36 210 L-10 260" />
        <path d="M800 0 L748 0 L756 400 L800 400 Z M760 80 L820 130 M758 170 L700 120 M760 250 L810 300" />
        <path d="M110 400 L118 230 L60 260 L120 210 L80 170 L124 190 L130 120 L136 200 L180 160 L140 225 L200 250 L140 245 L146 400 Z" />
        <path d="M690 400 L684 250 L640 280 L682 230 L650 190 L686 210 L690 150 L696 215 L740 180 L700 240 L760 270 L700 262 L708 400 Z" />
      </svg>
      <i className={styles.neblina} />
      <i className={`${styles.neblina} ${styles.neblina2}`} />
    </>
  );
}

function Ritual() {
  const velas = [12, 30, 70, 88];
  return (
    <>
      <i className={styles.ritualBrilho} />
      <svg className={styles.circulo} viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="190" />
        <circle cx="200" cy="200" r="160" />
        <circle cx="200" cy="200" r="70" />
        <path d="M200 40 L339 280 L61 280 Z" />
        <path d="M200 360 L61 120 L339 120 Z" />
        <path d="M200 130 L200 270 M130 200 L270 200" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <g key={a} transform={`rotate(${a} 200 200)`}>
            <path d="M200 18 L192 30 L200 38 L208 30 Z M194 46 L206 46" />
          </g>
        ))}
      </svg>
      {velas.map((x, i) => (
        <span key={x} className={styles.vela} style={{ left: `${x}%`, '--atraso': `${i * 0.37}s` }}><i /></span>
      ))}
    </>
  );
}

function Chuva() {
  return (
    <>
      <i className={styles.ceuChuva} />
      <svg className={styles.predios} viewBox="0 0 800 300" preserveAspectRatio="none">
        <path d="M0 300 L0 90 L70 90 L70 40 L150 40 L150 120 L210 120 L210 70 L290 70 L290 140 L360 140 L360 30 L440 30 L440 110 L520 110 L520 60 L600 60 L600 130 L680 130 L680 80 L760 80 L760 150 L800 150 L800 300 Z" />
      </svg>
      <i className={styles.janelas} />
      <span className={styles.poste}><i /></span>
      <i className={styles.asfalto} />
      <i className={styles.chuva} />
      <i className={`${styles.chuva} ${styles.chuva2}`} />
    </>
  );
}
