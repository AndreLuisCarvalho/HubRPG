import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { criarPalco, faceDoValor, materiaisDo, pecasDoDado, sombraRedonda } from './dadoWebGL';
import { aparencia } from './skins';
import { esperarImagens } from './imagensDeDado';
import styles from './Dados3D.module.scss';

const FOV = 26;
const DISTANCIA = 30;
const Z = new THREE.Vector3(0, 0, 1);

/*
 * Arremesso: a mesa é o plano da tela e "pular" é vir na direção de quem olha (z).
 *  - deslizar: o dado atravessa a mesa freando (atrito)
 *  - quicar: pulos cada vez menores até assentar
 *  - rolar: o giro acompanha o deslize (eixo deitado na mesa, de lado para o movimento)
 *  - balançar: no fim, um chacoalho curto antes de parar
 * Ao parar, a face sorteada fica de frente para a câmera.
 */
const limitar = (t) => Math.min(1, Math.max(0, t));
const deslizar = (t) => 1 - (1 - t) ** 3;
const QUIQUES = [[0, 0.36, 1], [0.36, 0.6, 0.42], [0.6, 0.76, 0.16], [0.76, 0.87, 0.05]];   // [início, fim, altura]
function alturaDoPulo(t) {
  const quique = QUIQUES.find(([a, b]) => t >= a && t < b);
  if (!quique) return 0;
  const [a, b, h] = quique;
  return h * Math.sin((Math.PI * (t - a)) / (b - a));
}
function balanco(t) {
  if (t < 0.76) return 0;
  const s = t - 0.76;
  return 0.22 * Math.exp(-s * 12) * Math.sin(s * 42) * ((1 - t) / 0.24);   // zera no fim
}

/** Vagas dos dados (em px, dentro da área): linhas centralizadas, com espaço para o valor embaixo */
function montarVagas(qtd, tamanho) {
  const largura = Math.min(760, (typeof window === 'undefined' ? 760 : window.innerWidth) - 32);
  const casa = tamanho * 1.5;
  const linhaAltura = tamanho + 52;
  const colunas = Math.max(1, Math.min(qtd, Math.floor(largura / casa)));
  const linhas = Math.ceil(qtd / colunas);
  const vagas = Array.from({ length: qtd }, (_, i) => {
    const lin = Math.floor(i / colunas);
    const naLinha = lin === linhas - 1 ? qtd - lin * colunas : colunas;
    const col = i % colunas;
    return { x: (colunas - naLinha) * (casa / 2) + (col + 0.5) * casa, y: lin * linhaAltura + 12 + tamanho / 2 };
  });
  return { largura: colunas * casa, altura: linhas * linhaAltura, vagas };
}

/**
 * Os dados em 3D de verdade (three.js). Uma tela transparente cobre a janela toda: os dados entram
 * voando de baixo (passando por cima do painel) e param nas vagas, acima do painel.
 * "etiqueta(d, i)" desenha o que vai embaixo de cada dado (o valor).
 */
// estilo = o kit de dados da ficha que rolou (skins.js)
export default function Dados3D({ dados, rodada, tamanho, duracao, etiqueta, onFalha, estilo }) {
  const area = useRef(null);
  const tela = useRef(null);
  const mundo = useRef(null);
  const { largura, altura, vagas } = useMemo(() => montarVagas(dados.length, tamanho), [dados.length, tamanho]);

  /* ---------- Palco: renderizador, câmera e luz (uma vez) ---------- */
  useEffect(() => {
    let palco;
    try {
      palco = criarPalco(tela.current, { fov: FOV, distancia: DISTANCIA });
    } catch {
      onFalha?.();
      return undefined;
    }
    const { renderer, camera } = palco;
    mundo.current = { ...palco, ajustar: [], desenhar: null };

    // Tamanho da tela = janela; px → mundo no plano z = 0
    function medir() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      mundo.current.pxMundo = (2 * DISTANCIA * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / h;
      mundo.current.ajustar.forEach((f) => f());
      mundo.current.desenhar?.();
    }
    mundo.current.medir = medir;
    medir();
    window.addEventListener('resize', medir);
    const dialogo = tela.current.closest('dialog');
    dialogo?.addEventListener('scroll', medir);
    // O painel cresce quando o resultado aparece e a mesa (centralizada) sobe: os dados acompanham
    const observador = new ResizeObserver(() => medir());
    [...(dialogo?.children ?? [])].forEach((filho) => observador.observe(filho));

    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
      dialogo?.removeEventListener('scroll', medir);
      palco.descartar();   // a tela some junto com a mesa; o navegador libera o contexto
      mundo.current = null;
    };
  }, [onFalha]);

  /* ---------- Os dados desta rodada ---------- */
  useEffect(() => {
    const m = mundo.current;
    if (!m) return undefined;
    const vivo = { quadro: 0, cancelado: false };   // muda fora da renderização (animação)
    const objetos = [];

    // Centro de cada vaga em coordenadas do mundo (a área HTML diz onde as vagas estão na tela)
    function alvos() {
      const caixa = area.current.getBoundingClientRect();
      const w = window.innerWidth;
      const h = window.innerHeight;
      return vagas.map((v) => new THREE.Vector3(
        (caixa.left + v.x - w / 2) * m.pxMundo,
        -(caixa.top + v.y - h / 2) * m.pxMundo,
        0,
      ));
    }

    async function montar() {
      // O atlas dos números usa a fonte da página: espera ela carregar
      await document.fonts?.load('700 64px "Barlow Condensed"').catch(() => {});
      // Imagens próprias do kit (fundo das faces): o arremesso já sai com elas
      await esperarImagens(estilo);
      if (vivo.cancelado) return;
      const destinos = alvos();
      const raio = (tamanho / 2) * m.pxMundo;
      // De onde vem o arremesso nesta rodada: qualquer direção, de fora da tela (o "ry" do 1º dado é sorteado)
      const angulo = THREE.MathUtils.degToRad(((dados[0]?.ry ?? 0) % 360 + 360) % 360);
      const direcao = new THREE.Vector3(Math.cos(angulo), Math.sin(angulo), 0);
      const lateral = new THREE.Vector3(-direcao.y, direcao.x, 0);   // para espalhar os dados lado a lado
      const foraDaTela = Math.hypot(window.innerWidth, window.innerHeight) / 2 * m.pxMundo;

      dados.forEach((d, i) => {
        // Cada peça com a sua aparência: a do kit (d4, d6 … d100) ou a skin da parte do dano (ex.: Morte)
        const ap = aparencia(estilo, d.lados, d.skin);
        const pecas = pecasDoDado(d.lados, d.valor, ap, d.numeracao);
        const indice = faceDoValor(pecas, d);
        const materiais = materiaisDo(pecas, ap);
        const malha = new THREE.Mesh(pecas.geometria, materiais);
        const sombra = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ map: sombraRedonda(), transparent: true, depthWrite: false, opacity: 0 }),
        );
        m.cena.add(sombra, malha);

        // Todos saem do mesmo ponto fora da tela (a "mão"), espalhando um pouco de lado
        const inicio = direcao.clone()
          .multiplyScalar(foraDaTela + raio * 2)
          .addScaledVector(lateral, d.dx * m.pxMundo * 0.4);
        objetos.push({
          d, i, malha, sombra, materiais, pecas, raio, inicio, ap,
          destino: destinos[i],
          frente: pecas.frentes[indice],
          // Ao parar, um giro qualquer em volta do próprio eixo de visão (a face continua de frente)
          rolagem: new THREE.Quaternion().setFromAxisAngle(Z, THREE.MathUtils.degToRad(d.rz % 35)),
          voltas: (Math.abs(d.rx) / 360) * Math.PI * 2 + Math.PI,
          desvio: (d.ry % 30) / 100,   // eixo de rolagem levemente torto: o dado "capota" de lado
        });
      });

      m.ajustar = [() => {
        const novos = alvos();
        objetos.forEach((o) => { o.destino = novos[o.i]; });
      }];

      const comeco = performance.now();
      const calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const tempo = calmo ? 1 : duracao;
      const giro = new THREE.Quaternion();
      const paraCamera = new THREE.Quaternion();
      const caminho = new THREE.Vector3();
      const eixo = new THREE.Vector3();

      function desenhar(agora = performance.now()) {
        let ativo = false;
        for (const o of objetos) {
          const t = limitar((agora - comeco - (calmo ? 0 : o.d.atraso)) / tempo);
          const depois = limitar((agora - comeco - (calmo ? 0 : o.d.atraso) - tempo + 100) / 450);
          if (t < 1 || depois < 1) ativo = true;
          const pulo = o.raio * 3.4;
          const h = alturaDoPulo(t) * pulo;
          const p = deslizar(t);

          // Posição: desliza pela mesa e pula na direção da câmera
          o.malha.position.lerpVectors(o.inicio, o.destino, p);
          o.malha.position.z = h;
          o.malha.scale.setScalar(o.raio * (1 + 0.1 * (h / pulo)));

          // Rolar: eixo deitado na mesa, de lado para o caminho; o giro freia junto com o deslize
          caminho.subVectors(o.destino, o.inicio).normalize();
          eixo.set(-caminho.y, caminho.x, o.desvio).normalize();
          giro.setFromAxisAngle(eixo, -(o.voltas * (1 - p) + balanco(t)));

          // Fim: a face sorteada aponta para a câmera (corrige a perspectiva dos dados fora do centro)
          caminho.subVectors(m.camera.position, o.destino).normalize();
          paraCamera.setFromUnitVectors(Z, caminho);
          o.malha.quaternion.copy(giro).multiply(paraCamera).multiply(o.rolagem).multiply(o.frente);

          // Sombra na mesa: se afasta e espalha quando o dado sobe
          const subida = h / pulo;
          o.sombra.position.set(o.malha.position.x + h * 0.3, o.malha.position.y - o.raio * 0.95 - h * 0.18, -o.raio * 1.2);
          o.sombra.scale.set(o.raio * 2.2 * (1 + subida * 0.5), o.raio * 0.55 * (1 + subida * 0.5), 1);
          o.sombra.material.opacity = 0.9 * (1 - 0.6 * subida) * limitar(t * 6);

          // Dados que não contam escurecem depois de parar
          if (!o.d.usado) {
            const luz = 1 - 0.55 * depois;
            o.materiais[0].color.setScalar(luz);
            o.materiais[1].color.set(o.ap.aresta).multiplyScalar(luz);
            if (o.materiais[0].emissiveMap) o.materiais[0].emissiveIntensity = (o.ap.skin?.intensidade ?? 1) * luz;
          }
        }
        m.renderer.render(m.cena, m.camera);
        return ativo;
      }
      m.desenhar = () => desenhar();

      const animar = (agora) => {
        if (vivo.cancelado) return;
        if (desenhar(agora)) vivo.quadro = requestAnimationFrame(animar);
      };
      vivo.quadro = requestAnimationFrame(animar);
    }

    montar();

    return () => {
      vivo.cancelado = true;
      cancelAnimationFrame(vivo.quadro);
      for (const o of objetos) {
        m.cena.remove(o.malha, o.sombra);
        o.materiais.forEach((mat) => mat.dispose());
        o.sombra.geometry.dispose();
        o.sombra.material.dispose();
        if (o.pecas.descartar) {
          o.pecas.geometria.dispose();
          o.pecas.textura.dispose();
          o.pecas.brilho?.dispose();
        }
      }
      m.ajustar = [];
      m.desenhar = null;
      if (mundo.current) m.renderer.render(m.cena, m.camera);
    };
  }, [dados, rodada, tamanho, duracao, vagas, estilo]);

  return (
    <div ref={area} className={styles.area} style={{ width: largura, height: altura }}>
      <canvas ref={tela} className={styles.tela} aria-hidden="true" />
      {vagas.map((v, i) => (
        <div key={`${rodada}-${i}`} className={styles.vaga} style={{ left: v.x, top: v.y + tamanho / 2 + 14 }}>
          {etiqueta?.(dados[i], i)}
        </div>
      ))}
    </div>
  );
}
