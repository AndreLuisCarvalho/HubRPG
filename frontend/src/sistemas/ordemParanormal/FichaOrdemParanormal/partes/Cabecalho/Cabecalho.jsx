import { CLASSES } from '../../../modelo';
import CampoLinha from '../CampoLinha/CampoLinha';
import styles from './Cabecalho.module.scss';

export default function Cabecalho({ ficha, onAlterarDados }) {
  const { dados } = ficha;

  return (
    <header className={styles.cabecalho}>
      <span className={styles.avatar}>{ficha.nome.charAt(0)}</span>

      <div className={styles.campos}>
        <div className={styles.personagem}>
          <span className={styles.rotulo}>Personagem</span>
          <strong>{ficha.nome}</strong>
        </div>

        <CampoLinha rotulo="Jogador" valor={dados.jogador} onSalvar={(jogador) => onAlterarDados({ jogador })} />
        <CampoLinha rotulo="Origem" valor={dados.origem} onSalvar={(origem) => onAlterarDados({ origem })} />

        <label className={styles.classe}>
          <span className={styles.rotulo}>Classe</span>
          <select value={dados.classe ?? ''} onChange={(e) => onAlterarDados({ classe: e.target.value })}>
            {Object.entries(CLASSES).map(([id, classe]) => (
              <option key={id} value={id}>{classe.nome}</option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}