import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Dado3D from './Dado3D';
import Dados3D from './Dados3D';
import { temWebGL } from './dadoWebGL';
import { aparencia } from './skins';
import { escreverFormula, lerFormula, rolarDano, rolarTeste } from './formula';
import styles from './MesaDeDados.module.scss';

const DURACAO = 1900;   // ms do arremesso de cada dado (os dados em CSS usam $duracao no SCSS)
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
  const valores = resultado.dados.map((d) => (d.negativo ? `−${d.valor}` : d.valor));
  const dados = valores.length > 10 ? `${valores.length} dados: ${resultado.total - resultado.bonus}` : valores.join(' + ');
  return resultado.bonus ? `${dados} ${comSinal(resultado.bonus)}` : dados;
}

const rolarPedido = (pedido, formula) =>
  (pedido.tipo === 'dano' ? rolarDano(formula, pedido.mult ?? 1) : rolarTeste(formula));

/**
 * A mesa: a tela escurece e os dados entram voando, giram e param no resultado.
 * Abaixo de cada dado aparece o valor dele; no teste o que conta (maior d20) fica em destaque.
 */
export default function MesaDeDados({ pedido, historico, onRegistrar, onPedir, onFechar }) {
  const caixa = useRef(null);
  const formula = useMemo(() => lerFormula(pedido.formula) ?? VAZIA, [pedido.formula]);
  const ehDano = pedido.tipo === 'dano';
  const mult = pedido.mult ?? 1;
  // Já abre rolando
  const [resultado, setResultado] = useState(() => ({ ...rolarPedido(pedido, formula), rodada: 1 }));
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

  function rolarDeNovo() {
    setResultado((atual) => ({ ...rolarPedido(pedido, formula), rodada: atual.rodada + 1 }));
    setParou(false);
  }

  function rolarDanoDoAtaque() {
    const m = critico ? pedido.ataque.critico?.mult ?? 2 : 1;
    onPedir({
      titulo: pedido.titulo,
      subtitulo: critico ? `Dano crítico ×${m}` : 'Dano',
      formula: pedido.ataque.dano,
      tipo: 'dano',
      mult: m,
      estilo: pedido.estilo,   // o dano sai com o dado da mesma ficha
    });
  }

  const tamanho = tamanhoDosDados(resultado.dados.length);
  const apCss = aparencia(pedido.estilo, pedido.tipo);   // dados em CSS: só a cor base da skin
  const variosDados = resultado.dados.length > 1;
  // No teste, o d20 escolhido (maior, ou menor com ↓) é o que se destaca
  const ehEscolhido = (d) => !ehDano && d.usado && d.lados === 20;

  // Valor de cada dado embaixo dele, quando tem mais de um
  const etiqueta = (d, i) => variosDados && (
    <span
      className={`${styles.valor} ${parou ? styles.visivel : ''} ${ehEscolhido(d) ? styles.maior : ''} ${!d.usado ? styles.descartado : ''}`}
      style={{ transitionDelay: parou ? `${i * 40}ms` : '0ms' }}
    >
      {d.negativo ? `−${d.valor}` : d.valor}
      {d.lados !== 20 && <small>d{d.lados}</small>}
    </span>
  );

  return (
    <dialog
      ref={caixa}
      className={styles.mesa}
      aria-label={`Rolagem: ${pedido.titulo}`}
      onCancel={(e) => { e.preventDefault(); onFechar(); }}
      onClick={(e) => e.target === e.currentTarget && onFechar()}
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
            tipo={pedido.tipo}
          />
        </div>
      ) : (
        <div className={styles.palco} style={{ '--tam': `${tamanho}px` }}>
          {resultado.dados.map((d, i) => (
            <div key={`${resultado.rodada}-${i}`} className={styles.vaga}>
              <Dado3D
                lados={d.lados}
                valor={d.valor}
                tamanho={tamanho}
                tipo={ehDano ? 'dano' : 'teste'}
                cor={apCss.base}
                corNumero={apCss.numero}
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
          <code>{escreverFormula(formula, mult)}</code>
        </header>

        <div className={styles.resultado} aria-live="polite">
          <b className={`${styles.total} ${parou ? styles.mostrar : ''}`}>{parou ? resultado.total : '·'}</b>
          {parou && <p className={styles.conta}>{conta(resultado)}</p>}
          {parou && critico && (
            <div className={styles.carimbos}>
              <span className={styles.carimbo}>Crítico</span>
            </div>
          )}
          <div className={`${styles.botoes} ${parou ? '' : styles.esperando}`}>
            {pedido.ataque?.dano && (
              <button type="button" className={styles.primario} onClick={rolarDanoDoAtaque} disabled={!parou}>
                Rolar dano{critico ? ` ×${pedido.ataque.critico?.mult ?? 2}` : ''}
              </button>
            )}
            <button type="button" onClick={rolarDeNovo} disabled={!parou}>Rolar de novo</button>
            {/* Foco no Fechar: Enter/Esc saem rápido */}
            <button type="button" onClick={onFechar} autoFocus>Fechar</button>
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
