import InfoPadrao from './temas/InfoPadrao/InfoPadrao';
import InfoDossie from './temas/InfoDossie/InfoDossie';
import InfoInvocacao from './temas/InfoInvocacao/InfoInvocacao';
import InfoPergaminho from './temas/InfoPergaminho/InfoPergaminho';
import styles from './InfoCampanha.module.scss';

// Strategy: cada tema aponta para a sua "cena"
const INFOS_POR_TEMA = {
  investigacao: InfoDossie,
  terror: InfoInvocacao,
  medieval: InfoPergaminho,
};

export default function InfoCampanha({ campanha }) {
  const Info = INFOS_POR_TEMA[campanha.tema] ?? InfoPadrao;

  return (
    <div className={styles.posicao} style={{ '--cor': campanha.cor }}>
      <Info campanha={campanha} />
    </div>
  );
}