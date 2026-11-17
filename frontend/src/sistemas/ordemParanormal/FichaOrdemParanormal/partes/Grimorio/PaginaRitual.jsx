import BotaoRolar from '../../../../../components/Dados/BotaoRolar';
import { useRolagem } from '../../../../../components/Dados/rolagem';
import { CUSTO_POR_CIRCULO, ELEMENTOS } from '../../../modelo';
import { pedidoDano } from '../../../rolagens';
import SigiloElemento from '../SigiloElemento/SigiloElemento';
import { ROMANOS } from './romanos';
import styles from './PaginaRitual.module.scss';

// Página do grimório com um ritual para ler. Ao abrir, toca o efeito do elemento dele.
export default function PaginaRitual({ ritual, elemento = ritual.elementos[0], conhece, onAprender, onVoltar }) {
  const { rolar } = useRolagem();
  const campos = [
    ['Execução', ritual.execucao],
    ['Alcance', ritual.alcance],
    [ritual.tipoAlvo, ritual.alvo],
    ['Duração', ritual.duracao],
    ['Resistência', ritual.resistencia],
    ['Dano', ritual.dano],
  ].filter(([, valor]) => valor);

  const formas = [
    ['Discente', ritual.discente],
    ['Verdadeiro', ritual.verdadeiro],
  ].filter(([, forma]) => forma);

  return (
    // key: trocar de ritual remonta a página e o efeito toca de novo
    <article key={ritual.id} className={`${styles.pagina} ${styles[elemento]}`} style={{ '--e': ELEMENTOS[elemento].cor }}>
      <button type="button" className={styles.voltar} onClick={onVoltar}>← Voltar ao índice</button>

      <header className={styles.cabeca}>
        <SigiloElemento elemento={elemento} tamanho={64} />
        <div>
          <span className={styles.circulo}>
            {ROMANOS[ritual.circulo]} · {ritual.circulo}º círculo · {CUSTO_POR_CIRCULO[ritual.circulo]} PE
          </span>
          <h3 className={styles.nome}>{ritual.nome}</h3>
          <span className={styles.elementos}>
            {ritual.elementos.map((id) => ELEMENTOS[id].nome).join(' · ')}
          </span>
        </div>
      </header>

      <dl className={styles.campos}>
        {campos.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>
              {valor}
              {/* O dano rola daqui mesmo ("dano do elemento" usa o elemento desta página) */}
              {rotulo === 'Dano' && (
                <BotaoRolar
                  className={styles.rolarDano}
                  tipo="dano"
                  rolar={rolar}
                  pedido={pedidoDano({ nome: ritual.nome, dano: ritual.dano }, { subtitulo: 'Dano do ritual', elemento })}
                  rotulo={`Rolar dano de ${ritual.nome}`}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>

      {/* Capitular só quando o texto começa com letra (não em "+5 na Defesa…") */}
      <p className={`${styles.efeito} ${/^\p{L}/u.test(ritual.efeito) ? styles.capitular : ''}`}>{ritual.efeito}</p>

      {formas.map(([nome, forma]) => (
        <section key={nome} className={styles.forma}>
          <h4>{nome} <em>+{forma.pe} PE</em></h4>
          <p>{forma.texto}</p>
          {forma.requisito && <small>Requer {forma.requisito}</small>}
        </section>
      ))}

      <footer className={styles.rodape}>
        {conhece ? (
          <span className={styles.conhecido}>✓ Este ritual já está no seu grimório</span>
        ) : (
          <button type="button" className={styles.aprender} onClick={onAprender}>Aprender este ritual</button>
        )}
      </footer>
    </article>
  );
}
