import { ImagemEnquadrada } from '../Enquadre/Enquadre';
import styles from './PalcoMapa.module.scss';

export default function PalcoMapa({ campanhas, selecionada, anterior, mergulhando, children }) {
  return (
    <section className={`${styles.palco} ${mergulhando ? styles.mergulhando : ''}`}>
      {campanhas.map((c, i) => {
        const classes = [
          styles.camada,
          i === selecionada && styles.ativo,
          i === anterior && styles.saindo,
        ].filter(Boolean).join(' ');

        return (
          <div key={c.id} className={classes} style={{ '--cor': c.cor }}>
            <div className={`${styles.imagem} ${c.mapa ? '' : styles.vazio}`}>
              {c.mapa && <ImagemEnquadrada src={c.mapa} enquadre={c.enquadre?.fundo} />}
            </div>
          </div>
        );
      })}

      <div className={styles.vinheta} />
      {children}
    </section>
  );
}