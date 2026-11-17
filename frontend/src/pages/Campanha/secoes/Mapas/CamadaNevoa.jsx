import { useEffect, useImperativeHandle, useRef } from 'react';
import styles from './Visualizador.module.scss';

const RESOLUCAO = 900;   // lado maior da máscara (a névoa não precisa do detalhe da imagem)

const novaTela = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

// Sorteio com semente: o papel manchado sai sempre igual para o mesmo tamanho
function sorteador(semente) {
  let s = semente;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Pergaminho ainda não desenhado: papel claro, manchas de umidade e fibras */
function desenharPapel(w, h) {
  const tela = novaTela(w, h);
  const ctx = tela.getContext('2d');
  const sorte = sorteador(w * 31 + h);
  ctx.fillStyle = '#d9c69c';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 70; i += 1) {
    const x = sorte() * w;
    const y = sorte() * h;
    const r = 20 + sorte() * (Math.max(w, h) / 6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.04 + sorte() * 0.12;
    g.addColorStop(0, `rgba(122, 86, 40, ${a})`);
    g.addColorStop(0.7, `rgba(122, 86, 40, ${a * 0.4})`);
    g.addColorStop(1, 'rgba(122, 86, 40, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fibras do papel
  for (let i = 0; i < (w * h) / 120; i += 1) {
    ctx.fillStyle = `rgba(80, 55, 25, ${0.03 + sorte() * 0.06})`;
    ctx.fillRect(sorte() * w, sorte() * h, 1 + sorte() * 2, 1);
  }
  return tela;
}

/**
 * Névoa do mapa: uma máscara (o que está coberto) desenhada como pergaminho manchado.
 * Na visão do mestre fica meio transparente. O pincel (pintar) revela ou cobre;
 * salvar() exporta a máscara em PNG e avisa onMudar.
 * mascara: '' = tudo coberto · 'limpa' = tudo revelado · data URL = o que foi pintado
 */
export default function CamadaNevoa({ ref, largura, altura, mascara, transparente, onMudar }) {
  const tela = useRef(null);
  const mascaraRef = useRef(null);
  const papel = useRef(null);
  const ultima = useRef(undefined);   // a máscara que já está desenhada (para não recarregar a nossa)
  const quadro = useRef(0);
  const fator = Math.min(1, RESOLUCAO / Math.max(largura, altura));
  const w = Math.round(largura * fator);
  const h = Math.round(altura * fator);

  function redesenhar() {
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      const ctx = tela.current?.getContext('2d');
      if (!ctx || !mascaraRef.current) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(papel.current, 0, 0);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(mascaraRef.current, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  // Telas do tamanho certo (e a máscara precisa ser recarregada)
  useEffect(() => {
    mascaraRef.current = novaTela(w, h);
    papel.current = desenharPapel(w, h);
    ultima.current = undefined;
  }, [w, h]);

  // Carrega a máscara salva (quando muda por fora: abrir o mapa, "revelar tudo", "cobrir tudo")
  useEffect(() => {
    if (mascara === ultima.current) return undefined;
    ultima.current = mascara;
    const ctx = mascaraRef.current.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (mascara === 'limpa') {
      redesenhar();
      return undefined;
    }
    if (!mascara) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      redesenhar();
      return undefined;
    }
    const img = new Image();
    const vivo = { ativo: true };
    img.onload = () => {
      if (!vivo.ativo) return;
      ctx.drawImage(img, 0, 0, w, h);
      redesenhar();
    };
    img.src = mascara;
    return () => { vivo.ativo = false; };
  }, [mascara, w, h]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    // Traço do pincel de a até b (frações do mapa); raio em fração da largura
    pintar(a, b, modo, raio) {
      const ctx = mascaraRef.current.getContext('2d');
      const r = Math.max(2, raio * w);
      const ax = a.x * w;
      const ay = a.y * h;
      const passos = Math.max(1, Math.ceil(Math.hypot(b.x * w - ax, b.y * h - ay) / (r * 0.25)));
      ctx.globalCompositeOperation = modo === 'revelar' ? 'destination-out' : 'source-over';
      for (let i = 0; i <= passos; i += 1) {
        const x = ax + ((b.x * w - ax) * i) / passos;
        const y = ay + ((b.y * h - ay) * i) / passos;
        // Pincel macio: a borda some aos poucos
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(0,0,0,0.5)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.3)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      redesenhar();
    },
    salvar() {
      const url = mascaraRef.current.toDataURL('image/png');
      ultima.current = url;
      onMudar?.(url);
    },
  }), [w, h, onMudar]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={tela}
      width={w}
      height={h}
      className={`${styles.nevoa} ${transparente ? styles.nevoaMestre : ''}`}
      aria-hidden="true"
    />
  );
}
