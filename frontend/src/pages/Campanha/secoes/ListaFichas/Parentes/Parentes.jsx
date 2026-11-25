import { useState } from 'react';
import Modal from '../../../../../components/Modal/Modal';
import { reduzirImagem } from '../../../../../services/imagem';
import styles from './Parentes.module.scss';

const SITUACOES = [
  { id: 'vivo', rotulo: 'Vivo' },
  { id: 'desaparecido', rotulo: 'Desaparecido' },
  { id: 'falecido', rotulo: 'Falecido' },
  { id: 'marcado', rotulo: 'Marcado pelo Outro Lado' },
];
const rotuloSituacao = (id) => SITUACOES.find((s) => s.id === id)?.rotulo ?? '';

/**
 * Faixa de parentes embaixo do cartão do agente (só o dono do agente e o mestre veem).
 * Clicar num parente abre a janela dele; "+ Parente" abre a janela vazia.
 */
export default function Parentes({ agente, parentes, mestre, onSalvar, onExcluir }) {
  const [aberto, setAberto] = useState(null);   // parente | 'novo' | null

  return (
    <div className={styles.faixa}>
      <span className={styles.rotulo}>Parentes</span>
      <div className={styles.lista}>
        {parentes.map((p) => (
          <button key={p.id} type="button" className={`${styles.parente} ${styles[p.dados.situacao] ?? ''}`} onClick={() => setAberto(p)}>
            <span className={styles.foto} aria-hidden="true">
              {p.dados.foto ? <img src={p.dados.foto} alt="" /> : p.nome.charAt(0)}
            </span>
            <span className={styles.texto}>
              <b>{p.nome}</b>
              <small>{[p.dados.relacao, rotuloSituacao(p.dados.situacao)].filter(Boolean).join(' · ') || 'Parente'}</small>
            </span>
          </button>
        ))}
        <button type="button" className={styles.novo} onClick={() => setAberto('novo')}>+ Parente</button>
      </div>

      <Modal
        aberto={Boolean(aberto)}
        onFechar={() => setAberto(null)}
        sobretitulo={`Parente de ${agente.nome}`}
        titulo={aberto === 'novo' ? 'Novo parente' : aberto?.nome}
        largura="560px"
      >
        {aberto && (
          <FormParente
            key={aberto === 'novo' ? 'novo' : aberto.id}
            parente={aberto === 'novo' ? null : aberto}
            mestre={mestre}
            onSalvar={async (dados) => { await onSalvar(aberto === 'novo' ? null : aberto, dados); setAberto(null); }}
            onExcluir={aberto === 'novo' ? null : async () => { await onExcluir(aberto); setAberto(null); }}
          />
        )}
      </Modal>
    </div>
  );
}

function FormParente({ parente, mestre, onSalvar, onExcluir }) {
  const [nome, setNome] = useState(parente?.nome ?? '');
  const [dados, setDados] = useState({ situacao: 'vivo', ...(parente?.dados ?? {}) });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const mudar = (campo) => (e) => setDados((d) => ({ ...d, [campo]: e.target.value }));

  async function escolherFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    try {
      const foto = await reduzirImagem(arquivo, 240);
      setDados((d) => ({ ...d, foto }));
    } catch (erroFoto) {
      setErro(erroFoto.message);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await onSalvar({ nome: nome.trim(), dados });
    } catch (erroSalvar) {
      setErro(erroSalvar.message);
      setSalvando(false);
    }
  }

  async function excluir() {
    setSalvando(true);
    try {
      await onExcluir();
    } catch (erroExcluir) {
      setErro(erroExcluir.message);
      setSalvando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <div className={styles.topo}>
        <label className={styles.retrato} title="Escolher foto">
          {dados.foto ? <img src={dados.foto} alt="" /> : <span>Foto</span>}
          <input type="file" accept="image/*" onChange={escolherFoto} />
        </label>
        <div className={styles.campos}>
          <label>
            <span>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} required autoFocus={!parente} />
          </label>
          <div className={styles.dupla}>
            <label>
              <span>Relação</span>
              <input value={dados.relacao ?? ''} onChange={mudar('relacao')} placeholder="Irmã, pai, filho…" maxLength={40} />
            </label>
            <label>
              <span>Idade</span>
              <input value={dados.idade ?? ''} onChange={mudar('idade')} placeholder="34" maxLength={20} />
            </label>
          </div>
        </div>
      </div>

      <div className={styles.dupla}>
        <label>
          <span>Situação</span>
          <select value={dados.situacao ?? 'vivo'} onChange={mudar('situacao')}>
            {SITUACOES.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
          </select>
        </label>
        <label>
          <span>Onde mora</span>
          <input value={dados.mora ?? ''} onChange={mudar('mora')} placeholder="Cidade ou lugar" maxLength={80} />
        </label>
      </div>

      <label>
        <span>Aparência</span>
        <textarea rows={3} value={dados.aparencia ?? ''} onChange={mudar('aparencia')} />
      </label>
      <label>
        <span>História</span>
        <textarea rows={5} value={dados.historia ?? ''} onChange={mudar('historia')} />
      </label>
      {mestre && (
        <label className={styles.nota}>
          <span>Nota do mestre · só você vê</span>
          <textarea rows={3} value={dados.notaMestre ?? ''} onChange={mudar('notaMestre')} placeholder="Ganchos, segredos…" />
        </label>
      )}

      {erro && <p className="erro">{erro}</p>}

      <div className={styles.botoes}>
        {onExcluir && (confirmando ? (
          <button type="button" className={styles.perigo} disabled={salvando} onClick={excluir}>Confirmar exclusão</button>
        ) : (
          <button type="button" disabled={salvando} onClick={() => setConfirmando(true)}>Excluir</button>
        ))}
        <button type="submit" className={styles.salvar} disabled={salvando || !nome.trim()}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
