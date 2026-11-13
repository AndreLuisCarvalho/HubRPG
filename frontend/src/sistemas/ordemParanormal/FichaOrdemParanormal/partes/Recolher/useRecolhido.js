import { useState } from 'react';

// Estado "recolhido" de um bloco no celular, lembrado neste navegador pela chave.
// Sem armazenamento (aba anônima, por exemplo) funciona igual, só não lembra.
export default function useRecolhido(chave) {
  const [recolhido, setRecolhido] = useState(() => {
    try {
      return localStorage.getItem(chave) === '1';
    } catch {
      return false;
    }
  });

  function alternar() {
    setRecolhido(!recolhido);
    try {
      localStorage.setItem(chave, recolhido ? '0' : '1');
    } catch {
      // sem armazenamento: só não lembra da escolha
    }
  }

  return [recolhido, alternar];
}
