import { createContext, useContext } from 'react';

/*
 * Mesa de dados da página. Quem quer rolar chama:
 *   const { rolar } = useRolagem();
 *   rolar({ titulo: 'Percepção', subtitulo: 'Teste de perícia', formula: '3d20+5', tipo: 'teste' });
 * A mesa já abre rolando. Para dano: tipo 'dano' e "mult" no crítico.
 * Para ataque: tipo 'teste' + ataque: { dano: '1d8+2', critico: { margem: 19, mult: 3 } }
 * (o resultado oferece "Rolar dano", já multiplicado se for crítico).
 */
export const RolagemContexto = createContext(null);

const SEM_MESA = { disponivel: false, aberta: false, rolar: () => {} };

export function useRolagem() {
  return useContext(RolagemContexto) ?? SEM_MESA;
}
