import { createContext, useContext } from 'react';

/** A conta logada: { usuario, entrarComGoogle, entrarParaTeste, sair } */
export const ContextoConta = createContext(null);

export const useConta = () => useContext(ContextoConta);
