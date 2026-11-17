import { useState } from 'react';
import { reduzirDocumento } from '../../../../services/imagem';
import styles from './Mapas.module.scss';

const LIMITE_IMAGEM = 3.5 * 1024 * 1024;   // a requisição aceita 4 MB

/** Criar / editar um mapa: nome, imagem (opcional: sem ela é um pergaminho em branco) e opções */
export default function FormMapa({ inicial, onSalvar, onCancelar, onExcluir }) {
  const [mapa, setMapa] = useState(inicial);
  const [imagemNova, setImagemNova] = useState(undefined);   // undefined = não mexeu na imagem
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const mudar = (campo, valor) => setMapa((m) => ({ ...m, dados: { ...m.dados, [campo]: valor } }));
  const imagem = imagemNova ?? mapa.imagem;

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      setErro('');
      setLendo(true);
      // Mapas pedem detalhe: lado maior até 2400 px
      let reduzida = await reduzirDocumento(arquivo, 2400, 0.82);
      if (reduzida.length > LIMITE_IMAGEM) reduzida = await reduzirDocumento(arquivo, 1800, 0.75);
      if (reduzida.length > LIMITE_IMAGEM) throw new Error('Imagem pesada demais, mesmo reduzida.');
      setImagemNova(reduzida);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setLendo(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    if (!mapa.nome.trim()) return setErro('Dê um nome ao mapa.');
    try {
      setSalvando(true);
      setErro('');
      await onSalvar({ ...mapa, nome: mapa.nome.trim(), imagem: imagemNova });
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  return (
    <form className={styles.formMapa} onSubmit={enviar}>
      <label className={styles.campo}>
        <span>Nome</span>
        <input value={mapa.nome} onChange={(e) => setMapa({ ...mapa, nome: e.target.value })} placeholder="Ex.: Cidade de Santo Berço" maxLength={60} autoFocus />
      </label>

      <div className={styles.campo}>
        <span>Imagem do mapa</span>
        <div className={styles.imagemMapa}>
          {imagem
            ? <img src={imagem} alt="" />
            : <span className={styles.papelVazio}>Sem imagem: pergaminho em branco</span>}
          <div className={styles.botoesImagem}>
            <label className={styles.secundario}>
              {lendo ? 'Lendo…' : imagem ? 'Trocar imagem' : 'Escolher imagem'}
              <input type="file" accept="image/*" onChange={escolher} hidden disabled={lendo} />
            </label>
            {imagem && <button type="button" className={styles.secundario} onClick={() => setImagemNova('')}>Tirar imagem</button>}
          </div>
        </div>
        <small className={styles.ajuda}>Desenho, mapa gerado, foto de um mapa de papel… A imagem é reduzida para até 2400 px.</small>
      </div>

      <label className={styles.marcar}>
        <input type="checkbox" checked={mapa.dados.pergaminho} onChange={(e) => mudar('pergaminho', e.target.checked)} />
        Efeito de pergaminho (papel envelhecido e bordas queimadas)
      </label>
      <label className={styles.marcar}>
        <input type="checkbox" checked={mapa.dados.oculto} onChange={(e) => mudar('oculto', e.target.checked)} />
        Mapa oculto (os jogadores não veem até você mostrar)
      </label>

      {erro && <p className="erro">{erro}</p>}

      <div className={styles.botoes}>
        {onExcluir && <button type="button" className={styles.perigo} onClick={onExcluir}>Apagar mapa</button>}
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario} disabled={salvando || lendo}>{salvando ? 'Salvando…' : 'Salvar mapa'}</button>
      </div>
    </form>
  );
}
