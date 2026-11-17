import IconePino from './IconePino';
import { TIPOS_PINO } from './regrasMapa';
import styles from './Mapas.module.scss';

/**
 * Cartão que abre em cima do pino: tipo, nome, descrição e o link (abrir arquivo, entrar no mapa…).
 * O mestre ainda tem editar, ocultar/mostrar e apagar.
 * link: { rotulo, abrir } já resolvido pela página (ou null)
 */
export default function CartaoPino({ pino, link, mestre, onEditar, onAlternarOculto, onApagar, onFechar }) {
  const tipo = TIPOS_PINO[pino.tipo] ?? TIPOS_PINO.lugar;

  return (
    <article className={styles.cartaoPino} style={{ '--c': tipo.cor }}>
      <header>
        <span className={styles.selo}><IconePino tipo={pino.tipo} /></span>
        <div>
          <small>{tipo.nome}{pino.oculto ? ' · oculto' : ''}</small>
          <b>{pino.nome || 'Sem nome'}</b>
        </div>
        <button type="button" className={styles.fecharCartao} onClick={onFechar} aria-label="Fechar">✕</button>
      </header>

      {pino.descricao && <p>{pino.descricao}</p>}

      {link && (
        <button type="button" className={styles.linkPino} onClick={link.abrir}>{link.rotulo} →</button>
      )}

      {mestre && (
        <footer>
          <button type="button" onClick={onEditar}>Editar</button>
          <button type="button" onClick={onAlternarOculto}>{pino.oculto ? 'Mostrar aos jogadores' : 'Ocultar'}</button>
          <button type="button" className={styles.perigoTexto} onClick={onApagar}>Apagar</button>
        </footer>
      )}
    </article>
  );
}
