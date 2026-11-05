import CardPadrao from './temas/CardPadrao/CardPadrao';
import CardPasta from './temas/CardPasta/CardPasta';
import CardGrimorio from './temas/CardGrimorio/CardGrimorio';
import CardPergaminho from './temas/CardPergaminho/CardPergaminho';
import styles from './CardCampanha.module.scss';

// Strategy: cada tema aponta para o componente visual dele
const CARDS_POR_TEMA = {
  investigacao: CardPasta,
  terror: CardGrimorio,
  medieval: CardPergaminho,
};

export default function CardCampanha({ campanha, selecionado, onSelecionar, onEntrar }) {
  const Card = CARDS_POR_TEMA[campanha.tema] ?? CardPadrao;

  return (
    <button
      className={`${styles.botao} ${selecionado ? styles.selecionado : ''}`}
      style={{ '--cor': campanha.cor }}
      onMouseEnter={onSelecionar}
      onFocus={onSelecionar}
      onClick={onEntrar}
    >
      <Card campanha={campanha} selecionado={selecionado} />
    </button>
  );
}