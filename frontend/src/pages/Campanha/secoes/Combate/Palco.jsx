import { useEffect, useRef } from 'react';
import { condicaoPorId } from './condicoes';
import { estadoAproximado, marcaDe } from './regrasCombate';
import styles from './Palco.module.scss';

/**
 * O palco da luta: agentes à esquerda (retratos redondos), ameaças à direita (caveiras na cor do
 * estado). Quem está na vez cresce e acende; o número pequeno é a posição na ordem dos turnos.
 * Clicar num retrato abre a gaveta dele — ou, durante uma ação, escolhe o alvo.
 */
export default function Palco({
  participantes, ordem, vez, mestre, preparando, mirando, alvos, selecionado, golpes, legenda,
  onEscolher, onIniciativa,
}) {
  const lado = (id) => participantes.filter((p) => p.lado === id);
  const token = (p) => (
    <Token
      key={p.id}
      p={p}
      posicao={ordem.indexOf(p.id) + 1}
      daVez={p.id === vez}
      mestre={mestre}
      preparando={preparando}
      mirando={mirando}
      alvo={alvos.includes(p.id)}
      selecionado={p.id === selecionado}
      golpe={golpes[p.id]}
      onEscolher={() => onEscolher(p)}
      onIniciativa={(v) => onIniciativa(p, v)}
    />
  );

  return (
    <div className={styles.palco} data-mirando={mirando || undefined}>
      <div className={styles.fundo} aria-hidden="true" />
      {mirando && <p className={styles.dicaMira}>Clique em quem vai ser o alvo</p>}
      <div className={styles.lados}>
        <ul className={styles.lado} data-lado="agentes" aria-label="Agentes">
          {lado('agentes').map(token)}
          {!lado('agentes').length && <li className={styles.vazio}>Nenhum agente</li>}
        </ul>
        <ul className={styles.lado} data-lado="ameacas" aria-label="Ameaças">
          {lado('ameacas').map(token)}
          {!lado('ameacas').length && <li className={styles.vazio}>Nenhuma ameaça</li>}
        </ul>
      </div>
      {legenda && <p key={legenda.id} className={styles.legenda} data-tom={legenda.carimbo ?? undefined}>{legenda.mostrar}</p>}
    </div>
  );
}

/* ---------- Um participante ---------- */
function Token({
  p, posicao, daVez, mestre, preparando, mirando, alvo, selecionado, golpe, onEscolher, onIniciativa,
}) {
  const ref = useRef(null);
  const { ver } = p;
  const ameaca = p.lado === 'ameacas';
  const pv = ver.recursos.find((r) => r.id === 'pv');
  const estado = estadoAproximado(pv);
  const marca = marcaDe(p);
  const caiu = estado.id === 'caido' || Boolean(marca && !marca.startsWith('Enlouquecendo'));

  // Golpe: o retrato treme (dano) ou brilha (cura)
  const chave = golpe?.chave;
  const delta = golpe?.delta;
  useEffect(() => {
    if (!chave || !ref.current?.animate) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const quadros = delta < 0
      ? [{ transform: 'translateX(0)' }, { transform: 'translateX(-9px) rotate(-3deg)' }, { transform: 'translateX(7px) rotate(2deg)' },
        { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }]
      : [{ filter: 'brightness(1)' }, { filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }];
    ref.current.animate(quadros, { duration: 420, easing: 'ease-out' });
  }, [chave, delta]);

  const segredo = ameaca && !mestre;
  const rotulo = `${ver.nome}${daVez ? ', na vez' : ''}${segredo ? `, ${estado.rotulo}` : ''}`;

  return (
    <li
      className={styles.token}
      data-lado={p.lado}
      data-vez={daVez || undefined}
      data-caido={caiu || undefined}
      data-oculto={p.oculto || undefined}
      data-alvo={alvo || undefined}
      data-selecionado={selecionado || undefined}
    >
      <button type="button" className={styles.botao} onClick={onEscolher} aria-label={mirando ? `Mirar em ${ver.nome}` : `Abrir ${rotulo}`}>
        <span ref={ref} className={styles.circulo} data-estado={estado.id}>
          {ameaca ? <Caveira /> : (
            ver.imagem ? <img src={ver.imagem} alt="" /> : <b>{ver.nome.charAt(0)}</b>
          )}
          {posicao > 0 && !preparando && <span className={styles.posicao}>{posicao}</span>}
          {marca && <span className={styles.marca}>{marca}</span>}
        </span>
        <span className={styles.placa}>{ver.nome}</span>
      </button>

      {daVez && <span className={styles.suaVez}>Vez</span>}

      {/* Agentes (e o mestre): barras finas. Jogadores veem só o estado das ameaças, pela cor. */}
      {!segredo && (
        <span className={styles.barras} aria-hidden="true">
          {ver.recursos.map((r) => (
            <span key={r.id} style={{ '--cor-barra': r.cor }} title={`${r.sigla} ${r.atual}/${r.maximo}`}>
              <i style={{ width: `${r.maximo ? Math.min(100, (r.atual / r.maximo) * 100) : 0}%` }} />
            </span>
          ))}
        </span>
      )}
      {!segredo && pv && <small className={styles.numeros}>{pv.atual}/{pv.maximo} PV</small>}

      {(p.condicoes ?? []).length > 0 && (
        <span className={styles.condicoes}>
          {p.condicoes.slice(0, 2).map((c) => <i key={c.uid}>{condicaoPorId(c.id)?.nome ?? c.id}</i>)}
          {p.condicoes.length > 2 && <i>+{p.condicoes.length - 2}</i>}
        </span>
      )}

      {preparando && mestre && (
        <label className={styles.ini}>
          <span>INI</span>
          <input
            type="number"
            inputMode="numeric"
            value={p.iniciativa ?? ''}
            onChange={(e) => onIniciativa(e.target.value === '' ? null : Number(e.target.value))}
            aria-label={`Iniciativa de ${ver.nome}`}
          />
        </label>
      )}

      {golpe && (
        <span key={golpe.chave} className={styles.golpe} data-tipo={golpe.delta < 0 ? 'dano' : 'cura'} aria-hidden="true">
          {segredo ? (golpe.delta < 0 ? 'Golpe!' : '+') : `${golpe.delta > 0 ? '+' : '−'}${Math.abs(golpe.delta)}`}
        </span>
      )}
    </li>
  );
}

/* Caveira com ossos cruzados, na cor do estado (currentColor) */
function Caveira() {
  return (
    <svg className={styles.caveira} viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="#0b0b0c" strokeWidth="3" fill="currentColor" strokeLinejoin="round">
        <g transform="rotate(45 50 50)">
          <rect x="10" y="44" width="80" height="12" rx="6" />
          <circle cx="12" cy="44" r="7" /><circle cx="12" cy="56" r="7" />
          <circle cx="88" cy="44" r="7" /><circle cx="88" cy="56" r="7" />
        </g>
        <g transform="rotate(-45 50 50)">
          <rect x="10" y="44" width="80" height="12" rx="6" />
          <circle cx="12" cy="44" r="7" /><circle cx="12" cy="56" r="7" />
          <circle cx="88" cy="44" r="7" /><circle cx="88" cy="56" r="7" />
        </g>
        <path d="M50 18c-15 0-26 10-26 24 0 8 4 14 9 17v9c0 3 2 5 5 5h24c3 0 5-2 5-5v-9c5-3 9-9 9-17 0-14-11-24-26-24z" />
      </g>
      <g fill="#0b0b0c">
        <ellipse cx="40" cy="44" rx="7" ry="8" />
        <ellipse cx="60" cy="44" rx="7" ry="8" />
        <path d="M50 52l-4 8h8z" />
        <rect x="42" y="64" width="3" height="8" rx="1" />
        <rect x="48.5" y="64" width="3" height="8" rx="1" />
        <rect x="55" y="64" width="3" height="8" rx="1" />
      </g>
    </svg>
  );
}
