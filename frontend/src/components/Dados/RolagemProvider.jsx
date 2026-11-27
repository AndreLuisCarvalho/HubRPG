import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { RolagemContexto } from './rolagem';

// A mesa (dados 3D) só baixa na primeira rolagem
const MesaDeDados = lazy(() => import('./MesaDeDados'));

const LIMITE_HISTORICO = 8;

/** Dá a mesa de dados para tudo o que estiver dentro. As rolagens ficam só neste navegador. */
export default function RolagemProvider({ children }) {
  const [pedido, setPedido] = useState(null);
  const [historico, setHistorico] = useState([]);

  const aberta = Boolean(pedido);
  const valor = useMemo(() => ({
    disponivel: true,
    aberta,   // a mesa está na tela (o combate segura os avisos enquanto isso)
    // "chave" nova a cada pedido: a mesa recomeça do zero
    rolar: (novo) => setPedido((atual) => ({ ...novo, chave: (atual?.chave ?? 0) + 1 })),
  }), [aberta]);
  // Estáveis: a mesa usa dentro de um efeito
  const registrar = useCallback((r) => setHistorico((h) => [r, ...h].slice(0, LIMITE_HISTORICO)), []);
  const fechar = useCallback(() => setPedido(null), []);

  return (
    <RolagemContexto.Provider value={valor}>
      {children}
      {pedido && (
        <Suspense fallback={null}>
          <MesaDeDados
            key={pedido.chave}
            pedido={pedido}
            historico={historico}
            onRegistrar={registrar}
            onPedir={valor.rolar}
            onFechar={fechar}
          />
        </Suspense>
      )}
    </RolagemContexto.Provider>
  );
}
