import { useState } from 'react';
import { condicaoPorId } from './condicoes';
import { estadoAproximado, marcaDe } from './regrasCombate';
import styles from './Arena.module.scss';

const TIPOS = { jogador: 'Agente', npc: 'NPC', monstro: 'Ameaça' };

/**
 * Ficha rápida de quem foi clicado (no palco ou na timeline): estado, condições e, para o mestre,
 * dano/cura à mão, ordem, ocultar e tirar. "Agir com" põe ele na barra de ações.
 */
export default function Inspecao({
  p, mestre, preparando, podeAgir, onFechar, onAgir, onAjustar, onTirarCondicao, onIniciativa, onRolarIniciativa,
  onMover, onRevelar, onTirar,
}) {
  const { ver } = p;
  const segredo = p.lado === 'ameacas' && !mestre;
  const estado = estadoAproximado(ver.recursos.find((r) => r.id === 'pv'));
  const marca = marcaDe(p);

  return (
    <div className={styles.inspecao} data-lado={p.lado} role="dialog" aria-label={`Ficha rápida de ${ver.nome}`}>
      <header>
        <div>
          <b>{ver.nome}</b>
          <small>
            {[
              ver.doLivro ? 'Do livro' : TIPOS[ver.tipo],
              !segredo && ver.defesa !== '—' ? `Defesa ${ver.defesa}` : null,
              !segredo && p.iniciativa != null ? `INI ${p.iniciativa}` : null,
              mestre && p.oculto ? 'oculto' : null,
            ].filter(Boolean).join(' · ')}
          </small>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar">✕</button>
      </header>

      {marca && <p className={styles.inspecaoMarca}>{marca}</p>}

      {segredo ? (
        <p className={styles.inspecaoEstado} data-estado={estado.id}>{estado.rotulo}</p>
      ) : (
        <div className={styles.inspecaoBarras}>
          {ver.recursos.map((r) => (
            <span key={r.id} style={{ '--cor-barra': r.cor }}>
              <em>{r.sigla}</em>
              <i><b style={{ width: `${r.maximo ? Math.min(100, (r.atual / r.maximo) * 100) : 0}%` }} /></i>
              <strong>{r.atual}/{r.maximo}</strong>
            </span>
          ))}
        </div>
      )}

      {(p.condicoes ?? []).length > 0 && (
        <ul className={styles.inspecaoCondicoes}>
          {p.condicoes.map((c) => {
            const info = condicaoPorId(c.id);
            return (
              <li key={c.uid} title={info?.resumo}>
                {info?.nome ?? c.id}
                {mestre && <button type="button" onClick={() => onTirarCondicao(c)} aria-label={`Tirar ${info?.nome}`}>✕</button>}
              </li>
            );
          })}
        </ul>
      )}

      {mestre && preparando && (
        <div className={styles.inspecaoLinha}>
          <span>INI</span>
          <input
            type="number"
            inputMode="numeric"
            value={p.iniciativa ?? ''}
            onChange={(e) => onIniciativa(e.target.value === '' ? null : Number(e.target.value))}
            aria-label="Iniciativa"
          />
          <button type="button" onClick={onRolarIniciativa}>Rolar {ver.formula}</button>
        </div>
      )}

      {mestre && !ver.perdida && <DanoOuCura recursos={ver.recursos} onAjustar={onAjustar} />}

      <div className={styles.inspecaoBotoes}>
        {podeAgir && <button type="button" className={styles.inspecaoAgir} onClick={onAgir}>Agir com {ver.nome}</button>}
        {mestre && (
          <>
            <button type="button" onClick={() => onMover(-1)} title="Agir antes">▲</button>
            <button type="button" onClick={() => onMover(1)} title="Agir depois">▼</button>
            <button type="button" onClick={onRevelar}>{p.oculto ? 'Revelar' : 'Ocultar'}</button>
            <button type="button" className={styles.inspecaoPerigo} onClick={onTirar}>Tirar</button>
          </>
        )}
      </div>
    </div>
  );
}

// Dano ou cura à mão (só o mestre)
function DanoOuCura({ recursos, onAjustar }) {
  const [recursoId, setRecursoId] = useState('pv');
  const [valor, setValor] = useState('');

  function aplicar(sinal) {
    const n = Math.abs(parseInt(valor, 10));
    if (!n) return;
    onAjustar(recursoId, sinal * n);
    setValor('');
  }

  return (
    <form className={styles.inspecaoAjuste} onSubmit={(e) => { e.preventDefault(); aplicar(-1); }}>
      {recursos.length > 1 && (
        <span className={styles.inspecaoRecursos} role="radiogroup" aria-label="Recurso">
          {recursos.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={recursoId === r.id} onClick={() => setRecursoId(r.id)}>{r.sigla}</button>
          ))}
        </span>
      )}
      <input type="number" inputMode="numeric" min="0" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Qtd." aria-label="Quantidade" />
      <button type="submit" className={styles.inspecaoDano}>Dano</button>
      <button type="button" className={styles.inspecaoCura} onClick={() => aplicar(1)}>Cura</button>
    </form>
  );
}
