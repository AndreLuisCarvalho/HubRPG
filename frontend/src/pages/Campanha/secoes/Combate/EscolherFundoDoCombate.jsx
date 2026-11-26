import { useEffect, useState } from 'react';
import { AjusteEnquadre, ENQUADRE_PADRAO } from '../../../../components/Enquadre/Enquadre';
import { api } from '../../../../services/api';
import { prepararFundo } from '../../../../services/imagem';
import { CENARIOS, cenarioDe } from './cenarios';
import FundoDoCombate from './FundoDoCombate';
import styles from './EscolherFundoDoCombate.module.scss';

/**
 * O mestre escolhe o fundo do combate: um dos cenários desenhados ou uma imagem/GIF do PC,
 * enquadrada (arrastar + zoom). Troca na hora para todos.
 * onEscolher(fundo) grava em dados.fundo; a imagem vai antes para /combates/:id/fundo.
 */
export default function EscolherFundoDoCombate({ combateId, fundo, onEscolher, onFechar }) {
  const atual = cenarioDe(fundo);
  // Imagem: a que já está no combate (baixa ao abrir) ou uma nova escolhida agora
  const [imagem, setImagem] = useState(atual === 'imagem' ? undefined : '');
  const [nova, setNova] = useState(false);
  const [enquadre, setEnquadre] = useState(fundo?.enquadre ?? ENQUADRE_PADRAO);
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (atual !== 'imagem') return undefined;
    let vivo = true;
    api.fundoDoCombate(combateId).then(({ imagem: src }) => vivo && setImagem(src)).catch(() => vivo && setImagem(''));
    return () => { vivo = false; };
  }, [atual, combateId]);

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onFechar(); } };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [onFechar]);

  function usarCenario(id) {
    onEscolher({ tipo: 'cenario', id });
    onFechar();
  }

  async function escolherArquivo(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      setErro('');
      setOcupado('Preparando a imagem…');
      setImagem(await prepararFundo(arquivo));
      setNova(true);
      setEnquadre(ENQUADRE_PADRAO);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setOcupado('');
    }
  }

  async function usarImagem() {
    try {
      setErro('');
      setOcupado('Enviando…');
      if (nova) await api.salvarFundoDoCombate(combateId, imagem);
      // Nova versão só quando a imagem mudou (enquadrar não baixa de novo)
      const versao = nova || fundo?.tipo !== 'imagem' ? Date.now() : fundo.versao;
      onEscolher({ tipo: 'imagem', versao, enquadre });
      onFechar();
    } catch (falha) {
      setErro(`Não foi possível enviar: ${falha.message}`);
      setOcupado('');
    }
  }

  return (
    <div className={styles.fundo} onClick={onFechar} role="presentation">
      <div className={styles.caixa} role="dialog" aria-modal="true" aria-labelledby="titulo-fundo" onClick={(e) => e.stopPropagation()}>
        <header className={styles.topo}>
          <b id="titulo-fundo">Fundo do combate</b>
          <button type="button" onClick={onFechar} aria-label="Fechar">✕</button>
        </header>

        <div className={styles.cenarios} role="radiogroup" aria-label="Cenários">
          {CENARIOS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={atual === c.id}
              className={styles.cenario}
              onClick={() => usarCenario(c.id)}
            >
              <span className={styles.miniatura}>
                <FundoDoCombate fundo={{ tipo: 'cenario', id: c.id }} />
              </span>
              <b>{c.nome}</b>
              <small>{c.descricao}</small>
            </button>
          ))}
        </div>

        <section className={styles.imagem} data-ativa={atual === 'imagem' || undefined}>
          <div className={styles.imagemTopo}>
            <b>Imagem ou GIF do PC</b>
            <small>O GIF até 3 MB. Arraste a prévia para enquadrar.</small>
          </div>
          <AjusteEnquadre
            src={imagem || ''}
            valor={enquadre}
            onMudar={setEnquadre}
            rotulo="Fundo do combate"
            className={styles.previa}
          >
            <label className={`${styles.enviar} ${imagem ? styles.noCanto : ''}`}>
              {imagem === undefined ? 'Carregando…' : imagem ? 'Trocar imagem' : 'Escolher imagem ou GIF'}
              <input type="file" accept="image/*" onChange={escolherArquivo} disabled={Boolean(ocupado)} aria-label="Imagem ou GIF do fundo" />
            </label>
          </AjusteEnquadre>
          {imagem && (
            <div className={styles.rodape}>
              <button type="button" className={styles.usar} onClick={usarImagem} disabled={Boolean(ocupado)}>
                {ocupado || (nova || atual !== 'imagem' ? 'Usar esta imagem' : 'Salvar enquadramento')}
              </button>
            </div>
          )}
          {ocupado && !imagem && <small>{ocupado}</small>}
          {erro && <p className="erro">{erro}</p>}
        </section>
      </div>
    </div>
  );
}
