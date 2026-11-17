import { estadoDo, TIPOS } from './regras';
import styles from './Pasta.module.scss';

const ESTADO = {
  oculto: 'Oculto',
  trancado: 'Acesso restrito',
  aberto: 'Liberado',
};

/**
 * Pasta parda de dossiê: aba com o número, etiqueta com o título, carimbo e o estado.
 * Trancada leva cadeado; oculta (só o mestre vê) fica apagada e tracejada.
 */
export default function Pasta({ arquivo, sessao, onAbrir }) {
  const estado = estadoDo(arquivo);
  const { dados } = arquivo;
  const tipo = TIPOS[dados.tipo] ?? TIPOS.texto;

  return (
    <button type="button" className={`${styles.pasta} ${styles[estado]}`} onClick={onAbrir} aria-label={`Abrir ${arquivo.titulo} (${ESTADO[estado]})`}>
      <span className={styles.aba}>Nº {String(arquivo.id).padStart(3, '0')}</span>
      <span className={styles.capa}>
        <span className={styles.etiqueta}>
          <b>{arquivo.titulo}</b>
          {dados.resumo && <small>{dados.resumo}</small>}
        </span>

        <span className={styles.carimbo}>{estado === 'trancado' ? 'Confidencial' : tipo.nome}</span>

        <span className={styles.rodape}>
          <span className={styles.estado}>
            {estado === 'trancado' && (
              <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" /><path d="M5 7V5a3 3 0 0 1 6 0v2" /></svg>
            )}
            {ESTADO[estado]}
          </span>
          {sessao && <span>Sessão {sessao.numero}</span>}
        </span>
      </span>
    </button>
  );
}
