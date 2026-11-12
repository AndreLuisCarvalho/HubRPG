import { useState } from 'react';
import Ataques from '../Ataques/Ataques';
import Grimorio from '../Grimorio/Grimorio';
import Inventario from '../Inventario/Inventario';
import Painel from '../Painel/Painel';
import Rituais from '../Rituais/Rituais';
import styles from './Abas.module.scss';

const ABAS = [
  { id: 'ataques', rotulo: 'Ataques' },
  { id: 'habilidades', rotulo: 'Habilid.', nome: 'Habilidades', emBreve: 'Habilidades de classe e trilha em breve.' },
  { id: 'rituais', rotulo: 'Rituais' },
  { id: 'inventario', rotulo: 'Itens', nome: 'Inventário' },
  { id: 'notas', rotulo: 'Notas' },
];
// rotulo = texto curto que cabe na aba; nome = nome completo (dica e leitores de tela)

export default function Abas({ dados, onAlterarDados, className = '' }) {
  const [ativa, setAtiva] = useState(ABAS[0].id);
  const [grimorioAberto, setGrimorioAberto] = useState(false);
  const aba = ABAS.find((a) => a.id === ativa);

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
            aria-label={a.nome}
            title={a.nome}
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