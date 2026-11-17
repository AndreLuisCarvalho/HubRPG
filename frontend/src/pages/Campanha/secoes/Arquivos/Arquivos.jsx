import { useEffect, useState } from 'react';
import Modal from '../../../../components/Modal/Modal';
import { api } from '../../../../services/api';
import { ARQUIVO_NOVO, estadoDo, porCaso } from './regras';
import FormArquivo from './FormArquivo';
import Pasta from './Pasta';
import Terminal from './Terminal';
import VerArquivo from './VerArquivo';
import styles from './Arquivos.module.scss';

const chaveVisao = (id) => `hubrpg:arquivos:visao:${id}`;
function lerVisao(id) {
  try {
    return localStorage.getItem(chaveVisao(id)) ?? 'mestre';
  } catch {
    return 'mestre';
  }
}

// A lista guarda só o resumo; o conteúdo (pesado) é buscado ao abrir
const semConteudo = ({ conteudo: _conteudo, ...resto }) => resto;

/**
 * Armazém de arquivos da campanha, em pastas por caso.
 * Visão do mestre: tudo, inclusive o que está oculto, com as ações.
 * Visão dos jogadores (para a tela da mesa): só o que foi liberado; o trancado pede a senha no terminal.
 */
export default function Arquivos({ campanha }) {
  const [arquivos, setArquivos] = useState(null);
  const [sessoes, setSessoes] = useState([]);
  const [erro, setErro] = useState('');
  const [visao, setVisao] = useState(() => lerVisao(campanha.id));
  // { modo: 'ver' | 'terminal' | 'form', arquivo }
  const [janela, setJanela] = useState(null);
  const mestre = visao === 'mestre';

  useEffect(() => {
    const efeito = { ativo: true };
    Promise.all([api.listarArquivos(campanha.id), api.listarSessoes(campanha.id).catch(() => [])])
      .then(([a, s]) => {
        if (!efeito.ativo) return;
        setArquivos(a);
        setSessoes(s);
      })
      .catch((e) => efeito.ativo && setErro(e.message));
    return () => { efeito.ativo = false; };
  }, [campanha.id]);

  function trocarVisao(nova) {
    setVisao(nova);
    try { localStorage.setItem(chaveVisao(campanha.id), nova); } catch { /* sem armazenamento: só não lembra */ }
  }

  const fechar = () => setJanela(null);
  const trocarNaLista = (salvo) =>
    setArquivos((lista) => (lista.some((a) => a.id === salvo.id)
      ? lista.map((a) => (a.id === salvo.id ? semConteudo(salvo) : a))
      : [...lista, semConteudo(salvo)]));

  async function mudarDados(arquivo, parcial) {
    try {
      setErro('');
      const salvo = await api.atualizarArquivo(arquivo.id, { titulo: arquivo.titulo, dados: { ...arquivo.dados, ...parcial } });
      trocarNaLista(salvo);
      return semConteudo(salvo);
    } catch (e) {
      setErro(e.message);
      return null;
    }
  }

  function abrir(arquivo) {
    const trancado = estadoDo(arquivo) === 'trancado';
    setJanela({ modo: trancado && !mestre ? 'terminal' : 'ver', arquivo });
  }

  async function destrancar(arquivo) {
    const salvo = await mudarDados(arquivo, { destrancado: true });
    if (salvo) setJanela({ modo: 'ver', arquivo: salvo, revelado: true });
  }

  async function editar(arquivo) {
    try {
      const completo = await api.buscarArquivo(arquivo.id);
      setJanela({ modo: 'form', arquivo: { ...completo, dados: { ...ARQUIVO_NOVO.dados, ...completo.dados } } });
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvar(arquivo) {
    const salvo = arquivo.id
      ? await api.atualizarArquivo(arquivo.id, arquivo)
      : await api.criarArquivo(campanha.id, arquivo);
    trocarNaLista(salvo);
    setJanela({ modo: 'ver', arquivo: semConteudo(salvo) });
  }

  async function excluir(arquivo) {
    if (!window.confirm(`Apagar o arquivo “${arquivo.titulo}”? Isso não pode ser desfeito.`)) return;
    try {
      await api.excluirArquivo(arquivo.id);
      setArquivos((lista) => lista.filter((a) => a.id !== arquivo.id));
      fechar();
    } catch (e) {
      setErro(e.message);
    }
  }

  const visiveis = (arquivos ?? []).filter((a) => mestre || a.dados.liberado);
  const grupos = porCaso(visiveis);
  const casos = [...new Set((arquivos ?? []).map((a) => a.dados.caso?.trim()).filter(Boolean))];
  const sessaoDe = (a) => sessoes.find((s) => s.id === a.dados.sessaoId);
  const ocultos = (arquivos ?? []).filter((a) => !a.dados.liberado).length;

  const atual = janela?.arquivo;

  return (
    <section className={styles.pagina}>
      <header className={styles.topo}>
        <h1>Arquivos</h1>
        {arquivos && <span className={styles.contagem}>{visiveis.length}</span>}

        <div className={styles.acoesTopo}>
          <div className={styles.visao} role="radiogroup" aria-label="Visão">
            <button type="button" role="radio" aria-checked={mestre} onClick={() => trocarVisao('mestre')}>Mestre</button>
            <button type="button" role="radio" aria-checked={!mestre} onClick={() => trocarVisao('jogadores')}>Jogadores</button>
          </div>
          {mestre && (
            <button type="button" className={styles.novo} onClick={() => setJanela({ modo: 'form', arquivo: ARQUIVO_NOVO })}>
              + Novo arquivo
            </button>
          )}
        </div>
      </header>

      <p className={styles.dica}>
        {mestre
          ? <>Você vê tudo, inclusive {ocultos === 1 ? '1 arquivo oculto' : `${ocultos} arquivos ocultos`}. Libere durante a sessão; o que tiver senha os jogadores destrancam no terminal. Antes de virar a tela para a mesa, troque para <b>Jogadores</b>.</>
          : <>Arquivos liberados para o grupo. Pastas trancadas pedem a senha.</>}
      </p>

      {erro && <p className="erro">{erro}</p>}
      {!arquivos && !erro && <p className={styles.dica}>Carregando…</p>}

      {arquivos && visiveis.length === 0 && (
        <p className={styles.vazio}>
          {mestre ? 'Nenhum arquivo ainda. Crie o primeiro.' : 'Nenhum arquivo liberado ainda.'}
        </p>
      )}

      {grupos.map(([caso, lista]) => (
        <section key={caso || '-'} className={styles.caso}>
          <h2>
            {caso || 'Sem caso'}
            <small>{lista.length} {lista.length === 1 ? 'arquivo' : 'arquivos'}</small>
          </h2>
          <ul className={styles.pastas}>
            {lista.map((a) => (
              <li key={a.id}>
                <Pasta arquivo={a} sessao={sessaoDe(a)} onAbrir={() => abrir(a)} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Modal
        aberto={Boolean(janela)}
        onFechar={fechar}
        largura={{ terminal: '620px', form: '720px' }[janela?.modo] ?? '880px'}
        classeCaixa={`${styles.caixa} ${janela?.revelado ? styles.revelado : ''}`}
        titulo={janela?.modo === 'form' ? (atual?.id ? 'Editar arquivo' : 'Novo arquivo') : undefined}
      >
        {janela?.modo === 'terminal' && (
          <Terminal key={atual.id} arquivo={atual} onDestrancar={() => destrancar(atual)} />
        )}

        {janela?.modo === 'ver' && (
          <VerArquivo
            key={atual.id}
            arquivo={atual}
            sessao={sessaoDe(atual)}
            mestre={mestre}
            acoes={(
              <div className={styles.botoes}>
                <button
                  type="button"
                  className={styles.primario}
                  onClick={async () => {
                    const salvo = await mudarDados(atual, { liberado: !atual.dados.liberado });
                    if (salvo) setJanela({ modo: 'ver', arquivo: salvo });
                  }}
                >
                  {atual.dados.liberado ? 'Esconder dos jogadores' : 'Liberar para os jogadores'}
                </button>
                <button type="button" className={styles.secundario} onClick={() => editar(atual)}>Editar</button>
                <button type="button" className={styles.perigo} onClick={() => excluir(atual)}>Apagar</button>
              </div>
            )}
          />
        )}

        {janela?.modo === 'form' && (
          <FormArquivo
            key={atual.id ?? 'novo'}
            inicial={atual}
            casos={casos}
            sessoes={sessoes}
            onSalvar={salvar}
            onCancelar={fechar}
          />
        )}
      </Modal>
    </section>
  );
}
