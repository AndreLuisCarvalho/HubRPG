import { useEffect, useRef, useState } from 'react';
import { ELEMENTOS } from '../../../../sistemas/ordemParanormal/modelo';
import { estadoAproximado } from './regrasCombate';
import styles from './CartaCombatente.module.scss';

const TIPOS = { jogador: 'Agente', npc: 'NPC', monstro: 'Ameaça' };

/**
 * Carta de quem está na luta: retrato, iniciativa, barras e (para o mestre) dano/cura à mão.
 * golpe: { chave, delta, sigla, cor } do último ajuste; uma chave nova faz o número saltar.
 */
export default function CartaCombatente({
  participante: p, ver, mestre, daVez, preparando, golpe,
  onIniciativa, onRolarIniciativa, onAjustar, onRevelar, onTirar, onMover,
}) {
  const ref = useRef(null);
  const [ajustando, setAjustando] = useState(false);
  const [recursoId, setRecursoId] = useState('pv');
  const [valor, setValor] = useState('');
  const ameaca = p.lado === 'ameacas';
  const segredo = ameaca && !mestre;   // jogadores não veem os números das ameaças
  const pv = ver.recursos.find((r) => r.id === 'pv');
  const san = ver.recursos.find((r) => r.id === 'san');
  const cor = ELEMENTOS[ver.elemento]?.cor;

  let marca = null;
  if (pv && pv.maximo > 0 && pv.atual === 0) marca = ameaca ? 'Derrotado' : 'Morrendo';
  else if (san && san.atual === 0) marca = 'Enlouquecendo';

  // Golpe: a carta treme (dano) ou brilha (cura)
  const chaveGolpe = golpe?.chave;
  const deltaGolpe = golpe?.delta;
  useEffect(() => {
    if (!chaveGolpe || !ref.current?.animate) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const quadros = deltaGolpe < 0
      ? [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px) rotate(-1deg)' }, { transform: 'translateX(6px) rotate(1deg)' },
        { transform: 'translateX(-4px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }]
      : [{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)' }, { filter: 'brightness(1)' }];
    ref.current.animate(quadros, { duration: 420, easing: 'ease-out' });
  }, [chaveGolpe, deltaGolpe]);

  function aplicar(sinal) {
    const n = Math.abs(parseInt(valor, 10));
    if (!n) return;
    onAjustar(recursoId, sinal * n);
    setValor('');
  }

  const classes = [
    styles.carta,
    daVez && styles.daVez,
    marca && styles.caida,
    p.oculto && styles.oculta,
  ].filter(Boolean).join(' ');

  return (
    <li ref={ref} className={classes} data-lado={p.lado} style={cor ? { '--elemento': cor } : undefined}>
      {daVez && <span className={styles.selo}>Sua vez</span>}
      {p.oculto && <span className={styles.carimboOculto}>Oculto</span>}

      <div className={styles.cabeca}>
        <span className={styles.retrato} aria-hidden="true">
          {ver.imagem ? <img src={ver.imagem} alt="" /> : <b>{ver.nome.charAt(0)}</b>}
        </span>
        <div className={styles.identidade}>
          <h3 title={ver.nome}>{ver.nome}</h3>
          <small>{ver.doLivro ? 'Do livro' : TIPOS[ver.tipo] ?? '—'}{!segredo && ver.defesa !== '—' && ` · Defesa ${ver.defesa}`}</small>
        </div>
        <Iniciativa
          valor={p.iniciativa}
          editavel={mestre && preparando}
          onMudar={onIniciativa}
          onRolar={onRolarIniciativa}
          formula={ver.formula}
        />
      </div>

      {marca && <span className={styles.marca}>{marca}</span>}

      {segredo ? (
        !marca && <p className={styles.aproximado} data-estado={estadoAproximado(pv).id}>{estadoAproximado(pv).rotulo}</p>
      ) : (
        <div className={styles.barras}>
          {ver.recursos.map((r) => (
            <div key={r.id} className={styles.barra} style={{ '--cor-barra': r.cor }}>
              <span className={styles.sigla}>{r.sigla}</span>
              <span className={styles.trilho}>
                <span style={{ width: `${r.maximo ? Math.min(100, (r.atual / r.maximo) * 100) : 0}%` }} />
              </span>
              <span className={styles.numero}>{r.atual}<small>/{r.maximo}</small>{r.temporario > 0 && <em> +{r.temporario}</em>}</span>
            </div>
          ))}
        </div>
      )}

      {golpe && (
        <span key={golpe.chave} className={styles.golpe} data-tipo={golpe.delta < 0 ? 'dano' : 'cura'} style={{ '--cor-golpe': golpe.cor }} aria-hidden="true">
          {segredo ? (golpe.delta < 0 ? 'Golpe!' : '+') : `${golpe.delta > 0 ? '+' : '−'}${Math.abs(golpe.delta)}`}
        </span>
      )}

      {mestre && !ver.perdida && (
        <div className={styles.controles}>
          {ajustando ? (
            <form className={styles.ajuste} onSubmit={(e) => { e.preventDefault(); aplicar(-1); }}>
              {ver.recursos.length > 1 && (
                <div className={styles.recursos} role="radiogroup" aria-label="Recurso">
                  {ver.recursos.map((r) => (
                    <button key={r.id} type="button" role="radio" aria-checked={recursoId === r.id} onClick={() => setRecursoId(r.id)}>{r.sigla}</button>
                  ))}
                </div>
              )}
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Quanto"
                aria-label="Quantidade"
                autoFocus
              />
              <button type="submit" className={styles.dano}>Dano</button>
              <button type="button" className={styles.cura} onClick={() => aplicar(1)}>Cura</button>
              <button type="button" className={styles.fecharAjuste} onClick={() => setAjustando(false)} aria-label="Fechar ajuste">✕</button>
            </form>
          ) : (
            <>
              <button type="button" className={styles.botaoAjustar} onClick={() => setAjustando(true)}>± Dano / cura</button>
              <span className={styles.mais}>
                <button type="button" onClick={() => onMover(-1)} title="Agir antes" aria-label={`Mover ${ver.nome} para antes`}>▲</button>
                <button type="button" onClick={() => onMover(1)} title="Agir depois" aria-label={`Mover ${ver.nome} para depois`}>▼</button>
                <button type="button" onClick={onRevelar} title={p.oculto ? 'Revelar aos jogadores' : 'Esconder dos jogadores'} aria-label={p.oculto ? 'Revelar' : 'Ocultar'}>{p.oculto ? '◉' : '◌'}</button>
                <button type="button" onClick={onTirar} title="Tirar do combate" aria-label={`Tirar ${ver.nome} do combate`}>✕</button>
              </span>
            </>
          )}
        </div>
      )}
      {mestre && ver.perdida && (
        <div className={styles.controles}>
          <button type="button" className={styles.botaoAjustar} onClick={onTirar}>Tirar do combate</button>
        </div>
      )}
    </li>
  );
}

function Iniciativa({ valor, editavel, onMudar, onRolar, formula }) {
  if (!editavel) {
    return (
      <span className={styles.iniciativa} title="Iniciativa">
        <small>INI</small>
        <b>{valor ?? '—'}</b>
      </span>
    );
  }
  return (
    <span className={`${styles.iniciativa} ${styles.editando}`}>
      <small>INI</small>
      <input
        type="number"
        inputMode="numeric"
        value={valor ?? ''}
        onChange={(e) => onMudar(e.target.value === '' ? null : Number(e.target.value))}
        aria-label="Iniciativa"
      />
      <button type="button" onClick={onRolar} title={`Rolar ${formula}`} aria-label={`Rolar iniciativa (${formula})`}>⚄</button>
    </span>
  );
}
