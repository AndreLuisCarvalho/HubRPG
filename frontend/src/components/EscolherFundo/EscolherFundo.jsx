import { useState } from 'react';
import { AjusteEnquadre } from '../Enquadre/Enquadre';
import { prepararFundo } from '../../services/imagem';
import styles from './EscolherFundo.module.scss';

/**
 * Fundo da campanha no menu principal: imagem ou GIF do PC, com prévia no formato do menu.
 * Arrastar a prévia e a barra de zoom enquadram (enquadre = { x, y, z }).
 * valor: data URL ('' = sem fundo; undefined = ainda carregando o atual).
 */
export default function EscolherFundo({ valor, cor, onMudar, enquadre, onEnquadre }) {
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState('');

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';   // deixa escolher o mesmo arquivo de novo
    if (!arquivo) return;
    try {
      setErro('');
      setPreparando(true);
      onMudar(await prepararFundo(arquivo));
      onEnquadre({ x: 50, y: 50, z: 1 });   // imagem nova começa centralizada
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setPreparando(false);
    }
  }

  const carregando = valor === undefined;
  const rotulo = preparando ? 'Preparando…' : carregando ? 'Carregando…' : valor ? 'Trocar fundo' : 'Escolher imagem ou GIF';

  return (
    <div className={styles.fundo}>
      <span className={styles.titulo}>Fundo no menu</span>
      <AjusteEnquadre
        src={valor || ''}
        valor={enquadre}
        onMudar={onEnquadre}
        rotulo="Fundo no menu"
        className={styles.previa}
      >
        <label className={`${styles.botao} ${valor ? styles.noCanto : ''}`} style={{ '--cor': cor }}>
          {rotulo}
          <input
            type="file"
            accept="image/*"
            onChange={escolher}
            disabled={preparando || carregando}
            aria-label="Imagem ou GIF do fundo"
          />
        </label>
      </AjusteEnquadre>
      <div className={styles.rodape}>
        <small>Imagem ou GIF (o GIF até 3 MB).</small>
        {valor && (
          <button type="button" onClick={() => onMudar('')}>Remover fundo</button>
        )}
      </div>
      {erro && <p className="erro">{erro}</p>}
    </div>
  );
}
