import { useState } from 'react';
import { api } from '../../services/api';
import styles from './MenuCampanhas.module.scss';

// O que o site sabe montar hoje (ficha, livro, combate); "outro" vira uma campanha sem sistema
const SISTEMAS = [
  { id: 'ordem-paranormal', nome: 'Ordem Paranormal' },
  { id: '', nome: 'Outro sistema' },
];

const TEMAS = [
  { id: 'padrao', nome: 'Padrão' },
  { id: 'investigacao', nome: 'Investigação (pasta)' },
  { id: 'terror', nome: 'Terror (grimório)' },
  { id: 'medieval', nome: 'Medieval (pergaminho)' },
];

/** Criar campanha: quem cria vira o mestre e a campanha já nasce com o código dos jogadores */
export function FormNovaCampanha({ onCriada }) {
  const [nome, setNome] = useState('');
  const [sistemaId, setSistemaId] = useState(SISTEMAS[0].id);
  const [outro, setOutro] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tema, setTema] = useState('padrao');
  const [cor, setCor] = useState('#8b5cf6');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function criar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const sistema = SISTEMAS.find((s) => s.id === sistemaId);
      const campanha = await api.criarCampanha({
        nome: nome.trim(),
        sistema_id: sistemaId,
        sistema: sistemaId ? sistema.nome : outro.trim(),
        descricao: descricao.trim(),
        tema,
        cor,
      });
      onCriada(campanha);
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={criar}>
      <label>
        <span>Nome</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: A Cidade Sem Sol" maxLength={80} autoFocus />
      </label>
      <label>
        <span>Sistema</span>
        <select value={sistemaId} onChange={(e) => setSistemaId(e.target.value)}>
          {SISTEMAS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </label>
      {!sistemaId && (
        <label>
          <span>Qual sistema</span>
          <input value={outro} onChange={(e) => setOutro(e.target.value)} placeholder="Ex.: Tormenta20" maxLength={60} />
        </label>
      )}
      <label>
        <span>Descrição</span>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={400} placeholder="Uma frase sobre a campanha" />
      </label>
      <div className={styles.linha}>
        <label>
          <span>Visual do cartão</span>
          <select value={tema} onChange={(e) => setTema(e.target.value)}>
            {TEMAS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </label>
        <label className={styles.cor}>
          <span>Cor</span>
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
        </label>
      </div>
      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className={styles.principal} disabled={!nome.trim() || salvando}>
        {salvando ? 'Criando…' : 'Criar campanha'}
      </button>
    </form>
  );
}

/** Entrar na campanha de alguém pelo código (vira jogador) */
export function FormEntrar({ onEntrou }) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      onEntrou(await api.entrarNaCampanha(codigo));
    } catch (falha) {
      setErro(falha.message);
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={entrar}>
      <label>
        <span>Código que o mestre passou</span>
        <input
          className={styles.codigo}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="K7Q-2MX"
          maxLength={9}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className={styles.principal} disabled={codigo.replace(/[^A-Z0-9]/gi, '').length !== 6 || enviando}>
        {enviando ? 'Entrando…' : 'Entrar como jogador'}
      </button>
    </form>
  );
}
