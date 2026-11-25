import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../../services/api';
import { useAoMudar } from '../../../../services/tempoReal';
import Visualizador from '../Mapas/Visualizador';
import styles from './VisaoGeral.module.scss';

/**
 * "Onde o grupo está": miniatura do mapa marcado como atual, como os jogadores veem
 * (névoa opaca, sem nada oculto). Clicar abre o mapa. Sem mapa atual, não aparece.
 */
export default function MapaAtual({ campanha, agentes }) {
  const [mapa, setMapa] = useState(null);

  const [versao, setVersao] = useState(0);   // sobe quando um mapa muda em outra tela (tempo real)
  useAoMudar(campanha.id, ['mapas'], () => setVersao((v) => v + 1));

  useEffect(() => {
    const efeito = { ativo: true };
    api.listarMapas(campanha.id)
      .then((lista) => {
        const atual = lista.find((m) => m.dados.atual && !m.dados.oculto);
        return atual ? api.buscarMapa(atual.id) : null;
      })
      .then((m) => efeito.ativo && setMapa(m))
      .catch(() => {});   // sem mapa na Visão geral não é erro
    return () => { efeito.ativo = false; };
  }, [campanha.id, versao]);

  if (!mapa) return null;
  const { dados } = mapa;
  const link = `/campanha/${campanha.id}/mapas?mapa=${mapa.id}`;
  const tokens = (dados.tokens ?? []).flatMap((t) => {
    const ficha = agentes?.find((a) => a.id === t.fichaId);
    return ficha ? [{ id: t.fichaId, x: t.x, y: t.y, nome: ficha.nome, foto: ficha.imagem }] : [];
  });

  return (
    <section className={styles.bloco}>
      <header className={styles.topoBloco}>
        <h2>Onde o grupo está</h2>
        <Link to={link} className={styles.linkAcao}>Abrir mapa</Link>
      </header>
      <Link to={link} className={styles.miniMapa} aria-label={`Abrir o mapa ${mapa.nome}`}>
        <Visualizador
          miniatura
          imagem={mapa.imagem}
          pergaminho={dados.pergaminho !== false}
          mestre={false}
          pinos={(dados.pinos ?? []).filter((p) => !p.oculto)}
          rotas={(dados.rotas ?? []).filter((r) => !r.oculta)}
          notas={(dados.notas ?? []).filter((n) => !n.oculta)}
          tokens={tokens}
          nevoa={dados.usarNevoa ? { ativa: true, mascara: mapa.nevoa ?? '' } : null}
        />
        <span className={styles.nomeMapa}>{mapa.nome}</span>
      </Link>
    </section>
  );
}
