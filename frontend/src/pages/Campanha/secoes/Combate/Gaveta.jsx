import { useState } from 'react';
import PainelAcao from './PainelAcao';
import { condicaoPorId } from './condicoes';
import { estadoAproximado, marcaDe } from './regrasCombate';
import styles from './Gaveta.module.scss';

const TIPOS = { jogador: 'Agente', npc: 'NPC', monstro: 'Ameaça' };

/**
 * Gaveta lateral: a ficha de quem foi clicado no palco (barras, condições, ações) ou o registro
 * da missão. Durante uma ação (aba), mostra o passo a passo dela.
 */
export default function Gaveta({
  p, aba, acoes, mestre, preparando, podeAgir, log, painel,
  onAba, onFechar, onAjustar, onTirarCondicao, onIniciativa, onRolarIniciativa, onMover, onRevelar, onTirar,
}) {
  if (!p) return <Registro log={log} onFechar={onFechar} />;

  const { ver } = p;
  const segredo = p.lado === 'ameacas' && !mestre;
  const pv = ver.recursos.find((r) => r.id === 'pv');
  const estado = estadoAproximado(pv);
  const marca = marcaDe(p);

  return (
    <aside className={styles.gaveta} aria-label={`Ficha de ${ver.nome}`} data-lado={p.lado}>
      <header className={styles.cabeca}>
        <span className={styles.retrato} data-estado={estado.id}>
          {ver.imagem && p.lado !== 'ameacas' ? <img src={ver.imagem} alt="" /> : ver.nome.charAt(0)}
        </span>
        <div className={styles.identidade}>
          <h2>{ver.nome}</h2>
          <small>
            {[
              ver.doLivro ? 'Do livro' : TIPOS[ver.tipo],
              !segredo && ver.defesa !== '—' ? `Defesa ${ver.defesa}` : null,
              !segredo && p.iniciativa != null ? `INI ${p.iniciativa}` : null,
              p.oculto ? 'oculto' : null,
            ].filter(Boolean).join(' · ')}
          </small>
        </div>
        <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">✕</button>
      </header>

      {marca && <p className={styles.marca}>{marca}</p>}

      {aba ? (
        <div className={styles.acao}>
          <button type="button" className={styles.voltar} onClick={() => onAba(null)}>← {acoes.find((a) => a.id === aba)?.rotulo ?? 'Voltar'}</button>
          <PainelAcao {...painel} aba={aba} />
        </div>
      ) : (
        <div className={styles.corpo}>
          {segredo ? (
            <p className={styles.estado} data-estado={estado.id}>{estado.rotulo}</p>
          ) : (
            <div className={styles.barras}>
              {ver.recursos.map((r) => (
                <div key={r.id} style={{ '--cor-barra': r.cor }}>
                  <span>{r.sigla}</span>
                  <i><b style={{ width: `${r.maximo ? Math.min(100, (r.atual / r.maximo) * 100) : 0}%` }} /></i>
                  <em>{r.atual}<small>/{r.maximo}</small>{r.temporario > 0 && ` +${r.temporario}`}</em>
                </div>
              ))}
            </div>
          )}

          {(p.condicoes ?? []).length > 0 && (
            <ul className={styles.condicoes}>
              {p.condicoes.map((c) => {
                const info = condicaoPorId(c.id);
                return (
                  <li key={c.uid}>
                    <b>{info?.nome ?? c.id}</b>
                    <small>{info?.resumo} {c.rodadas == null ? '(cena)' : `(${c.rodadas} rod.)`}</small>
                    {mestre && <button type="button" onClick={() => onTirarCondicao(c)} aria-label={`Tirar ${info?.nome}`}>✕</button>}
                  </li>
                );
              })}
            </ul>
          )}

          {podeAgir && (
            <div className={styles.acoes}>
              {acoes.map((a) => (
                <button key={a.id} type="button" onClick={() => onAba(a.id)}>
                  <span aria-hidden="true">{a.icone}</span>
                  {a.rotulo}
                </button>
              ))}
            </div>
          )}

          {mestre && preparando && (
            <div className={styles.linha}>
              <span>Iniciativa</span>
              <input
                type="number"
                inputMode="numeric"
                value={p.iniciativa ?? ''}
                onChange={(e) => onIniciativa(e.target.value === '' ? null : Number(e.target.value))}
                aria-label="Iniciativa"
              />
              <button type="button" onClick={onRolarIniciativa} title={`Rolar ${ver.formula}`}>Rolar {ver.formula}</button>
            </div>
          )}

          {mestre && !ver.perdida && <DanoACura recursos={ver.recursos} onAjustar={onAjustar} />}

          {mestre && (
            <div className={styles.mestre}>
              <span>Mestre</span>
              <div>
                <button type="button" onClick={() => onMover(-1)}>▲ Agir antes</button>
                <button type="button" onClick={() => onMover(1)}>▼ Agir depois</button>
                <button type="button" onClick={onRevelar}>{p.oculto ? 'Revelar' : 'Ocultar'}</button>
                <button type="button" className={styles.perigo} onClick={onTirar}>Tirar da luta</button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

// Dano ou cura à mão (só o mestre)
function DanoACura({ recursos, onAjustar }) {
  const [recursoId, setRecursoId] = useState('pv');
  const [valor, setValor] = useState('');

  function aplicar(sinal) {
    const n = Math.abs(parseInt(valor, 10));
    if (!n) return;
    onAjustar(recursoId, sinal * n);
    setValor('');
  }

  return (
    <form className={styles.ajuste} onSubmit={(e) => { e.preventDefault(); aplicar(-1); }}>
      <span>Dano ou cura à mão</span>
      <div>
        {recursos.length > 1 && (
          <div className={styles.recursos} role="radiogroup" aria-label="Recurso">
            {recursos.map((r) => (
              <button key={r.id} type="button" role="radio" aria-checked={recursoId === r.id} onClick={() => setRecursoId(r.id)}>{r.sigla}</button>
            ))}
          </div>
        )}
        <input type="number" inputMode="numeric" min="0" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Quanto" aria-label="Quantidade" />
        <button type="submit" className={styles.dano}>Dano</button>
        <button type="button" className={styles.cura} onClick={() => aplicar(1)}>Cura</button>
      </div>
    </form>
  );
}

const ROTULO_CARIMBO = {
  acerto: 'Acerto', falha: 'Falha', critico: 'Crítico', sucesso: 'Sucesso', fracasso: 'Fracasso',
};

function Registro({ log, onFechar }) {
  return (
    <aside className={`${styles.gaveta} ${styles.registro}`} aria-label="Registro da missão">
      <header className={styles.cabeca}>
        <div className={styles.identidade}><h2>Registro da missão</h2></div>
        <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">✕</button>
      </header>
      {log.length === 0 && <p className={styles.vazio}>Nada registrado ainda.</p>}
      <ol>
        {log.map((e) => (
          <li key={e.id} data-tipo={e.tipo}>
            {e.tipo !== 'rodada' && e.rodada > 0 && <small>R{e.rodada}</small>}
            <span>
              {e.mostrar}
              {e.carimbo && <em data-tom={e.carimbo}>{ROTULO_CARIMBO[e.carimbo]}</em>}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
