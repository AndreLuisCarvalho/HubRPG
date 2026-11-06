import Cabecalho from './partes/Cabecalho/Cabecalho';
import CirculoAtributos from './partes/CirculoAtributos/CirculoAtributos';
import Status from './partes/Status/Status';
import Pericias from './partes/Pericias/Pericias';
import Abas from './partes/Abas/Abas';
import styles from './FichaOrdemParanormal.module.scss';

export default function FichaOrdemParanormal({ ficha, onAlterarDados }) {
  const { dados } = ficha;

  return (
    <article className={styles.ficha}>
      <Cabecalho ficha={ficha} onAlterarDados={onAlterarDados} />

      <div className={styles.colunas}>
        <div className={styles.esquerda}>
          <CirculoAtributos atributos={dados.atributos} onAlterar={(atributos) => onAlterarDados({ atributos })} />
          <Status dados={dados} onAlterarDados={onAlterarDados} />
        </div>

        <Pericias dados={dados} onAlterarDados={onAlterarDados} />

        <div className={styles.direita}>
          <Abas dados={dados} onAlterarDados={onAlterarDados} />
        </div>
      </div>
    </article>
  );
}