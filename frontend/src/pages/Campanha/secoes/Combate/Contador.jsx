import { useEffect, useRef, useState } from 'react';

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Número que corre até o valor novo (como um contador de pontos de vida): desce de um em um no dano
 * e sobe na cura. Sem animação para quem pediu menos movimento.
 */
export default function Contador({ valor, className }) {
  const [mostrado, setMostrado] = useState(valor);
  const atual = useRef(valor);

  useEffect(() => {
    const inicio = atual.current;
    // Sem corrida (valor igual, não numérico ou menos movimento): salta direto no próximo quadro
    const direto = inicio === valor || typeof valor !== 'number' || typeof inicio !== 'number' || semMovimento();
    const duracao = direto ? 0 : Math.min(1100, 260 + Math.abs(valor - inicio) * 45);
    const t0 = performance.now();
    const quadro = { id: 0 };
    const passo = (t) => {
      const k = duracao ? Math.min(1, (t - t0) / duracao) : 1;
      const v = k >= 1 ? valor : Math.round(inicio + (valor - inicio) * (1 - (1 - k) ** 2));
      atual.current = v;
      setMostrado(v);
      if (k < 1) quadro.id = requestAnimationFrame(passo);
    };
    quadro.id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro.id);
  }, [valor]);

  const direcao = mostrado === valor ? undefined : (valor < mostrado ? 'desce' : 'sobe');
  return <span className={className} data-correndo={direcao}>{mostrado}</span>;
}
