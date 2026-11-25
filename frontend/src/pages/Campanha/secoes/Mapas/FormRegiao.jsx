import { useState } from 'react';
import { reduzirDocumento } from '../../../../services/imagem';
import styles from './Mapas.module.scss';

const LIMITE_IMAGEM = 3.5 * 1024 * 1024;

// '' = transparente (como era antes)
const CORES_COMODO = [
  { valor: '', rotulo: 'Transparente' },
  { valor: '#8b4a32', rotulo: 'Tijolo' },
  { valor: '#c9a227', rotulo: 'Ouro' },
  { valor: '#3f7d4e', rotulo: 'Verde' },
  { valor: '#2f6690', rotulo: 'Azul' },
  { valor: '#7a3fa0', rotulo: 'Roxo' },
  { valor: '#a12d2d', rotulo: 'Sangue' },
  { valor: '#5c5c66', rotulo: 'Cinza' },
];

/**
 * Cômodo: nome, imagem própria (vira a planta do cômodo, um mapa "dentro" deste) e se fica oculto.
 * imagemAtual: a imagem da planta que já existe (undefined enquanto carrega, '' sem planta).
 * onSalvar(regiao, imagem): imagem undefined = não mexeu · '' = tirar a planta · data URL = nova
 */
export default function FormRegiao({ inicial, imagemAtual, onSalvar, onCancelar, onExcluir }) {
  const [regiao, setRegiao] = useState(inicial);
  const [imagemNova, setImagemNova] = useState(undefined);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const imagem = imagemNova ?? imagemAtual;

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      setErro('');
      setLendo(true);
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
    if (!regiao.nome.trim()) return setErro('Dê um nome ao cômodo.');
    if (imagemNova === '' && regiao.mapaId && !window.confirm('Tirar a imagem apaga a planta do cômodo (com os pinos, tokens e post-its dela). Continuar?')) return;
    try {
      setSalvando(true);
      setErro('');
      await onSalvar({ ...regiao, nome: regiao.nome.trim() }, imagemNova);
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  return (
    <form className={styles.formPino} onSubmit={enviar}>
      <label className={styles.campo}>
        <span>Nome do cômodo</span>
        <input value={regiao.nome} onChange={(e) => setRegiao({ ...regiao, nome: e.target.value })} placeholder="Ex.: Quarto do zelador" maxLength={50} autoFocus />
      </label>

      <div className={styles.campo}>
        <span>Imagem do cômodo (opcional)</span>
        <div className={styles.imagemMapa}>
          {imagem === undefined
            ? <span className={styles.papelVazio}>Carregando…</span>
            : imagem
              ? <img src={imagem} alt="" />
              : <span className={styles.papelVazio}>Sem imagem: clicar no cômodo só aproxima o desenho</span>}
          <div className={styles.botoesImagem}>
            <label className={styles.secundario}>
              {lendo ? 'Lendo…' : imagem ? 'Trocar imagem' : 'Escolher imagem'}
              <input type="file" accept="image/*" onChange={escolher} hidden disabled={lendo} />
            </label>
            {imagem && <button type="button" className={styles.secundario} onClick={() => setImagemNova('')}>Tirar imagem</button>}
          </div>
        </div>
        <small className={styles.ajuda}>
          Com imagem, o cômodo vira uma planta própria: ao entrar, ela aparece com pinos, névoa e tokens só dela.
        </small>
      </div>

      <div className={styles.campo}>
        <span>Cor do cômodo</span>
        <div className={styles.coresComodo} role="radiogroup" aria-label="Cor do cômodo">
          {CORES_COMODO.map((c) => (
            <button
              key={c.valor || 'nenhuma'}
              type="button"
              role="radio"
              aria-checked={(regiao.cor ?? '') === c.valor}
              title={c.rotulo}
              aria-label={c.rotulo}
              className={c.valor ? '' : styles.semCor}
              style={c.valor ? { '--amostra': c.valor } : undefined}
              onClick={() => setRegiao({ ...regiao, cor: c.valor })}
            />
          ))}
          <label className={styles.corLivre} title="Outra cor">
            <input type="color" value={regiao.cor || '#8b4a32'} onChange={(e) => setRegiao({ ...regiao, cor: e.target.value })} />
          </label>
        </div>
        <small className={styles.ajuda}>
          Transparente: só aparece ao passar o mouse. Para os jogadores, o cômodo visível ganha uma borda de tijolos (na cor escolhida).
        </small>
      </div>

      <label className={styles.marcar}>
        <input type="checkbox" checked={regiao.oculta} onChange={(e) => setRegiao({ ...regiao, oculta: e.target.checked })} />
        Oculto (os jogadores não veem a planta deste cômodo)
      </label>

      {erro && <p className="erro">{erro}</p>}

      <div className={styles.botoes}>
        {onExcluir && <button type="button" className={styles.perigo} onClick={onExcluir}>Apagar cômodo</button>}
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario} disabled={salvando || lendo}>{salvando ? 'Salvando…' : 'Salvar cômodo'}</button>
      </div>
    </form>
  );
}
