import { useState } from 'react';
import { ELEMENTOS } from '../../../modelo';
import {
  contarAprendidos, custoDoRitual, dtDeRituais, limiteDeRituais, limitePePorTurno,
} from '../../../regras';
import { rituaisConhecidos } from '../../../rituais';
import DetalheRitual from '../DetalheRitual/DetalheRitual';
import BotaoRecolher from '../Recolher/BotaoRecolher';
import useRecolhido from '../Recolher/useRecolhido';
import SigiloElemento from '../SigiloElemento/SigiloElemento';
import styles from './Rituais.module.scss';
 
// Conteúdo da aba Rituais: cabeçalho (DT, aprendidos, limite), filtro por elemento e a lista.
// O que aparece ao abrir um ritual fica no DetalheRitual.
export default function Rituais({ dados, onAlterarDados, onAbrirGrimorio }) {
  const [aberto, setAberto] = useState(null); // id do ritual com os detalhes abertos
  const [filtro, setFiltro] = useState(null); // elemento filtrado (null = todos)
 
  // Ordem: círculo, depois nome
  const conhecidos = rituaisConhecidos(dados).sort(
    (a, b) => a.ritual.circulo - b.ritual.circulo || a.ritual.nome.localeCompare(b.ritual.nome, 'pt-BR'),
  );
  const lista = filtro ? conhecidos.filter((c) => c.elemento === filtro) : conhecidos;
 
  const aprendidos = contarAprendidos(dados);
  const limite = limiteDeRituais(dados);
  const dt = dtDeRituais(dados);
  const pePorTurno = limitePePorTurno(dados);

  // No celular o cabeçalho (DT, números, filtro) pode virar uma linha só, sobrando espaço para a lista
  const [recolhido, alternar] = useRecolhido('hubrpg:rituais-recolhido');

  return (
    <div className={`${styles.rituais} ${recolhido ? styles.recolhido : ''}`}>
      <header id="cabecalho-rituais" className={styles.cabecalho}>
        {/* Selo da DT, no mesmo estilo do anel de NEX */}
        <div className={styles.selo} title="DT para resistir aos seus rituais: 10 + limite de PE + Presença">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle className={styles.pontilhado} cx="32" cy="32" r="30" />
            <circle className={styles.anel} cx="32" cy="32" r="25" />
          </svg>
          <b>{dt}</b>
          <small>DT</small>
        </div>
 
        <dl className={styles.info}>
          <div title="Pelo poder Aprender Ritual o limite é o Intelecto. Rituais de classe não contam.">
            <dt>Aprendidos</dt>
            <dd className={aprendidos > limite ? styles.excedeu : ''}>
              {aprendidos}<span> de {limite}</span>
            </dd>
          </div>
          <div title="Nenhum ritual pode custar mais que isso numa conjuração">
            <dt>Limite por turno</dt>
            <dd>{pePorTurno}<span> PE</span></dd>
          </div>
        </dl>
      </header>

      {/* Filtro por elemento à esquerda e "Aprender" à direita, na mesma linha.
          Recolhido (celular): no lugar do filtro fica o resumo "DT 25 · 3/5 · 13 PE" */}
      <div className={styles.barra}>
        <button type="button" className={styles.resumoTopo} onClick={alternar} tabIndex={-1} aria-hidden="true">
          <span><small>DT</small> {dt}</span>
          <span className={aprendidos > limite ? styles.excedeu : ''}>{aprendidos}<small>/{limite}</small></span>
          <span>{pePorTurno} <small>PE</small></span>
          {filtro && <SigiloElemento elemento={filtro} tamanho={20} />}
        </button>

        <div id="filtro-rituais" className={styles.filtro} role="group" aria-label="Filtrar por elemento">
          {Object.entries(ELEMENTOS).map(([id, el]) => (
            <button key={id} onClick={() => setFiltro(filtro === id ? null : id)} title={el.nome} aria-pressed={filtro === id}>
              <SigiloElemento elemento={id} tamanho={24} apagado={filtro !== null && filtro !== id} />
            </button>
          ))}
        </div>

        <button className={styles.aprender} onClick={onAbrirGrimorio} disabled={!onAbrirGrimorio}>
          + Aprender
        </button>

        <BotaoRecolher
          recolhido={recolhido}
          onClick={alternar}
          nome="DT, limites e filtro dos rituais"
          controla="cabecalho-rituais filtro-rituais"
        />
      </div>
 
      <ul className={styles.lista}>
        {lista.map((conhecido) => {
          const { id, elemento, deClasse, ritual } = conhecido;
          const estaAberto = aberto === id;
 
          return (
            <li
              key={id}
              className={`${styles.ritual} ${estaAberto ? styles.aberto : ''}`}
              style={{ '--e': ELEMENTOS[elemento].cor }}
            >
              <button className={styles.linha} onClick={() => setAberto(estaAberto ? null : id)} aria-expanded={estaAberto}>
                <SigiloElemento elemento={elemento} />
                <span className={styles.titulo}>
                  <b>{ritual.nome}</b>
                  <span className={styles.resumo}>
                    {ritual.circulo}º círculo · {ritual.execucao} · {ritual.alcance}
                    {deClasse && ' · Classe'}
                  </span>
                </span>
                {ritual.dano && <span className={styles.dano}>{ritual.dano}</span>}
                <span className={styles.custo}>{custoDoRitual(ritual)} PE</span>
              </button>
 
              {estaAberto && (
                <DetalheRitual
                  dados={dados}
                  conhecido={conhecido}
                  onAlterarDados={onAlterarDados}
                  onEsquecido={() => setAberto(null)}
                />
              )}
            </li>
          );
        })}
 
        {lista.length === 0 && (
          <li className={styles.vazio}>
            {conhecidos.length === 0 ? 'Nenhum ritual ainda. Abra o grimório para aprender.' : 'Nenhum ritual deste elemento.'}
          </li>
        )}
      </ul>
    </div>
  );
}
 