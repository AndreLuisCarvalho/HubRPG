import { useState } from 'react';
import { useRolagem } from '../../../../components/Dados/rolagem';
import { lerFormula, rolarTeste } from '../../../../components/Dados/formula';
import { baseDe, formulaDeResistencia } from './acoesCombate';
import { nomeDaPericia } from './resistenciaDoMestre';
import styles from './PedidoDeResistencia.module.scss';

/**
 * Tela do mestre: um jogador usou um ritual (ou item) que pede resistência de ameaças. Para cada
 * ameaça, o mestre clica Rolar (a fórmula dela no livro/ficha) ou digita o resultado da mesa.
 * O jogador recebe só Resistiu/Falhou e segue para o dano.
 * pedido: { id, autor, nome, fonte, pericia, dt, efeito, alvos, respostas }
 */
export default function PedidoDeResistencia({ pedido, participantes, fichas, livro, onResponder, onDescartar }) {
  const autor = participantes.find((p) => p.id === pedido.autor);
  const faltam = pedido.alvos
    .map((id) => participantes.find((p) => p.id === id))
    .filter((p) => p && !pedido.respostas?.[p.id]);
  if (!faltam.length) return null;

  return (
    <div className={styles.caixa} role="dialog" aria-label="Teste de resistência pedido pelo jogador">
      <header className={styles.topo}>
        <span className={styles.icone} aria-hidden="true">{pedido.fonte === 'item' ? '✸' : '✦'}</span>
        <div>
          <small>{autor?.ver.nome ?? 'Um agente'} usou {pedido.fonte === 'item' ? 'o item' : 'o ritual'}</small>
          <b>{pedido.nome}</b>
        </div>
        <span className={styles.dt}>DT <b>{pedido.dt}</b></span>
        <button type="button" className={styles.fechar} onClick={onDescartar} title="Descartar o pedido (o jogador pode pedir de novo)" aria-label="Descartar pedido">✕</button>
      </header>
      <p className={styles.ajuda}>
        {nomeDaPericia(pedido.pericia)}{pedido.efeito ? ` · ${pedido.efeito}` : ''}. Role ou digite o resultado de cada ameaça.
      </p>
      <ul className={styles.lista}>
        {faltam.map((p) => (
          <LinhaDoAlvo
            key={p.id}
            p={p}
            pedido={pedido}
            formula={formulaDeResistencia(baseDe(p, fichas, livro), pedido.pericia)}
            onResponder={(total) => onResponder(p, total)}
          />
        ))}
      </ul>
    </div>
  );
}

function LinhaDoAlvo({ p, pedido, formula, onResponder }) {
  const { rolar } = useRolagem();
  const [valor, setValor] = useState('');

  function rolarAgora() {
    const teste = rolarTeste(lerFormula(formula) ?? lerFormula('1d20'));
    const passou = teste.total >= pedido.dt;
    rolar({
      titulo: `Resistência de ${p.ver.nome}`,
      subtitulo: `${nomeDaPericia(pedido.pericia)} · DT ${pedido.dt}`,
      formula,
      tipo: 'teste',
      resultado: teste,
      carimbos: [{ texto: passou ? 'Resistiu' : 'Falhou', tom: passou ? 'acerto' : 'falha' }],
      estilo: p.ver.estilo,
    });
    onResponder(teste.total);
  }

  function digitado(e) {
    e.preventDefault();
    const n = parseInt(valor, 10);
    if (Number.isNaN(n)) return;
    onResponder(n);
  }

  return (
    <li className={styles.linha}>
      <div className={styles.nome}>
        <b>{p.ver.nome}</b>
        <small>{nomeDaPericia(pedido.pericia)} {formula}</small>
      </div>
      <button type="button" className={styles.rolar} onClick={rolarAgora}>Rolar</button>
      <form className={styles.digitar} onSubmit={digitado}>
        <input
          type="number"
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="ou"
          aria-label={`Resultado de ${p.ver.nome} (rolado na mesa)`}
        />
        <button type="submit" disabled={valor === ''}>OK</button>
      </form>
    </li>
  );
}
