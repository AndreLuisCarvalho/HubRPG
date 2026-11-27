import { useEffect, useState } from 'react';
import styles from './Arena.module.scss';

const ROTULO_CARIMBO = {
  acerto: 'Acerto', falha: 'Falha', critico: 'Crítico', sucesso: 'Sucesso', fracasso: 'Fracasso',
};

/**
 * Registro da missão, numa gaveta que abre pela direita (botão "Registro" no topo): o histórico da
 * luta agrupado por rodada (a atual aberta, as antigas recolhidas), do mais novo para o mais antigo.
 * O dano (e a queda) de um ataque entra embaixo da linha do ataque. "meu" ({ id, nome }): o agente
 * desta tela, para o filtro "Só meu agente".
 */
export default function LogCombate({ log, aberto, onFechar, meu = null }) {
  const [soMeu, setSoMeu] = useState(false);
  const [trocadas, setTrocadas] = useState({});   // rodada → aberta/fechada à mão

  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, onFechar]);

  const rodadas = agrupar(log, soMeu && meu ? meu : null);
  const atual = rodadas[0]?.rodada;
  const estaAberta = (r) => trocadas[r] ?? r === atual;

  return (
    <aside className={styles.log} data-aberto={aberto || undefined} aria-label="Registro da missão" aria-hidden={!aberto}>
      <header className={styles.logTitulo}>
        Registro da missão
        <span className={styles.logAcoes}>
          {meu && (
            <button
              type="button"
              className={styles.logFiltro}
              aria-pressed={soMeu}
              onClick={() => setSoMeu((v) => !v)}
              tabIndex={aberto ? 0 : -1}
              title={`Só o que envolve ${meu.nome}`}
            >
              Só meu agente
            </button>
          )}
          <button type="button" onClick={onFechar} aria-label="Fechar registro" tabIndex={aberto ? 0 : -1}>✕</button>
        </span>
      </header>
      <div className={styles.logLista}>
        {rodadas.length === 0 && <p className={styles.logVazio}>{soMeu ? 'Nada envolvendo o seu agente ainda.' : 'Nada registrado ainda.'}</p>}
        {rodadas.map((g) => {
          const abertaAgora = estaAberta(g.rodada);
          return (
            <section key={g.rodada} className={styles.logRodada}>
              <button
                type="button"
                className={styles.logCabeca}
                aria-expanded={abertaAgora}
                onClick={() => setTrocadas((t) => ({ ...t, [g.rodada]: !abertaAgora }))}
                tabIndex={aberto ? 0 : -1}
              >
                <span>{g.rodada > 0 ? `Rodada ${g.rodada}` : 'Abertura'}</span>
                <small>{g.blocos.length} {g.blocos.length === 1 ? 'registro' : 'registros'}</small>
                <i aria-hidden="true">{abertaAgora ? '▾' : '▸'}</i>
              </button>
              {abertaAgora && (
                <ol>
                  {g.blocos.map((b) => (
                    <li key={b.e.id} data-tipo={b.e.tipo} data-recurso={b.e.dados?.rid} data-tom={b.e.carimbo ?? undefined}>
                      <span>
                        {b.e.mostrar}
                        {b.e.carimbo && <em data-tom={b.e.carimbo}>{ROTULO_CARIMBO[b.e.carimbo]}</em>}
                        {b.filhos.map((f) => (
                          <span key={f.id} className={styles.logFilho} data-tipo={f.tipo} data-recurso={f.dados?.rid}>
                            {f.mostrar}
                            {f.carimbo && f.tipo !== 'queda' && <em data-tom={f.carimbo}>{ROTULO_CARIMBO[f.carimbo]}</em>}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

/*
 * log (mais novo primeiro) → [{ rodada, blocos: [{ e, filhos }] }], rodadas e blocos do mais novo
 * para o mais antigo. As linhas "Rodada N" viram o cabeçalho. Dano/cura do mesmo autor no mesmo
 * alvo, e a queda do alvo, entram no bloco do último ataque nele.
 */
function agrupar(log, meu) {
  const porRodada = new Map();
  for (const e of [...log].reverse()) {   // na ordem em que aconteceu
    if (e.tipo === 'rodada') continue;
    const r = e.rodada ?? 0;
    if (!porRodada.has(r)) porRodada.set(r, []);
    const blocos = porRodada.get(r);
    const d = e.dados;
    const ultimoAtaque = [...blocos].reverse().find((b) => b.e.tipo === 'ataque');
    const continua = ultimoAtaque && d?.alvo && ultimoAtaque.e.dados?.alvo === d.alvo
      && (e.tipo === 'queda' || (['dano', 'cura'].includes(e.tipo) && d.autor && d.autor === ultimoAtaque.e.dados?.autor));
    if (continua) ultimoAtaque.filhos.push(e);
    else blocos.push({ e, filhos: [] });
  }
  const envolve = (x) => x.dados?.autor === meu.id || x.dados?.alvo === meu.id || (x.mostrar ?? '').includes(meu.nome);
  return [...porRodada.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rodada, blocos]) => ({
      rodada,
      blocos: (meu ? blocos.filter((b) => envolve(b.e) || b.filhos.some(envolve)) : blocos).reverse(),
    }))
    .filter((g) => g.blocos.length);
}
