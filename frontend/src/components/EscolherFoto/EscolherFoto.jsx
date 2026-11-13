import { useState } from 'react';
import { reduzirImagem } from '../../services/imagem';
import styles from './EscolherFoto.module.scss';

/**
 * Retrato redondo do personagem. Sem foto mostra a inicial do nome.
 * Clicar abre o seletor de arquivo (no celular: câmera ou galeria);
 * a foto é reduzida antes de ir para onEscolher(dataUrl).
 */
export default function EscolherFoto({ imagem, inicial = '?', onEscolher, tamanho = 72, className = '' }) {
  const [erro, setErro] = useState('');

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';   // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    try {
      setErro('');
      onEscolher(await reduzirImagem(arquivo));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <label
      className={`${styles.foto} ${className}`}
      style={{ '--tamanho': `${tamanho}px` }}
      title={erro || (imagem ? 'Trocar foto' : 'Adicionar foto')}
    >
      {imagem ? <img src={imagem} alt="" /> : <span className={styles.inicial}>{inicial}</span>}
      <span className={styles.selo} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </span>
      <input type="file" accept="image/*" onChange={escolher} aria-label={imagem ? 'Trocar foto' : 'Adicionar foto'} />
    </label>
  );
}
