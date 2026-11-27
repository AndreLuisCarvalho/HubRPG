import { useState } from 'react';
import Modal from '../../../../components/Modal/Modal';
import { AjusteEnquadre, ENQUADRE_PADRAO } from '../../../../components/Enquadre/Enquadre';
import { reduzirDocumento } from '../../../../services/imagem';
import styles from './Dados.module.scss';

const LADO = 384;   // a imagem guardada: um quadrado de 384 px (leve, e nítido na face do dado)

/**
 * Enviar uma imagem própria para os dados: escolher o arquivo, enquadrar num quadrado (arrastar e
 * zoom) e guardar. onPronto(dataUrl) recebe o quadrado já recortado.
 */
export default function EnviarImagemDoDado({ aberto, onFechar, onPronto }) {
  const [imagem, setImagem] = useState('');
  const [enquadre, setEnquadre] = useState(ENQUADRE_PADRAO);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  function fechar() {
    setImagem('');
    setEnquadre(ENQUADRE_PADRAO);
    setErro('');
    onFechar();
  }

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) return setErro('Escolha um arquivo de imagem.');
    try {
      setErro('');
      setImagem(await reduzirDocumento(arquivo, 1200));
      setEnquadre(ENQUADRE_PADRAO);
    } catch {
      setErro('Não foi possível abrir esta imagem.');
    }
  }

  async function usar() {
    setOcupado(true);
    try {
      await onPronto(await recortarQuadrado(imagem, enquadre));
      fechar();
    } catch (falha) {
      setErro(falha.message || 'Não foi possível guardar a imagem.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Modal aberto={aberto} onFechar={fechar} largura="440px" sobretitulo="Skin personalizada" titulo="Imagem nos dados">
      <div className={styles.envio}>
        <p className={styles.dica}>
          A imagem vira o fundo de todas as faces da peça, com os números por cima. Enquadre a parte que deve aparecer.
        </p>
        <AjusteEnquadre src={imagem} valor={enquadre} onMudar={setEnquadre} className={styles.envioCaixa} rotulo="Imagem do dado">
          {!imagem && (
            <label className={styles.envioEscolher}>
              <input type="file" accept="image/*" onChange={escolher} />
              <span aria-hidden="true">+</span>
              Escolher imagem
            </label>
          )}
        </AjusteEnquadre>
        {erro && <p className="erro">{erro}</p>}
        {imagem && (
          <div className={styles.envioRodape}>
            <label className={styles.envioTrocar}>
              <input type="file" accept="image/*" onChange={escolher} />
              Trocar imagem
            </label>
            <button type="button" className={styles.usarKit} onClick={usar} disabled={ocupado}>
              {ocupado ? 'Guardando…' : 'Usar nesta peça'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/*
 * Recorta o quadrado como o enquadre mostra (mesma conta do ImagemEnquadrada: cobre a caixa,
 * object-position x/y e zoom a partir desse ponto) e devolve um JPEG de LADO × LADO.
 */
function recortarQuadrado(src, enquadre) {
  return new Promise((resolver, rejeitar) => {
    const img = new Image();
    img.onload = () => {
      const { x, y, z } = { ...ENQUADRE_PADRAO, ...enquadre };
      const tela = document.createElement('canvas');
      tela.width = LADO;
      tela.height = LADO;
      const ctx = tela.getContext('2d');
      const cobre = Math.max(LADO / img.naturalWidth, LADO / img.naturalHeight);
      const w = img.naturalWidth * cobre;
      const h = img.naturalHeight * cobre;
      const ox = (LADO - w) * (x / 100);
      const oy = (LADO - h) * (y / 100);
      const px = LADO * (x / 100);
      const py = LADO * (y / 100);
      ctx.drawImage(img, px + (ox - px) * z, py + (oy - py) * z, w * z, h * z);
      resolver(tela.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => rejeitar(new Error('Não foi possível ler a imagem.'));
    img.src = src;
  });
}
