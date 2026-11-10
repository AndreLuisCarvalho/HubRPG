import { useState } from 'react';
import { ELEMENTOS } from '../../../modelo';
import {
  alterarRitual, conjurarRitual, custoDoRitual, custoParanormal, esquecerRitual, formaPermitida, podeConjurar,
} from '../../../regras';
import styles from './DetalheRitual.module.scss';
 
const FORMAS = [
  { id: 'basico', nome: 'Básico' },
  { id: 'discente', nome: 'Discente' },
  { id: 'verdadeiro', nome: 'Verdadeiro' },
];
 
// O que aparece ao abrir um ritual: ficha técnica, efeito, formas e o botão Conjurar
export default function DetalheRitual({ dados, conhecido, onAlterarDados, onEsquecido }) {
  const { id, elemento, deClasse, ritual } = conhecido;
  const [forma, setForma] = useState('basico');
  const [esquecendo, setEsquecendo] = useState(false);
 
  const custo = custoDoRitual(ritual, forma);
  const pode = podeConjurar(dados, ritual, forma);
  const formaAtual = forma === 'basico' ? null : ritual[forma];
  const formasDoRitual = FORMAS.filter((f) => f.id === 'basico' || ritual[f.id]);
 
  // Ficha técnica (só o que o ritual tem)
  const campos = [
    ['Execução', ritual.execucao],
    ['Alcance', ritual.alcance],
    [ritual.tipoAlvo, ritual.alvo],
    ['Duração', ritual.duracao],
    ['Resistência', ritual.resistencia],
  ].filter(([, valor]) => valor);
 
  function esquecer() {
    if (!esquecendo) {
      setEsquecendo(true);
      return;
    }
    onAlterarDados(esquecerRitual(dados, id));
    onEsquecido();
  }
 
  return (
    <div className={styles.detalhe}>
      <dl className={styles.campos}>
        {campos.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
 
      <p className={styles.efeito}>{ritual.efeito}</p>
 
      {/* Formas avançadas: a que passa do limite de PE por turno fica bloqueada */}
      {formasDoRitual.length > 1 && (
        <div className={styles.formas} role="radiogroup" aria-label="Forma do ritual">
          {formasDoRitual.map((f) => {
            const permitida = formaPermitida(dados, ritual, f.id);
            return (
              <button
                key={f.id}
                role="radio"
                aria-checked={forma === f.id}
                className={forma === f.id ? styles.escolhida : ''}
                onClick={() => setForma(f.id)}
                disabled={!permitida}
                title={permitida ? '' : 'Custa mais que o seu limite de PE por turno'}
              >
                <b>{f.nome}</b>
                <small>{custoDoRitual(ritual, f.id)} PE</small>
              </button>
            );
          })}
        </div>
      )}
 
      {formaAtual && (
        <p className={styles.textoForma}>
          {formaAtual.texto}
          {formaAtual.requisito && <em> Requer {formaAtual.requisito}.</em>}
        </p>
      )}
 
      <div className={styles.opcoes}>
        {/* Amaldiçoar Arma: o elemento é escolhido ao aprender */}
        {ritual.elementos.length > 1 && (
          <label className={styles.elemento}>
            Elemento
            <select value={elemento} onChange={(e) => onAlterarDados(alterarRitual(dados, id, { elemento: e.target.value }))}>
              {ritual.elementos.map((el) => (
                <option key={el} value={el}>{ELEMENTOS[el].nome}</option>
              ))}
            </select>
          </label>
        )}
        <label className={styles.marcar}>
          <input
            type="checkbox"
            checked={Boolean(deClasse)}
            onChange={(e) => onAlterarDados(alterarRitual(dados, id, { deClasse: e.target.checked }))}
          />
          Aprendido pela classe
        </label>
      </div>
 
      <footer className={styles.rodape}>
        <small>{custoParanormal(ritual, elemento, forma)}</small>
        <div className={styles.acoes}>
          <button className={styles.esquecer} onClick={esquecer}>{esquecendo ? 'Confirmar?' : 'Esquecer'}</button>
          <button
            className={styles.conjurar}
            onClick={() => onAlterarDados(conjurarRitual(dados, ritual, forma))}
            disabled={!pode}
            title={pode ? `Gasta ${custo} PE` : 'PE insuficiente'}
          >
            Conjurar · {custo} PE
          </button>
        </div>
      </footer>
    </div>
  );
}
 