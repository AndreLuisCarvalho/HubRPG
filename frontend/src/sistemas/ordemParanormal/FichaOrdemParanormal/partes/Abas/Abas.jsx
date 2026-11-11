import { useState } from 'react';
import Ataques from '../Ataques/Ataques';
import CampoLinha from '../CampoLinha/CampoLinha';
import Grimorio from '../Grimorio/Grimorio';
import Inventario from '../Inventario/Inventario';
import Painel from '../Painel/Painel';
import Rituais from '../Rituais/Rituais';
import styles from './Abas.module.scss';

const ABAS = [
  { id: 'ataques', rotulo: 'Ataques' },
  { id: 'habilidades', rotulo: 'Habilid.', emBreve: 'Habilidades de classe e trilha em breve.' },
  { id: 'rituais', rotulo: 'Rituais' },
  { id: 'inventario', rotulo: 'Inventário' },
  { id: 'notas', rotulo: 'Notas' },
];

export default function Abas({ dados, onAlterarDados, className = '' }) {
  const [ativa, setAtiva] = useState(ABAS[0].id);
  const [grimorioAberto, setGrimorioAberto] = useState(false);
  const aba = ABAS.find((a) => a.id === ativa);
  const defesa = dados.defesa ?? {};

  function salvarNotas(e) {
    const texto = e.target.value;
    if (texto !== (dados.descricao ?? '')) onAlterarDados({ descricao: texto });
  }

  return (
    <Painel className={className}>
      <div className={styles.lista} role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === ativa}
            className={`${styles.aba} ${a.id === ativa ? styles.ativa : ''}`}
            onClick={() => setAtiva(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {/* Listas longas rolam aqui dentro, nunca a página */}
      <div className={styles.conteudo} role="tabpanel">
        {aba.id === 'ataques' && (
          <Ataques ataques={dados.ataques} onAlterar={(ataques) => onAlterarDados({ ataques })} />
        )}
        {aba.id === 'rituais' && (
          <Rituais dados={dados} onAlterarDados={onAlterarDados} onAbrirGrimorio={() => setGrimorioAberto(true)} />
        )}
        {aba.id === 'inventario' && <Inventario dados={dados} onAlterarDados={onAlterarDados} />}
        {aba.id === 'notas' && (
          <textarea
            className={styles.notas}
            defaultValue={dados.descricao ?? ''}
            onBlur={salvarNotas}
            placeholder="Aparência, personalidade, história, objetivos…"
          />
        )}
        {aba.emBreve && <p className={styles.vazio}>{aba.emBreve}</p>}
      </div>

      <div className={styles.protecao}>
        <CampoLinha rotulo="Proteção" valor={dados.protecao} onSalvar={(protecao) => onAlterarDados({ protecao })} />
        <CampoLinha rotulo="Resist." valor={dados.resistencias} onSalvar={(resistencias) => onAlterarDados({ resistencias })} />
        <CampoLinha rotulo="Profic." valor={dados.proficiencias} onSalvar={(proficiencias) => onAlterarDados({ proficiencias })} />

        <div className={styles.numeros}>
          <CampoLinha tipo="number" step="1.5" rotulo="Desl. (m)" valor={dados.deslocamento ?? 9}
            onSalvar={(deslocamento) => onAlterarDados({ deslocamento })} />
          <CampoLinha tipo="number" rotulo="Def. equip." valor={defesa.equipamento}
            onSalvar={(v) => onAlterarDados({ defesa: { ...defesa, equipamento: v } })} />
          <CampoLinha tipo="number" rotulo="Def. outros" valor={defesa.outros}
            onSalvar={(v) => onAlterarDados({ defesa: { ...defesa, outros: v } })} />
        </div>
      </div>

      {/* Modal para aprender rituais (fica fora do conteúdo para não ser cortado pela rolagem) */}
      <Grimorio
        aberto={grimorioAberto}
        onFechar={() => setGrimorioAberto(false)}
        dados={dados}
        onAlterarDados={onAlterarDados}
      />
    </Painel>
  );
}