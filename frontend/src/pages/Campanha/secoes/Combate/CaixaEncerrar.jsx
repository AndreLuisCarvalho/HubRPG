import { useState } from 'react';
import { condicaoPorId } from './condicoes';
import styles from './Relatorio.module.scss';

/**
 * Caixa de encerramento: mostra as condições que acabam junto com a cena e pergunta de quem zerar
 * a contagem de Morrendo/Enlouquecendo. PV, SAN e PE ficam como estão.
 */
export default function CaixaEncerrar({ vistos, onEncerrar, onCancelar }) {
  const comCondicao = vistos.filter((p) => (p.condicoes ?? []).length > 0);
  // Agentes com contagem andando (valor > 0)
  const comContagem = vistos.flatMap((p) => {
    const c = p.ver.contagens;
    if (!c || !p.fichaId) return [];
    const ativas = ['pv', 'san'].map((rid) => ({ rid, c: c[rid] })).filter((x) => x.c?.valor > 0);
    if (!ativas.length) return [];
    const zerado = ativas.some(({ rid }) => p.ver.recursos.find((r) => r.id === rid)?.atual === 0);
    return [{ p, ativas, zerado }];
  });
  // Quem já voltou a ter PV/SAN começa marcado; quem continua no chão, não
  const [zerar, setZerar] = useState(() => new Set(comContagem.filter((x) => !x.zerado).map((x) => x.p.fichaId)));

  const alternar = (id) => setZerar((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <div className={styles.caixa}>
      {comCondicao.length > 0 && (
        <section>
          <h3>Condições que acabam com a cena</h3>
          <ul className={styles.listaSimples}>
            {comCondicao.map((p) => (
              <li key={p.id}>
                <b>{p.ver.nome}</b>: {p.condicoes.map((c) => condicaoPorId(c.id)?.nome ?? c.id).join(', ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {comContagem.length > 0 && (
        <section>
          <h3>Contagens de morrendo e enlouquecendo</h3>
          {comContagem.map(({ p, ativas, zerado }) => (
            <label key={p.id} className={styles.marcar}>
              <input type="checkbox" checked={zerar.has(p.fichaId)} onChange={() => alternar(p.fichaId)} />
              <span>
                Zerar {ativas.map(({ c }) => `${c.rotulo.toLowerCase()} ${c.valor}/${c.limite}`).join(' e ')} de <b>{p.ver.nome}</b>
                {zerado && <small> (ainda está com 0 PV ou 0 SAN)</small>}
              </span>
            </label>
          ))}
        </section>
      )}

      {!comCondicao.length && !comContagem.length && (
        <p className={styles.ajuda}>Nada para arrumar: ninguém com condições nem contagens.</p>
      )}

      <p className={styles.ajuda}>PV, SAN e PE ficam como estão nas fichas. O relatório da missão vai para a sessão do combate.</p>

      <div className={styles.botoes}>
        <button type="button" className={styles.secundario} onClick={onCancelar}>Voltar à luta</button>
        <button type="button" className={styles.primario} onClick={() => onEncerrar([...zerar])}>Encerrar e ver relatório</button>
      </div>
    </div>
  );
}
