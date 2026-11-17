import { useEffect, useRef, useState } from 'react';
import { senhaConfere } from './regras';
import styles from './Terminal.module.scss';

const DESCRIPTOGRAFAR_MS = 1500;
const calmo = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Terminal do arquivo central: os jogadores digitam a senha do puzzle.
 * Errar mostra ACESSO NEGADO (pode tentar de novo); acertar descriptografa e chama onDestrancar.
 */
export default function Terminal({ arquivo, onDestrancar }) {
  const { dados } = arquivo;
  const linhas = [
    'ORDEM // ARQUIVO CENTRAL',
    `ARQUIVO Nº ${String(arquivo.id).padStart(3, '0')} — ${arquivo.titulo.toUpperCase()}`,
    dados.caso ? `CASO: ${dados.caso.toUpperCase()}` : null,
    'STATUS: ACESSO RESTRITO',
    dados.dica ? `DICA: ${dados.dica}` : null,
  ].filter(Boolean);

  const [mostradas, setMostradas] = useState(calmo() ? linhas.length : 0);
  const [senha, setSenha] = useState('');
  const [tentativas, setTentativas] = useState([]);   // senhas erradas, para o histórico na tela
  const [status, setStatus] = useState('esperando');   // esperando | negado | concedido
  const campo = useRef(null);

  // As linhas entram uma a uma, como se o sistema estivesse respondendo
  useEffect(() => {
    if (mostradas >= linhas.length) {
      campo.current?.focus();
      return undefined;
    }
    const t = setTimeout(() => setMostradas((n) => n + 1), 260);
    return () => clearTimeout(t);
  }, [mostradas, linhas.length]);

  function enviar(e) {
    e.preventDefault();
    if (!senha.trim() || status === 'concedido') return;
    if (senhaConfere(senha, dados.senha)) {
      setStatus('concedido');
      setTimeout(onDestrancar, calmo() ? 300 : DESCRIPTOGRAFAR_MS);
    } else {
      setTentativas((t) => [...t, senha]);
      setStatus('negado');
      setSenha('');
    }
  }

  const pronto = mostradas >= linhas.length;

  return (
    <div className={`${styles.terminal} ${styles[status]}`}>
      <div className={styles.tela} onClick={() => campo.current?.focus()}>
        {linhas.slice(0, mostradas).map((l) => <p key={l}>&gt; {l}</p>)}

        {tentativas.map((t, i) => (
          <p key={i} className={styles.erro}>&gt; SENHA: {'•'.repeat(t.length)} — ACESSO NEGADO</p>
        ))}

        {pronto && status !== 'concedido' && (
          <form className={styles.prompt} onSubmit={enviar}>
            <label htmlFor="senha-arquivo">&gt; SENHA:</label>
            <input
              id="senha-arquivo"
              ref={campo}
              value={senha}
              onChange={(e) => { setSenha(e.target.value); if (status === 'negado') setStatus('esperando'); }}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Senha do arquivo"
            />
          </form>
        )}

        {status === 'concedido' && (
          <>
            <p className={styles.ok}>&gt; ACESSO CONCEDIDO</p>
            <p>&gt; DESCRIPTOGRAFANDO…</p>
            <span className={styles.barra} style={{ '--ms': `${DESCRIPTOGRAFAR_MS}ms` }}><i /></span>
          </>
        )}
      </div>

      <p className={styles.rodape} aria-live="polite">
        {status === 'negado' && 'Senha incorreta. Tente de novo.'}
        {status === 'esperando' && pronto && 'Digite a senha e aperte Enter.'}
        {status === 'concedido' && 'Abrindo o arquivo…'}
      </p>
    </div>
  );
}
