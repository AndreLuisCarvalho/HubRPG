import DadosCampanha from '../../DadosCampanha/DadosCampanha';
import styles from './InfoDossie.module.scss';

export default function InfoDossie({ campanha }) {
  const numeroCaso = String(campanha.id).padStart(3, '0');

  return (
    <div className={styles.dossie}>
      <article className={styles.documento}>
        <header className={styles.cabecalho}>
          <span>Relatório de investigação</span>
          <span className={styles.carimbo}>Arquivo</span>
        </header>

        <span className={styles.sistema}>{campanha.sistema || 'Sistema livre'}</span>
        <h2 className={styles.nome}>{campanha.nome}</h2>
        {campanha.descricao && <p className={styles.descricao}>{campanha.descricao}</p>}
        <DadosCampanha campanha={campanha} className={styles.dados} />
      </article>

      {/* Frente da pasta: fica por cima do documento */}
      <div className={styles.pasta}>
        <span className={styles.etiqueta}>Caso Nº {numeroCaso}</span>
      </div>
    </div>
  );
}