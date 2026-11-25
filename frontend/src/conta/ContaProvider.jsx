import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, EVENTO_SAIU, guardarToken, lerToken } from '../services/api';
import { ContextoConta } from './conta';
import Login from './Login';

/**
 * Guarda a conta logada. Sem conta, mostra a tela de login no lugar do site.
 * O token fica no navegador (services/api); ao abrir, confere com o servidor quem é.
 */
export default function ContaProvider({ children }) {
  // undefined = conferindo; null = sem conta
  const [usuario, setUsuario] = useState(() => (lerToken() ? undefined : null));

  useEffect(() => {
    if (usuario !== undefined) return;
    api.eu().then((r) => setUsuario(r.usuario)).catch(() => {
      guardarToken('');
      setUsuario(null);
    });
  }, [usuario]);

  // O servidor recusou o token no meio do uso: volta para o login
  useEffect(() => {
    const saiu = () => setUsuario(null);
    window.addEventListener(EVENTO_SAIU, saiu);
    return () => window.removeEventListener(EVENTO_SAIU, saiu);
  }, []);

  const entrou = useCallback(({ token, usuario: u }) => {
    guardarToken(token);
    setUsuario(u);
  }, []);

  const valor = useMemo(() => ({
    usuario,
    entrarComGoogle: async (credencial) => entrou(await api.entrarComGoogle(credencial)),
    entrarParaTeste: async (nome) => entrou(await api.entrarParaTeste(nome)),
    sair: () => {
      guardarToken('');
      window.google?.accounts?.id?.disableAutoSelect?.();
      setUsuario(null);
    },
  }), [usuario, entrou]);

  if (usuario === undefined) return null;
  return (
    <ContextoConta.Provider value={valor}>
      {usuario ? children : <Login />}
    </ContextoConta.Provider>
  );
}
