import { useState } from 'react';
import { ELEMENTOS } from '../../../../sistemas/ordemParanormal/modelo';
import { GRUPOS_DA_MAO } from './acoesCombate';
import IconeArma from './IconeArma';
import { ROTULO_DO_CUSTO, SIGLA_DO_CUSTO } from './economia';
import styles from './MaoDeCartas.module.scss';

/**
 * A mão de quem age: as ações em cartas lado a lado. Clicar numa carta a põe em jogo (sobe e acende)
 * e abre o painel da ação; clicar de novo a recolhe. Cartas com "grupo" ganham abas em cima
 * (Armas, Ataques, Rituais, Curas, Outros; só as que têm cartas). "virada": a mão de uma ameaça
 * vista pelos jogadores, só o verso.
 */
export default function MaoDeCartas({ cartas, selecionada, virada, soVer, onJogar }) {
  const grupos = GRUPOS_DA_MAO.filter((g) => cartas.some((c) => c.grupo === g.id));
  const doSelecionado = cartas.find((c) => c.id === selecionada)?.grupo;
  const [escolhido, setEscolhido] = useState(doSelecionado ?? grupos[0]?.id ?? null);
  const grupo = grupos.some((g) => g.id === escolhido) ? escolhido : grupos[0]?.id;

  if (virada) {
    return (
      <div className={styles.mao} data-virada aria-label="Mão da ameaça (escondida)">
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.carta} aria-hidden="true">
            <span className={styles.verso}><i /></span>
          </span>
        ))}
      </div>
    );
  }

  const visiveis = grupos.length ? cartas.filter((c) => c.grupo === grupo) : cartas;
  return (
    <div className={styles.conjunto}>
      {grupos.length > 1 && (
        <div className={styles.abas} role="tablist" aria-label="Tipos de ação">
          {grupos.map((g) => {
            const n = cartas.filter((c) => c.grupo === g.id).length;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={g.id === grupo}
                data-grupo={g.id}
                onClick={() => setEscolhido(g.id)}
              >
                {g.rotulo}<i>{n}</i>
              </button>
            );
          })}
        </div>
      )}
      <div className={styles.mao} data-so-ver={soVer || undefined} role="toolbar" aria-label={soVer ? 'Mão do agente (só para ver)' : 'Mão de ações'}>
        {visiveis.map((c) => {
          const cor = c.elemento ? ELEMENTOS[c.elemento]?.cor : null;
          return (
            <button
              key={c.id}
              type="button"
              className={styles.carta}
              data-tom={c.tom}
              aria-pressed={selecionada === c.id}
              aria-disabled={soVer || c.semAcao || undefined}
              data-sem-acao={c.semAcao || undefined}
              onClick={() => !soVer && (!c.semAcao || selecionada === c.id) && onJogar(selecionada === c.id ? null : c)}
              style={cor ? { '--tom': cor } : undefined}
              title={`${c.tipo}: ${c.nome} · ${c.detalhe}${c.custo ? ` · ação ${ROTULO_DO_CUSTO[c.custo].toLowerCase()}` : ''}${c.semAcao ? ' (sem ação para isso neste turno)' : ''}`}
            >
              {c.custo && <i className={styles.custo} data-custo={c.custo} aria-hidden="true">{SIGLA_DO_CUSTO[c.custo]}</i>}
              <span className={styles.face}>
                <small>{c.tipo}</small>
                {c.arma
                  ? <IconeArma id={c.arma} className={styles.desenho} />
                  : <span className={styles.icone} aria-hidden="true">{c.icone}</span>}
                <b>{c.nome}</b>
                <em>{c.detalhe}</em>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
