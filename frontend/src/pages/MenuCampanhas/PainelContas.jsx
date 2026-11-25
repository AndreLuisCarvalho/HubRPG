import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import styles from './PainelContas.module.scss';

// O banco guarda a hora em UTC ("2026-11-25 14:03:00")
function quando(texto, comHora = false) {
  if (!texto) return 'nunca';
  const data = new Date(`${texto.replace(' ', 'T')}Z`);
  return data.toLocaleString('pt-BR', comHora
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Tela de Contas (só o dono do site): vagas, quem tem conta, bloquear e tirar de campanha */
export default function PainelContas({ meuId }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(null);   // id da conta a bloquear
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(
    () => api.listarContas().then(setDados).catch((e) => setErro(e.message)),
    [],
  );
  useEffect(() => { carregar(); }, [carregar]);

  async function executar(acao) {
    setOcupado(true);
    setErro('');
    try {
      await acao();
      setConfirmando(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (!dados) return <p className={styles.aviso}>{erro || 'Carregando…'}</p>;

  const google = dados.contas.filter((c) => !c.teste);
  const teste = dados.contas.filter((c) => c.teste);
  const cheio = dados.usadas >= dados.limite;

  function cartao(c) {
    const voce = c.id === meuId;
    return (
      <li key={c.id} className={`${styles.conta} ${c.bloqueado ? styles.bloqueada : ''}`}>
        <span className={styles.avatar}>
          {c.foto ? <img src={c.foto} alt="" referrerPolicy="no-referrer" /> : c.nome.charAt(0)}
        </span>

        <div className={styles.info}>
          <p className={styles.nome}>
            <b>{c.nome}</b>
            {voce && <span className={styles.selo}>Você</span>}
            {c.bloqueado ? <span className={`${styles.selo} ${styles.seloBloq}`}>Bloqueada</span> : null}
          </p>
          {c.email && <p className={styles.email}>{c.email}</p>}
          <p className={styles.datas}>
            Cadastro {quando(c.criado_em)} · Último acesso {quando(c.ultimo_acesso, true)}
          </p>

          {c.campanhas.length > 0 ? (
            <ul className={styles.campanhas}>
              {c.campanhas.map((camp) => (
                <li key={camp.id} className={camp.papel === 'mestre' ? styles.mestre : ''}>
                  <span>{camp.nome}</span>
                  <small>{camp.papel === 'mestre' ? 'mestre' : 'jogador'}</small>
                  {camp.papel === 'jogador' && (
                    <button
                      type="button"
                      disabled={ocupado}
                      title={`Tirar ${c.nome} de ${camp.nome} (o agente fica com o mestre)`}
                      aria-label={`Tirar de ${camp.nome}`}
                      onClick={() => executar(() => api.tirarDaCampanha(c.id, camp.id))}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            !c.bloqueado && <p className={styles.datas}>Sem campanha</p>
          )}

          {confirmando === c.id && (
            <div className={styles.confirmar}>
              <p>
                Bloquear {c.nome}? A conta sai de todas as campanhas, os agentes dela são <b>apagados</b> e a vaga fica livre.
              </p>
              <div>
                <button type="button" className={styles.perigo} disabled={ocupado} onClick={() => executar(() => api.bloquearConta(c.id))}>
                  Bloquear e apagar agentes
                </button>
                <button type="button" disabled={ocupado} onClick={() => setConfirmando(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {!voce && confirmando !== c.id && (
          c.bloqueado ? (
            <button
              type="button"
              className={styles.acao}
              disabled={ocupado || (cheio && !c.teste)}
              title={cheio && !c.teste ? 'Todas as vagas estão ocupadas' : undefined}
              onClick={() => executar(() => api.desbloquearConta(c.id))}
            >
              Desbloquear
            </button>
          ) : (
            <button type="button" className={styles.acao} disabled={ocupado} onClick={() => setConfirmando(c.id)}>
              Bloquear
            </button>
          )
        )}
      </li>
    );
  }

  return (
    <div className={styles.painel}>
      <div className={styles.vagas}>
        <p>
          <b>{dados.usadas}</b> de {dados.limite} vagas ocupadas
          {cheio && <span> · ninguém novo consegue entrar</span>}
        </p>
        <div className={styles.barra} role="presentation">
          <span style={{ width: `${Math.min(100, (dados.usadas / dados.limite) * 100)}%` }} />
        </div>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <ul className={styles.lista}>{google.map(cartao)}</ul>

      {teste.length > 0 && (
        <details className={styles.teste}>
          <summary>Contas de teste do PC ({teste.length}) · não ocupam vaga</summary>
          <ul className={styles.lista}>{teste.map(cartao)}</ul>
        </details>
      )}
    </div>
  );
}
