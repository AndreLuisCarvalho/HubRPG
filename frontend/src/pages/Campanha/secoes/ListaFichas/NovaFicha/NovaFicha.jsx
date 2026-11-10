import { useState } from 'react';
import { Modal } from '../../../../../components';
import styles from './NovaFicha.module.scss';

const TEXTOS = {
  jogador: { sobretitulo: 'Novo agente da Ordem', titulo: 'Recrutar agente' },
  npc: { sobretitulo: 'Novo personagem', titulo: 'Criar NPC' },
  monstro: { sobretitulo: 'Nova ameaça', titulo: 'Criar monstro' },
};

export default function NovaFicha({ aberto, onFechar, onCriar, sistema, tipo }) {
  const classes = sistema?.classes ?? [];
  const origens = sistema?.origens ?? [];
  const textos = TEXTOS[tipo] ?? TEXTOS.jogador;

  const [nome, setNome] = useState('');
  const [jogador, setJogador] = useState('');
  const [origem, setOrigem] = useState('');
  const [classe, setClasse] = useState(classes[0]?.id ?? '');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();   // impede o formulário de recarregar a página
    if (!nome.trim()) return;
    setEnviando(true);
    try {
      await onCriar({ nome: nome.trim(), opcoes: { classe, jogador: jogador.trim(), origem: origem.trim() } });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} onFechar={onFechar} sobretitulo={textos.sobretitulo} titulo={textos.titulo}>
      <form className={styles.form} onSubmit={enviar}>
        <label className={styles.campo}>
          <span>Nome do personagem</span>
          <input autoFocus required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Helena Vasconcelos" />
        </label>

        {tipo === 'jogador' && (
          <label className={styles.campo}>
            <span>Jogador</span>
            <input value={jogador} onChange={(e) => setJogador(e.target.value)} placeholder="Quem vai jogar com este agente" />
          </label>
        )}

        {classes.length > 0 && (
          <fieldset className={styles.campo}>
            <legend>Classe</legend>
            <div className={styles.classes}>
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.classe} ${classe === c.id ? styles.escolhida : ''}`}
                  onClick={() => setClasse(c.id)}
                  aria-pressed={classe === c.id}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={c.icone} /></svg>
                  <b>{c.nome}</b>
                  <small>{c.descricao}</small>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label className={styles.campo}>
          <span>Origem</span>
          {/* Sistema com lista de origens: escolhe da lista; senão, texto livre */}
          {origens.length > 0 ? (
            <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
              <option value="">Escolher depois</option>
              {origens.map((o) => (
                <option key={o.id} value={o.id}>{o.nome} · {o.poder}</option>
              ))}
            </select>
          ) : (
            <input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex.: Acadêmico, Policial, T.I." />
          )}
        </label>

        <div className={styles.acoes}>
          <button type="button" className={styles.cancelar} onClick={onFechar}>Cancelar</button>
          <button type="submit" className={styles.criar} disabled={enviando || !nome.trim()}>
            {enviando ? 'Criando…' : 'Criar e abrir ficha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}