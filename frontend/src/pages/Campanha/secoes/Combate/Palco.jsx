import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ELEMENTOS } from '../../../../sistemas/ordemParanormal/modelo';
import Contador from './Contador';
import FundoDoCombate from './FundoDoCombate';
import IconeCondicao from './IconeCondicao';
import { condicaoPorId, corDaCondicao, rodadasRestantes, textoDaCondicao } from './condicoes';
import { estadoAproximado, marcaDe } from './regrasCombate';
import styles from './Palco.module.scss';

const semMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * O campo de duelo: ameaças numa fileira em cima, agentes embaixo, cada um numa carta em pé.
 * Quem está na vez sobe e acende. No ataque, a carta do atacante avança até o alvo e volta.
 * Clicar numa carta abre a ficha rápida — ou, com uma carta da mão em jogo, escolhe o alvo.
 * "avisos": o que acabou de acontecer, no topo do campo.
 */
export default function Palco({
  participantes, vez, mestre, preparando, mirando, alvos, selecionado, golpes, avisos = null, ultimoAtaque, inspecao,
  onEscolher, onIniciativa, fundo = null, combateId, rodada = 1, mira = null,
}) {
  const cartas = useRef(new Map());
  const palco = useRef(null);
  const visto = useRef(ultimoAtaque?.id);

  // Na mira: a ameaça escolheu o alvo (mira = { autor, alvos }); uma seta liga as cartas
  const alvosDaMira = mira?.alvos ?? [];
  const chaveDaMira = mira ? `${mira.autor}>${alvosDaMira.join(',')}` : '';
  const [setas, setSetas] = useState([]);
  useLayoutEffect(() => {
    if (!chaveDaMira) { setSetas([]); return undefined; }
    let quadro = 0;
    const medir = () => {
      const base = palco.current?.getBoundingClientRect();
      const de = cartas.current.get(mira.autor)?.getBoundingClientRect();
      if (!base || !de) return setSetas([]);
      const x = (v) => v - base.left;
      const y = (v) => v - base.top;
      setSetas(alvosDaMira.flatMap((id) => {
        const para = cartas.current.get(id)?.getBoundingClientRect();
        if (!para || id === mira.autor) return [];
        const ax = x(de.left + de.width / 2);
        const bx = x(para.left + para.width / 2);
        const ay = y(de.top + de.height / 2);
        const by = y(para.top + para.height / 2);
        // Um em cima do outro: a seta faz uma curva pela esquerda das cartas (a direita tem as condições)
        if (Math.abs(bx - ax) < (de.width + para.width) / 2) {
          const x1 = x(de.left) - 6;
          const x2 = x(para.left) - 6;
          const curva = Math.min(x1, x2) - Math.max(36, Math.abs(by - ay) * 0.35);
          return [{ id, d: `M${x1} ${ay} Q${curva} ${(ay + by) / 2} ${x2} ${by}` }];
        }
        // Lado a lado: reta de borda a borda, com um leve arco
        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.hypot(dx, dy) || 1;
        const saida = (de.width / 2) * 0.95;
        const recuo = (para.width / 2) * 1.05;
        const x1 = ax + (dx / dist) * saida;
        const y1 = ay + (dy / dist) * saida;
        const x2 = bx - (dx / dist) * recuo;
        const y2 = by - (dy / dist) * recuo;
        const cx = (x1 + x2) / 2 - (dy / dist) * 30;
        const cy = (y1 + y2) / 2 + (dx / dist) * 30;
        return [{ id, d: `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}` }];
      }));
    };
    // Depois do quadro (a carta da vez ainda está subindo) e a cada mudança de tamanho
    const agendar = () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(medir); };
    agendar();
    const tarde = setTimeout(agendar, 400);
    const observador = new ResizeObserver(agendar);
    if (palco.current) observador.observe(palco.current);
    return () => { cancelAnimationFrame(quadro); clearTimeout(tarde); observador.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave já diz quem mira quem
  }, [chaveDaMira, participantes.length]);

  // Golpe no alvo: o atacante avança até o alvo; o alvo recua com o impacto
  useEffect(() => {
    if (!ultimoAtaque || ultimoAtaque.id === visto.current) return;
    visto.current = ultimoAtaque.id;
    const de = cartas.current.get(ultimoAtaque.autor);
    const para = cartas.current.get(ultimoAtaque.alvo);
    if (!de?.animate || !para || semMovimento()) return;
    const a = de.getBoundingClientRect();
    const b = para.getBoundingClientRect();
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    const perto = `translate(${dx * 0.78}px, ${dy * 0.78}px) scale(1.12)`;
    de.animate(
      [
        { transform: 'none', zIndex: 6 },
        { transform: `translate(${-dx * 0.06}px, ${-dy * 0.06}px) scale(1.04)`, offset: 0.2, zIndex: 6 },
        { transform: perto, offset: 0.5, zIndex: 6 },
        { transform: perto, offset: 0.6, zIndex: 6 },
        { transform: 'none', zIndex: 6 },
      ],
      { duration: 760, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    );
    const errou = ultimoAtaque.resultado === 'falha';
    para.animate(
      errou
        ? [{ transform: 'none' }, { transform: `translateX(${dx > 0 ? 18 : -18}px) rotate(${dx > 0 ? 6 : -6}deg)` }, { transform: 'none' }]
        : [{ transform: 'none', filter: 'none' }, { transform: `translate(${dx * 0.05}px, ${dy * 0.05}px) rotate(-4deg)`, filter: 'brightness(2.2)' },
          { transform: 'translateX(-6px) rotate(3deg)' }, { transform: 'none', filter: 'none' }],
      { duration: 420, delay: 340, easing: 'ease-out' },
    );
  }, [ultimoAtaque]);

  const lado = (id) => participantes.filter((p) => p.lado === id);
  const carta = (p) => (
    <Carta
      key={p.id}
      p={p}
      daVez={p.id === vez}
      mestre={mestre}
      preparando={preparando}
      mirando={mirando}
      alvo={alvos.includes(p.id)}
      naMira={alvosDaMira.includes(p.id)}
      rodada={rodada}
      selecionado={p.id === selecionado}
      golpe={golpes[p.id]}
      registrar={(el) => (el ? cartas.current.set(p.id, el) : cartas.current.delete(p.id))}
      onEscolher={() => onEscolher(p)}
      onIniciativa={(v) => onIniciativa(p, v)}
    />
  );

  return (
    <div ref={palco} className={styles.palco} data-mirando={mirando || undefined}>
      <FundoDoCombate fundo={fundo} combateId={combateId} />
      {setas.length > 0 && (
        <svg className={styles.setas} aria-hidden="true">
          <defs>
            <marker id="ponta-da-mira" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="#ff4b3e" />
            </marker>
          </defs>
          {setas.map((s) => (
            <path key={`${chaveDaMira}:${s.id}`} d={s.d} markerEnd="url(#ponta-da-mira)" />
          ))}
        </svg>
      )}
      {avisos}
      {mirando && <p className={styles.dicaMira}>Escolha o alvo</p>}

      <ul className={styles.fileira} data-lado="ameacas" aria-label="Ameaças">
        {lado('ameacas').map(carta)}
        {!lado('ameacas').length && <li className={styles.vazio}>Nenhuma ameaça</li>}
      </ul>
      <div className={styles.divisa} aria-hidden="true"><span /></div>
      <ul className={styles.fileira} data-lado="agentes" aria-label="Agentes">
        {lado('agentes').map(carta)}
        {!lado('agentes').length && <li className={styles.vazio}>Nenhum agente</li>}
      </ul>
      {inspecao}
    </div>
  );
}

/* ---------- Uma carta no campo ---------- */
function Carta({
  p, daVez, mestre, preparando, mirando, alvo, naMira, rodada, selecionado, golpe, registrar, onEscolher, onIniciativa,
}) {
  const face = useRef(null);
  const { ver } = p;
  const ameaca = p.lado === 'ameacas';
  const pv = ver.recursos.find((r) => r.id === 'pv');
  const estado = estadoAproximado(pv);
  const marca = marcaDe(p);
  const caiu = estado.id === 'caido' || Boolean(marca && !marca.startsWith('Enlouquecendo'));
  // Ameaça para os jogadores: só o estado aproximado, a menos que o mestre a tenha revelado
  const segredo = ameaca && !mestre && !p.aberto;
  const cor = ELEMENTOS[ver.elemento]?.cor;

  // Golpe: a carta treme (dano) ou brilha (cura)
  const chave = golpe?.chave;
  const delta = golpe?.delta;
  useEffect(() => {
    if (!chave || !face.current?.animate || semMovimento()) return;
    const quadros = delta < 0
      ? [{ transform: 'none' }, { transform: 'translateX(-8px) rotate(-2deg)' }, { transform: 'translateX(6px) rotate(1.5deg)' },
        { transform: 'translateX(-3px)' }, { transform: 'none' }]
      : [{ filter: 'brightness(1)' }, { filter: 'brightness(1.7) saturate(1.3)' }, { filter: 'brightness(1)' }];
    face.current.animate(quadros, { duration: 420, delay: 380, easing: 'ease-out' });
  }, [chave, delta]);

  // Queda: a carta racha, tomba e apaga (só quando acontece, não ao abrir o combate)
  const caiuAntes = useRef(caiu);
  useEffect(() => {
    const antes = caiuAntes.current;
    caiuAntes.current = caiu;
    if (!caiu || antes || !face.current?.animate || semMovimento()) return;
    face.current.animate(
      [
        { transform: 'none', filter: 'none' },
        { transform: 'translateY(-10px) rotate(-4deg) scale(1.05)', filter: 'brightness(2) saturate(0)', offset: 0.25 },
        { transform: 'translateY(6px) rotate(5deg) scale(0.96)', filter: 'grayscale(1) brightness(0.6)', offset: 0.7 },
        { transform: 'none', filter: 'grayscale(1) brightness(0.7)' },
      ],
      { duration: 900, delay: 500, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' },
    );
  }, [caiu]);

  const rotulo = `${ver.nome}${daVez ? ', na vez' : ''}${segredo ? `, ${estado.rotulo}` : ''}`;
  const porcento = pv?.maximo ? Math.min(100, (pv.atual / pv.maximo) * 100) : 0;

  return (
    <li
      className={styles.carta}
      data-lado={p.lado}
      data-vez={daVez || undefined}
      data-caido={caiu || undefined}
      data-oculto={p.oculto || undefined}
      data-alvo={alvo || undefined}
      data-selecionado={selecionado || undefined}
      style={cor ? { '--el': cor } : undefined}
    >
      <div ref={registrar} className={styles.movel}>
        <button ref={face} type="button" className={styles.face} onClick={onEscolher} aria-label={mirando ? `Mirar em ${ver.nome}` : `Abrir ${rotulo}`}>
          <span className={styles.cabeca}>
            <b>{ver.nome}</b>
            {cor && <i className={styles.gema} title={ELEMENTOS[ver.elemento]?.nome} />}
          </span>
          <span className={styles.arte} data-estado={estado.id}>
            {ver.imagem ? <img src={ver.imagem} alt="" /> : ameaca ? <Caveira /> : <b>{ver.nome.charAt(0)}</b>}
            {marca && <span className={styles.marca}>{marca}</span>}
            {caiu && <span className={styles.racha} aria-hidden="true" />}
          </span>
          <span className={styles.pe}>
            {segredo ? (
              <em className={styles.estado} data-estado={estado.id}>{estado.rotulo}</em>
            ) : pv ? (
              <>
                <i className={styles.barra} data-baixo={porcento <= 25 || undefined}><b style={{ width: `${porcento}%` }} /></i>
                <strong><Contador valor={pv.atual} /><small>/{pv.maximo}</small></strong>
              </>
            ) : <em className={styles.estado}>—</em>}
          </span>

          {/* Dica ao mirar: nome e estado (números só para o mestre e para os agentes) */}
          {mirando && (
            <span className={styles.dica} role="tooltip">
              <b>{ver.nome}</b>
              {segredo ? estado.rotulo : `${pv?.atual ?? '—'}/${pv?.maximo ?? '—'} PV · Defesa ${ver.defesa}`}
              {(p.condicoes ?? []).length > 0 && <small>{p.condicoes.map((c) => condicaoPorId(c.id)?.nome ?? c.id).join(', ')}</small>}
            </span>
          )}
        </button>

        {daVez && <span className={styles.suaVez}>Vez</span>}

        {naMira && <span className={styles.naMira}>Na mira</span>}

        {/* Condições: um ícone por condição na lateral da carta, com as rodadas que faltam */}
        {(p.condicoes ?? []).length > 0 && (
          <ul className={styles.condicoes} aria-label="Condições">
            {p.condicoes.map((c) => {
              const resta = rodadasRestantes(c, rodada);
              const texto = textoDaCondicao(c, rodada);
              return (
                <li key={c.uid} style={{ '--cor-cond': corDaCondicao(c.id) }} title={texto} aria-label={texto}>
                  <IconeCondicao id={c.id} className={styles.iconeCond} />
                  {resta != null && <b>{resta}</b>}
                </li>
              );
            })}
          </ul>
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
      </div>
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
