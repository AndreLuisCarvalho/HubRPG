import { useState } from 'react';
import Agente from './partes/Agente/Agente';
import Vitais from './partes/Vitais/Vitais';
import Pericias from './partes/Pericias/Pericias';
import Abas from './partes/Abas/Abas';
import FichaNpc from './FichaNpc/FichaNpc';
import FiltroTraco from './partes/FiltroTraco/FiltroTraco';
import { ehNpcSimples } from '../regras';
import styles from './FichaOrdemParanormal.module.scss';

// No celular, só uma dessas aparece por vez (as orbes ficam sempre no topo)
const VISTAS = [
  { id: 'agente', rotulo: 'Agente', icone: '✦' },
  { id: 'pericias', rotulo: 'Perícias', icone: '⬡' },
  { id: 'combate', rotulo: 'Combate', icone: '⚔' },
];

export default function FichaOrdemParanormal({ ficha, onAlterarDados, onAlterarFicha }) {
  const [vista, setVista] = useState('agente');
  const { dados } = ficha;
  const visivel = (id) => (vista === id ? styles.visivel : '');

  // NPC simples (gente comum): ficha curta, sem classe, NEX ou atributos
  if (ehNpcSimples(dados)) {
    return <FichaNpc ficha={ficha} onAlterarDados={onAlterarDados} onAlterarFicha={onAlterarFicha} />;
  }

  return (
    <div className={styles.ficha}>
      <FiltroTraco />

      <Agente ficha={ficha} onAlterarDados={onAlterarDados} onAlterarFicha={onAlterarFicha} className={`${styles.agente} ${visivel('agente')}`} />
      <Vitais dados={dados} onAlterarDados={onAlterarDados} className={styles.vitais} />
      <Pericias dados={dados} onAlterarDados={onAlterarDados} className={`${styles.pericias} ${visivel('pericias')}`} />
      <Abas dados={dados} onAlterarDados={onAlterarDados} className={`${styles.abas} ${visivel('combate')}`} />

      <nav className={styles.navegacao} aria-label="Partes da ficha">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            aria-pressed={vista === v.id}
            className={vista === v.id ? styles.ativa : ''}
            onClick={() => setVista(v.id)}
          >
            <span aria-hidden="true">{v.icone}</span>
            {v.rotulo}
          </button>
        ))}
      </nav>
    </div>
  );
}