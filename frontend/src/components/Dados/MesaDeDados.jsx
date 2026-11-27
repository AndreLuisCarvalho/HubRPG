import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dado3D from './Dado3D';
import Dados3D from './Dados3D';
import { temWebGL } from './dadoWebGL';
import { aparencia } from './skins';
import { escreverFormula, lerFormula, rolarDanos, rolarTeste } from './formula';
import styles from './MesaDeDados.module.scss';

const DURACAO = 1900;   // ms do arremesso de cada dado (os dados em CSS usam $duracao no SCSS)
const FECHA_SOZINHA = 2500;   // ms depois do resultado, nas rolagens do combate
const VAZIA = { grupos: [], bonus: 0, pior: false };

// Muitos dados → dados menores (e um pouco menores no celular)
function tamanhoDosDados(qtd) {
  const celular = window.innerWidth <= 800 ? 0.8 : 1;
  if (qtd <= 3) return 120 * celular;
  if (qtd <= 6) return 92 * celular;
  if (qtd <= 12) return 66 * celular;
  return 50 * celular;
}

const comSinal = (n) => (n >= 0 ? `+ ${n}` : `− ${-n}`);

// "Maior de 3d20: 17 + 5" / "4 + 3 + 6 + 2"
function conta(resultado) {
  if (resultado.tipo === 'teste') {
    const dados = resultado.qtd > 1 ? `${resultado.pior ? 'Menor' : 'Maior'} de ${resultado.qtd}d20: ${resultado.natural}` : `d20: ${resultado.natural}`;
    return resultado.bonus ? `${dados} ${comSinal(resultado.bonus)}` : dados;
  }
  const valores = resultado.dados.map((d) => (d.negativo ? `−${d.valor}` : rotuloDoDado(d)));
  const dados = valores.length > 10 ? `${valores.length} dados: ${resultado.total - resultado.bonus}` : valores.join(' + ');
  return resultado.bonus ? `${dados} ${comSinal(resultado.bonus)}` : dados;
}

// O que está escrito na face (o d100 mostra 00, 10 … 90)
const rotuloDoDado = (d) => (d.numeracao === 'dezenas' ? String(d.valor).padStart(2, '0') : d.valor);

// "1d8+2 corte + 1d4 Morte"
const textoDasPartes = (partes) => partes.map((p) => [p.formula, p.rotulo].filter(Boolean).join(' ')).join(' + ');

// Dano sempre em partes; um pedido antigo com "formula" vira uma parte só
const partesDoPedido = (pedido) => pedido.partes ?? [{ formula: pedido.formula }];

const rolarPedido = (pedido, formula) =>
  (pedido.tipo === 'dano' ? rolarDanos(partesDoPedido(pedido), pedido.mult ?? 1) : rolarTeste(formula));

/**
 * A mesa: a tela escurece e os dados entram voando, giram e param no resultado.
 * Abaixo de cada dado aparece o valor dele; no teste o que conta (maior d20) fica em destaque.
 */
export default function MesaDeDados({ pedido, historico, onRegistrar, onPedir, onFechar }) {
  const caixa = useRef(null);
  const formula = useMemo(() => lerFormula(pedido.formula) ?? VAZIA, [pedido.formula]);
  const ehDano = pedido.tipo === 'dano';
  const mult = pedido.mult ?? 1;
  // Já abre rolando. "pedido.resultado": quem pediu já rolou (a arena de combate) e a mesa só mostra
  const pronto = Boolean(pedido.resultado);
  const [resultado, setResultado] = useState(() => ({ ...(pedido.resultado ?? rolarPedido(pedido, formula)), rodada: 1 }));
  const [parou, setParou] = useState(false);
  // Dados em three.js; sem WebGL (navegador antigo, aceleração desligada) volta para os dados em CSS
  const [webgl, setWebgl] = useState(temWebGL);
  const semWebGL = useCallback(() => setWebgl(false), []);

  useEffect(() => {
    const dialogo = caixa.current;
    dialogo?.showModal();
    return () => dialogo?.close();
  }, []);

  const margem = pedido.ataque?.critico?.margem ?? 20;
  const critico = !ehDano && Boolean(pedido.ataque) && resultado.natural >= margem;

  // Quando o último dado para: mostra o total e guarda no histórico
  useEffect(() => {
    const calmo = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const ultimo = Math.max(0, ...resultado.dados.map((d) => d.atraso));
    const relogio = setTimeout(() => {
      setParou(true);
      onRegistrar({ titulo: pedido.titulo, tipo: resultado.tipo, total: resultado.total });
    }, calmo ? 60 : DURACAO + ultimo);
    return () => clearTimeout(relogio);
  }, [resultado, onRegistrar, pedido.titulo]);

  // Rolagem que já veio pronta (o combate): depois de parar, fecha sozinha em pouco tempo, e
  // qualquer toque fecha na hora (no celular não é preciso achar o "Fechar")
  const fechaSozinha = pronto && !pedido.ataque;
  useEffect(() => {
    if (!parou || !fechaSozinha) return undefined;
    const relogio = setTimeout(onFechar, FECHA_SOZINHA);
    return () => clearTimeout(relogio);
  }, [parou, fechaSozinha, onFechar]);

  function rolarDeNovo() {
    setResultado((atual) => ({ ...rolarPedido(pedido, formula), rodada: atual.rodada + 1 }));
    setParou(false);
  }

  function rolarDanoDoAtaque() {
    const m = critico ? pedido.ataque.critico?.mult ?? 2 : 1;
    onPedir({
      titulo: pedido.titulo,
      subtitulo: critico ? `Dano crítico ×${m}` : 'Dano',
      partes: pedido.ataque.partes,
      tipo: 'dano',
      mult: m,
      estilo: pedido.estilo,   // o dano sai com o dado da mesma ficha
    });
  }

  const tamanho = tamanhoDosDados(resultado.dados.length);
  // Dados em CSS: só a cor base (do kit ou da skin)
  const apCss = (d) => aparencia(pedido.estilo, d.lados, d.skin);
  const variosDados = resultado.dados.length > 1;
  // No teste, o d20 escolhido (maior, ou menor com ↓) é o que se destaca
  const ehEscolhido = (d) => !ehDano && d.usado && d.lados === 20;

  // Valor de cada dado embaixo dele, quando tem mais de um
  const etiqueta = (d, i) => variosDados && (
    <span
      className={`${styles.valor} ${parou ? styles.visivel : ''} ${ehEscolhido(d) ? styles.maior : ''} ${!d.usado ? styles.descartado : ''}`}
      style={{ transitionDelay: parou ? `${i * 40}ms` : '0ms' }}
    >
      {d.negativo ? `−${d.valor}` : rotuloDoDado(d)}
      {d.lados !== 20 && <small>d{d.lados}</small>}
    </span>
  );

  return (
    <dialog
      ref={caixa}
      className={styles.mesa}
      aria-label={`Rolagem: ${pedido.titulo}`}
      onCancel={(e) => { e.preventDefault(); onFechar(); }}
      onClick={(e) => {
        // Combate: depois de parar, tocar em qualquer lugar (fora de um botão) fecha
        if (e.target === e.currentTarget || (fechaSozinha && parou && !e.target.closest('button'))) onFechar();
      }}
    >
      {webgl ? (
        <div className={styles.palco3d} style={{ '--tam': `${tamanho}px` }}>
          <Dados3D
            dados={resultado.dados}
            rodada={resultado.rodada}
            tamanho={tamanho}
            duracao={DURACAO}
            etiqueta={etiqueta}
            onFalha={semWebGL}
            estilo={pedido.estilo}
          />
        </div>
      ) : (
        <div className={styles.palco} style={{ '--tam': `${tamanho}px` }}>
          {resultado.dados.map((d, i) => (
            <div key={`${resultado.rodada}-${i}`} className={styles.vaga}>
              <Dado3D
                lados={d.numeracao ? 10 : d.lados}
                numeracao={d.numeracao}
                valor={d.valor}
                tamanho={tamanho}
                cor={apCss(d).base}
                corNumero={apCss(d).numero}
                lancamento={d}
                usado={d.usado}
                destaque={variosDados && ehEscolhido(d)}
              />
              {etiqueta(d, i)}
            </div>
          ))}
        </div>
      )}

      <section className={styles.painel}>
        <header className={styles.cabeca}>
          {pedido.subtitulo && <small>{pedido.subtitulo}</small>}
          <h2>{pedido.titulo}</h2>
          <code>{ehDano ? textoDasPartes(resultado.partes) : escreverFormula(formula, mult)}</code>
        </header>

        <div className={styles.resultado} aria-live="polite">
          <b className={`${styles.total} ${parou ? styles.mostrar : ''}`}>{parou ? resultado.total : '·'}</b>
          {/* Dano com várias partes: cada tipo com o seu subtotal, na mesma tela */}
          {parou && ehDano && resultado.partes.length > 1 ? (
            <ul className={styles.partes}>
              {resultado.partes.map((p, i) => (
                <li key={i}>
                  <b>{p.total}</b>
                  <span>{p.rotulo || 'dano'}</span>
                  <small>{p.formula}</small>
                </li>
              ))}
            </ul>
          ) : (
            parou && <p className={styles.conta}>{conta(resultado)}</p>
          )}
          {parou && critico && (
            <div className={styles.carimbos}>
              <span className={styles.carimbo}>Crítico</span>
            </div>
          )}
          {/* Carimbos de quem pediu (ex.: ACERTO / FALHA do combate) */}
          {parou && pedido.carimbos?.length > 0 && (
            <div className={styles.carimbos}>
              {pedido.carimbos.map((c) => (
                <span key={c.texto} className={styles.carimbo} data-tom={c.tom}>{c.texto}</span>
              ))}
            </div>
          )}
          {parou && pedido.nota && <p className={styles.conta}>{pedido.nota}</p>}
          <div className={`${styles.botoes} ${parou ? '' : styles.esperando}`}>
            {pedido.ataque?.partes?.length > 0 && (
              <button type="button" className={styles.primario} onClick={rolarDanoDoAtaque} disabled={!parou}>
                Rolar dano{critico ? ` ×${pedido.ataque.critico?.mult ?? 2}` : ''}
              </button>
            )}
            {!pronto && <button type="button" onClick={rolarDeNovo} disabled={!parou}>Rolar de novo</button>}
            {/* Foco no Fechar: Enter/Esc saem rápido */}
            <button type="button" onClick={onFechar} autoFocus className={fechaSozinha && parou ? styles.fechando : undefined}>
              Fechar
            </button>
          </div>
        </div>

        {historico.length > 0 && (
          <div className={styles.historico}>
            <span>Últimas rolagens</span>
            <ol>
              {historico.slice(0, 5).map((h, i) => (
                <li key={i}>
                  <span>{h.titulo}{h.tipo === 'dano' ? ' · dano' : ''}</span>
                  <b>{h.total}</b>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </dialog>
  );
}
