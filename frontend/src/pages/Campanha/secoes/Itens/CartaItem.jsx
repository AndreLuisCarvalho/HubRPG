import { ELEMENTOS } from '../../../../sistemas/ordemParanormal/modelo';
import { nomeDoTipo, resumoDeCombate } from '../../../../sistemas/ordemParanormal/itensCampanha';
import styles from './CartaItem.module.scss';

const ROMANOS = ['0', 'I', 'II', 'III', 'IV'];
// Sem imagem: um símbolo do tipo no lugar da foto
const SIMBOLO = {
  arma: '⚔', municao: '⁂', protecao: '⛨', acessorio: '✧', explosivo: '✹', operacional: '⌖', paranormal: '◬', outro: '▣',
};

/**
 * Carta do item: moldura de card colecionável com cara de arquivo da Ordem.
 * Nome + categoria no topo, foto da evidência, linha de tipo, ficha de papel com o texto e o rodapé de combate.
 * Item paranormal ganha o brilho do elemento; amaldiçoado leva o carimbo.
 */
export default function CartaItem({ item, onAbrir, grande = false }) {
  const { dados } = item;
  const elemento = ELEMENTOS[dados.paranormal?.elemento];
  const combate = resumoDeCombate(dados);
  const classes = [styles.carta, elemento && styles.paranormal, grande && styles.grande].filter(Boolean).join(' ');
  const Raiz = onAbrir ? 'button' : 'article';

  return (
    <Raiz
      type={onAbrir ? 'button' : undefined}
      className={classes}
      style={elemento ? { '--e': elemento.cor } : undefined}
      onClick={onAbrir}
      aria-label={onAbrir ? `Abrir ${item.nome}` : undefined}
    >
      <span className={styles.corpo}>
        <span className={styles.faixa}>
          <b className={styles.nome}>{item.nome}</b>
          <span className={styles.categoria} title={`Categoria ${ROMANOS[dados.categoria] ?? 0}`}>
            <i>{ROMANOS[dados.categoria] ?? '0'}</i>
          </span>
        </span>

        <span className={styles.janela}>
          {dados.imagem
            ? <img src={dados.imagem} alt="" />
            : <span className={styles.simbolo} aria-hidden="true">{SIMBOLO[dados.tipo] ?? SIMBOLO.outro}</span>}
          <span className={styles.numero}>Evidência Nº {String(item.id ?? 0).padStart(4, '0')}</span>
          {dados.paranormal?.amaldicoado && <span className={styles.carimbo}>Amaldiçoado</span>}
        </span>

        <span className={styles.linhaTipo}>
          <span>{nomeDoTipo(dados.tipo)}{elemento ? ` · ${elemento.nome}` : ''}</span>
          <span>{dados.espacos ?? 0} esp</span>
        </span>

        <span className={styles.papel}>
          {dados.descricao || <i>Sem descrição.</i>}
          {dados.paranormal?.custo && <small className={styles.custo}>Custo: {dados.paranormal.custo}</small>}
        </span>

        <span className={styles.rodape}>
          {combate ? <><em>Dano</em> {combate}</> : dados.defesa ? <><em>Defesa</em> +{dados.defesa}</> : <em>Sem dano</em>}
        </span>

        {/* Clipe de papel com o dono */}
        {dados.dono && <span className={styles.clipe}>Com {dados.dono.nome}</span>}
      </span>
    </Raiz>
  );
}
