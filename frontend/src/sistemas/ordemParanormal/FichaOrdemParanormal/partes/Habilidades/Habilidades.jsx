import { CLASSES } from '../../../modelo';
import { dadosDaTrilha, habilidadesDaTrilha } from '../../../regras';
import { trilhasDaClasse } from '../../../trilhas';
import styles from './Habilidades.module.scss';

// Aba Habilidades: a trilha escolhida e as 4 habilidades dela por NEX.
// As já liberadas aparecem acesas; as próximas, apagadas com o NEX em que chegam.
export default function Habilidades({ dados, onAlterarDados }) {
  const trilha = dadosDaTrilha(dados);
  const classe = CLASSES[dados.classe]?.nome ?? 'sua classe';

  // Sem trilha (fichas antigas): mostra as opções da classe para escolher uma única vez
  if (!trilha) {
    return (
      <div className={styles.escolher}>
        <p className={styles.dica}>Escolha a trilha de {classe}. Depois de escolhida, ela não muda.</p>
        <ul className={styles.opcoes}>
          {trilhasDaClasse(dados.classe).map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onAlterarDados({ trilha: t.id })}>
                <b>{t.nome}</b>
                <span>{t.descricao}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.habilidades}>
      <header className={styles.cabecalho}>
        <span className={styles.sobre}>Trilha de {classe}</span>
        <h3>{trilha.nome}</h3>
        <p>{trilha.descricao}</p>
      </header>

      <ol className={styles.lista}>
        {habilidadesDaTrilha(dados).map((hab) => (
          <li key={hab.nome} className={hab.liberada ? styles.liberada : styles.bloqueada}>
            <span className={styles.nex}>NEX {hab.nex}%</span>
            <div>
              <b>{hab.nome}</b>
              {hab.efeitos && hab.liberada && <small className={styles.automatico}>já aplicado na ficha</small>}
              <p>{hab.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
