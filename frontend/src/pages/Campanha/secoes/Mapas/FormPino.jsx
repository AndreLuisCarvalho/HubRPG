import { useState } from 'react';
import Seletor from '../../../../components/Seletor/Seletor';
import IconePino from './IconePino';
import { TIPOS_LINK, TIPOS_PINO } from './regrasMapa';
import styles from './Mapas.module.scss';

const OPCOES_LINK = [{ valor: '', rotulo: 'Nenhum' }, ...Object.entries(TIPOS_LINK).map(([valor, rotulo]) => ({ valor, rotulo }))];

/**
 * Editar um pino: tipo (com o ícone), nome, descrição, para onde aponta e se fica oculto.
 * destinos: { mapa: [{ valor, rotulo }], arquivo: [...], ... } — as opções de cada tipo de link
 */
export default function FormPino({ inicial, destinos, onSalvar, onCancelar }) {
  const [pino, setPino] = useState(inicial);
  const mudar = (campo, valor) => setPino((p) => ({ ...p, [campo]: valor }));

  function trocarTipo(tipo) {
    // Passagem já sugere o link para outro mapa
    setPino((p) => ({ ...p, tipo, link: tipo === 'passagem' && !p.link ? { tipo: 'mapa', id: null } : p.link }));
  }

  function enviar(e) {
    e.preventDefault();
    const link = pino.link?.tipo && pino.link.id ? pino.link : null;
    onSalvar({ ...pino, nome: pino.nome.trim(), descricao: pino.descricao.trim(), link });
  }

  const opcoesDestino = destinos[pino.link?.tipo] ?? [];

  return (
    <form className={styles.formPino} onSubmit={enviar}>
      <div className={styles.campo}>
        <span>Tipo</span>
        <div className={styles.tiposPino} role="radiogroup" aria-label="Tipo do pino">
          {Object.entries(TIPOS_PINO).map(([id, t]) => (
            <button key={id} type="button" role="radio" aria-checked={pino.tipo === id} onClick={() => trocarTipo(id)} style={{ '--c': t.cor }}>
              <span className={styles.selo}><IconePino tipo={id} /></span>
              {t.nome}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.campo}>
        <span>Nome</span>
        <input value={pino.nome} onChange={(e) => mudar('nome', e.target.value)} placeholder="Ex.: Hospital São Lucas" maxLength={60} autoFocus />
      </label>

      <label className={styles.campo}>
        <span>Descrição</span>
        <textarea value={pino.descricao} onChange={(e) => mudar('descricao', e.target.value)} rows={3} placeholder="O que há neste lugar." />
      </label>

      <div className={styles.linha}>
        <div className={styles.campo}>
          <span>Leva a</span>
          <Seletor
            rotulo="Tipo de link"
            valor={pino.link?.tipo ?? ''}
            opcoes={OPCOES_LINK}
            onMudar={(tipo) => mudar('link', tipo ? { tipo, id: null } : null)}
          />
        </div>
        {pino.link?.tipo && (
          <div className={styles.campo}>
            <span>{TIPOS_LINK[pino.link.tipo]}</span>
            {opcoesDestino.length ? (
              <Seletor
                rotulo="Destino do link"
                valor={pino.link.id ? String(pino.link.id) : ''}
                placeholder="Escolher…"
                opcoes={opcoesDestino}
                onMudar={(id) => mudar('link', { tipo: pino.link.tipo, id: Number(id) })}
              />
            ) : (
              <small className={styles.ajuda}>Nada para escolher ainda.</small>
            )}
          </div>
        )}
      </div>

      <label className={styles.marcar}>
        <input type="checkbox" checked={pino.oculto} onChange={(e) => mudar('oculto', e.target.checked)} />
        Oculto (os jogadores não veem até você mostrar)
      </label>

      <div className={styles.botoes}>
        <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
        <button type="submit" className={styles.primario}>Salvar pino</button>
      </div>
    </form>
  );
}
