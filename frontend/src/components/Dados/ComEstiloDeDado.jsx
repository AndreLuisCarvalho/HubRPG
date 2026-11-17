import { useMemo } from 'react';
import { RolagemContexto, useRolagem } from './rolagem';

/**
 * Tudo o que rolar aqui dentro sai com o dado desta ficha ({ cor, corDano, skin }).
 * Quem rola não precisa saber de nada: só chama useRolagem().rolar como sempre.
 */
export default function ComEstiloDeDado({ estilo, children }) {
  const pai = useRolagem();
  const valor = useMemo(() => ({ ...pai, rolar: (pedido) => pai.rolar({ estilo, ...pedido }) }), [pai, estilo]);
  return <RolagemContexto.Provider value={valor}>{children}</RolagemContexto.Provider>;
}
