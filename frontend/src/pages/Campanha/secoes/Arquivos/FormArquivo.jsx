import { useId, useState } from 'react';
import Seletor from '../../../../components/Seletor/Seletor';
import { reduzirDocumento } from '../../../../services/imagem';
import { lerPdf, TIPOS } from './regras';
import styles from './Arquivos.module.scss';

/** Criar / editar um arquivo. "inicial" já vem com o conteúdo (texto, imagem ou PDF). */
export default function FormArquivo({ inicial, casos = [], sessoes = [], onSalvar, onCancelar }) {
  const [arquivo, setArquivo] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const idCasos = useId();
  const { dados } = arquivo;

  const mudar = (campo, valor) => setArquivo((a) => ({ ...a, dados: { ...a.dados, [campo]: valor } }));
  const mudarConteudo = (conteudo, extra = {}) =>
    setArquivo((a) => ({ ...a, conteudo, dados: { ...a.dados, ...extra } }));

  // Trocar de tipo apaga o conteúdo do tipo anterior (texto não vira imagem)
  function trocarTipo(tipo) {
    if (tipo === dados.tipo) return;
    setArquivo((a) => ({ ...a, conteudo: '', dados: { ...a.dados, tipo, nomeArquivo: '' } }));
  }

  async function escolher(e) {
    const escolhido = e.target.files?.[0];
    e.target.value = '';
    if (!escolhido) return;
    try {
      setErro('');
      const conteudo = dados.tipo === 'pdf' ? await lerPdf(escolhido) : await reduzirDocumento(escolhido);
      mudarConteudo(conteudo, { nomeArquivo: escolhido.name });
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    if (!arquivo.titulo.trim()) return setErro('Dê um título ao arquivo.');
    let url = dados.url.trim();
    if (dados.tipo === 'link' && url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      setSalvando(true);
      setErro('');
      await onSalvar({
        ...arquivo,
        titulo: arquivo.titulo.trim(),
        dados: { ...dados, url, caso: dados.caso.trim(), senha: dados.senha.trim() },
      });
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  const opcoesSessao = [
    { valor: '', rotulo: 'Não registrar' },
    ...sessoes.map((s) => ({ valor: String(s.id), rotulo: `Sessão ${s.numero}`, detalhe: s.titulo })),
  ];

  return (
    <form className={styles.formArquivo} onSubmit={enviar}>
      <label className={styles.campo}>
        <span>Título</span>
        <input
          value={arquivo.titulo}
          onChange={(e) => setArquivo({ ...arquivo, titulo: e.target.value })}
          placeholder="Ex.: Laudo da autópsia"
          maxLength={80}
          autoFocus
        />
      </label>

      <div className={styles.linha}>
        <label className={styles.campo}>
          <span>Caso / pasta</span>
          <input value={dados.caso} onChange={(e) => mudar('caso', e.target.value)} list={idCasos} placeholder="Ex.: Caso Hospital" maxLength={50} />
          <datalist id={idCasos}>{casos.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className={styles.campo}>
          <span>Etiqueta (opcional)</span>
          <input value={dados.resumo} onChange={(e) => mudar('resumo', e.target.value)} placeholder="Ex.: Achado no arquivo do porão" maxLength={80} />
        </label>
      </div>

      <div className={styles.campo}>
        <span>Tipo</span>
        <div className={styles.segmentos} role="radiogroup" aria-label="Tipo do arquivo">
          {Object.entries(TIPOS).map(([id, t]) => (
            <button key={id} type="button" role="radio" aria-checked={dados.tipo === id} onClick={() => trocarTipo(id)}>
              <span aria-hidden="true">{t.icone}</span> {t.nome}
            </button>
          ))}
        </div>
      </div>

      {dados.tipo === 'texto' && (
        <label className={styles.campo}>
          <span>Documento</span>
          <textarea
            value={arquivo.conteudo}
            onChange={(e) => mudarConteudo(e.target.value)}
            rows={9}
            placeholder={'Escreva a carta, o relatório, o diário…\nTrechos entre [[colchetes duplos]] aparecem tarjados (censurados).'}
          />
        </label>
      )}

      {(dados.tipo === 'imagem' || dados.tipo === 'pdf') && (
        <div className={styles.campo}>
          <span>{dados.tipo === 'pdf' ? 'PDF (até 2 MB)' : 'Imagem'}</span>
          <div className={styles.arquivoEscolhido}>
            {dados.tipo === 'imagem' && arquivo.conteudo && <img src={arquivo.conteudo} alt="" />}
            <small>{arquivo.conteudo ? (dados.nomeArquivo || 'Arquivo escolhido') : 'Nenhum arquivo escolhido'}</small>
            <label className={styles.secundario}>
              {arquivo.conteudo ? 'Trocar' : 'Escolher'}
              <input type="file" accept={dados.tipo === 'pdf' ? 'application/pdf' : 'image/*'} onChange={escolher} hidden />
            </label>
          </div>
        </div>
      )}

      {dados.tipo === 'link' && (
        <label className={styles.campo}>
          <span>Link (áudio, vídeo, página…)</span>
          <input value={dados.url} onChange={(e) => mudar('url', e.target.value)} placeholder="https://drive.google.com/…" inputMode="url" />
          <small className={styles.ajuda}>Links que terminam em .mp3, .ogg ou .wav tocam aqui mesmo; os outros abrem em outra aba.</small>
        </label>
      )}

      <fieldset className={styles.grupo}>
        <legend>Acesso</legend>
        <div className={styles.linha}>
          <label className={styles.campo}>
            <span>Senha (vazio = sem senha)</span>
            <input value={dados.senha} onChange={(e) => mudar('senha', e.target.value)} placeholder="Ex.: lua negra" maxLength={60} autoComplete="off" />
          </label>
          <label className={styles.campo}>
            <span>Dica (opcional)</span>
            <input value={dados.dica} onChange={(e) => mudar('dica', e.target.value)} placeholder="Aparece no terminal" maxLength={120} disabled={!dados.senha} />
          </label>
        </div>
        <small className={styles.ajuda}>A senha não diferencia maiúsculas, acentos nem espaços extras.</small>
        <label className={styles.marcar}>
          <input type="checkbox" checked={dados.liberado} onChange={(e) => mudar('liberado', e.target.checked)} />
          Já liberado para os jogadores (desmarcado, fica oculto até você liberar)
        </label>
        {inicial.dados.destrancado && dados.senha && (
          <label className={styles.marcar}>
            <input type="checkbox" checked={!dados.destrancado} onChange={(e) => mudar('destrancado', !e.target.checked)} />
            Trancar de novo (os jogadores já descobriram a senha)
          </label>
        )}
      </fieldset>

      <div className={styles.campo}>
        <span>Achado na sessão</span>
        <Seletor
          rotulo="Sessão em que foi achado"
          valor={dados.sessaoId ? String(dados.sessaoId) : ''}
          opcoes={opcoesSessao}
          onMudar={(v) => mudar('sessaoId', v ? Number(v) : null)}
        />
      </div>

      <label className={styles.campo}>
        <span>Nota do mestre</span>
        <textarea value={dados.notaMestre} onChange={(e) => mudar('notaMestre', e.target.value)} rows={2} placeholder="Só aparece na visão do mestre." />
      </label>

      {erro && <p className="erro">{erro}</p>}

      <div className={styles.botoes}>
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar arquivo'}</button>
      </div>
    </form>
  );
}
