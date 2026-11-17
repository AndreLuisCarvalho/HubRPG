import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../services/api';
import { estadoDo, trechosDoTexto, TIPOS } from './regras';
import styles from './Arquivos.module.scss';

// data URL → endereço blob: (o PDF abre melhor assim do que direto do data URL)
function blobDe(dataUrl) {
  const [cabeca, base64] = dataUrl.split(',');
  const tipo = cabeca.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: tipo }));
}

const ehAudio = (url) => /\.(mp3|ogg|wav|m4a)(\?|$)/i.test(url);

/**
 * O arquivo aberto: busca o conteúdo (a lista não traz) e mostra conforme o tipo.
 * Na visão do mestre aparecem os bastidores (senha, nota) e as ações.
 */
export default function VerArquivo({ arquivo, sessao, mestre, acoes }) {
  const { dados } = arquivo;
  // Link não tem conteúdo guardado: já começa pronto (quem troca de arquivo remonta pelo key)
  const [conteudo, setConteudo] = useState(dados.tipo === 'link' ? '' : null);
  const [erro, setErro] = useState('');
  const tipo = TIPOS[dados.tipo] ?? TIPOS.texto;
  const linkSeguro = /^https?:\/\//i.test(dados.url ?? '');   // só http(s): nada de "javascript:"

  useEffect(() => {
    const efeito = { ativo: true };
    if (dados.tipo === 'link') return undefined;
    api.buscarArquivo(arquivo.id)
      .then((a) => efeito.ativo && setConteudo(a.conteudo ?? ''))
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [arquivo.id, dados.tipo]);

  const pdf = useMemo(() => (dados.tipo === 'pdf' && conteudo ? blobDe(conteudo) : null), [dados.tipo, conteudo]);
  useEffect(() => () => pdf && URL.revokeObjectURL(pdf), [pdf]);

  return (
    <div className={styles.ver}>
      <header className={styles.cabecalhoVer}>
        <span className={styles.sobre}>
          {tipo.nome} · Nº {String(arquivo.id).padStart(3, '0')}
          {dados.caso && ` · ${dados.caso}`}
          {sessao && ` · Sessão ${sessao.numero}`}
        </span>
        <h2>{arquivo.titulo}</h2>
        {dados.resumo && <p>{dados.resumo}</p>}
      </header>

      {erro && <p className="erro">{erro}</p>}
      {conteudo === null && !erro && <p className={styles.dica}>Abrindo o arquivo…</p>}

      {conteudo !== null && dados.tipo === 'texto' && (
        <article className={styles.documento}>
          {trechosDoTexto(conteudo).map((t, i) => (t.tarja !== undefined
            // A tarja ocupa o tamanho do texto escondido, mas o texto não fica na página
            ? <span key={i} className={styles.tarja} aria-label="trecho censurado">{'█'.repeat(Math.max(3, t.tarja.length))}</span>
            : <span key={i}>{t.texto}</span>))}
          {!conteudo && <i className={styles.dica}>Documento em branco.</i>}
        </article>
      )}

      {conteudo && dados.tipo === 'imagem' && (
        <figure className={styles.foto}>
          <img src={conteudo} alt={arquivo.titulo} />
        </figure>
      )}

      {pdf && (
        <div className={styles.pdf}>
          <iframe src={pdf} title={arquivo.titulo} />
          <a href={pdf} target="_blank" rel="noreferrer">Abrir o PDF em outra aba ↗</a>
        </div>
      )}

      {dados.tipo === 'link' && (
        <div className={styles.link}>
          {linkSeguro && ehAudio(dados.url) && <audio src={dados.url} controls />}
          {linkSeguro
            ? <a href={dados.url} target="_blank" rel="noreferrer">Abrir {hostDo(dados.url)} ↗</a>
            : <p className={styles.dica}>Sem link.</p>}
        </div>
      )}

      {mestre && (
        <section className={styles.bastidores}>
          <span className={styles.sobre}>Bastidores · só na visão do mestre</span>
          <dl>
            <div><dt>Estado</dt><dd>{{ oculto: 'Oculto', trancado: 'Trancado', aberto: 'Liberado' }[estadoDo(arquivo)]}</dd></div>
            <div><dt>Senha</dt><dd>{dados.senha || '—'}</dd></div>
            {dados.dica && <div><dt>Dica</dt><dd>{dados.dica}</dd></div>}
          </dl>
          {dados.notaMestre && <p>{dados.notaMestre}</p>}
          {acoes}
        </section>
      )}
    </div>
  );
}

function hostDo(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'o link';
  }
}
