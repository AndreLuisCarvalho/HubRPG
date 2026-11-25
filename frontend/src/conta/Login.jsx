import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useConta } from './conta';
import styles from './Login.module.scss';

const SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client';

// O script do botão do Google, uma vez só
let carregandoGoogle = null;
function carregarGoogle() {
  carregandoGoogle ??= new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = SCRIPT_GOOGLE;
    s.async = true;
    s.onload = ok;
    s.onerror = () => { carregandoGoogle = null; falha(new Error('Não foi possível carregar o login do Google')); };
    document.head.appendChild(s);
  });
  return carregandoGoogle;
}

/**
 * Tela de entrada: botão "Fazer login com o Google". No PC aparece também o login de teste
 * (só um nome), para testar mestre e jogador sem conta Google.
 */
export default function Login() {
  const { entrarComGoogle, entrarParaTeste } = useConta();
  const [config, setConfig] = useState(null);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const botao = useRef(null);

  useEffect(() => {
    api.configDoLogin().then(setConfig).catch((e) => setErro(e.message));
  }, []);

  // Botão oficial do Google (desenhado por eles dentro da div)
  useEffect(() => {
    if (!config?.googleClientId) return;
    const efeito = { vivo: true };
    carregarGoogle().then(() => {
      if (!efeito.vivo || !botao.current) return;
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: (r) => entrarComGoogle(r.credential).catch((e) => setErro(e.message)),
      });
      window.google.accounts.id.renderButton(botao.current, {
        theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: 'pt-BR', width: 280,
      });
    }).catch((e) => setErro(e.message));
    return () => { efeito.vivo = false; };
  }, [config, entrarComGoogle]);

  async function entrarTeste(e) {
    e.preventDefault();
    setErro('');
    try {
      await entrarParaTeste(nome);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <main className={styles.pagina}>
      <section className={styles.cartao}>
        <p className={styles.rotulo}>Mesa de RPG</p>
        <h1>HubRPG</h1>
        <p className={styles.texto}>Entre com a sua conta para abrir as suas campanhas ou entrar na mesa de alguém com o código.</p>

        {config?.googleClientId && <div ref={botao} className={styles.google} />}
        {config && !config.googleClientId && (
          <p className={styles.aviso}>Login do Google ainda não configurado (falta o GOOGLE_CLIENT_ID no servidor).</p>
        )}

        {config?.loginDeTeste && (
          <form className={styles.teste} onSubmit={entrarTeste}>
            <span>Só no PC · conta de teste</span>
            <div>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex.: Mestre, Jogador 1)" maxLength={40} />
              <button type="submit" disabled={!nome.trim()}>Entrar</button>
            </div>
          </form>
        )}

        {erro && <p className="erro">{erro}</p>}
      </section>
    </main>
  );
}
