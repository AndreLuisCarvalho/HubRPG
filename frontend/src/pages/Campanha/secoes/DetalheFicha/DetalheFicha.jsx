import { Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../../services/api';
import { obterSistema } from '../../../../sistemas';
import styles from './DetalheFicha.module.scss';

const VOLTAR_PARA = {
  jogador: { caminho: 'jogadores', rotulo: 'Jogadores' },
  npc: { caminho: 'npcs', rotulo: 'NPCs' },
  monstro: { caminho: 'monstros', rotulo: 'Monstros' },
};

export default function DetalheFicha({ campanha }) {
  const { fichaId } = useParams();
  const [ficha, setFicha] = useState(null);
  const [erro, setErro] = useState('');
  const sistema = obterSistema(campanha.sistema_id);

  useEffect(() => {
    api.buscarFicha(fichaId).then(setFicha).catch((e) => setErro(e.message));
  }, [fichaId]);

  // Atualização otimista: a tela muda na hora e o servidor salva em seguida
  function alterarDados(parcial) {
    setFicha((atual) => ({ ...atual, dados: { ...atual.dados, ...parcial } }));
    api.atualizarFicha(fichaId, { dados: parcial })
      .catch((e) => setErro(`Não foi possível salvar: ${e.message}`));
  }

  // Campos da própria ficha, fora de "dados" (ex.: { imagem })
  function alterarFicha(parcial) {
    setFicha((atual) => ({ ...atual, ...parcial }));
    api.atualizarFicha(fichaId, parcial)
      .catch((e) => setErro(`Não foi possível salvar: ${e.message}`));
  }

  if (!ficha) {
    return <p className={erro ? 'erro' : styles.aviso}>{erro || 'Carregando…'}</p>;
  }

  const voltar = VOLTAR_PARA[ficha.tipo] ?? VOLTAR_PARA.jogador;

  return (
    <section className={styles.detalhe}>
      <Link to={`/campanha/${campanha.id}/${voltar.caminho}`} className={styles.voltar}>
        ← {voltar.rotulo}
      </Link>

      {erro && <p className="erro">{erro}</p>}

      {sistema ? (
        // A ficha do sistema é carregada sob demanda (arquivo separado)
        <Suspense fallback={<p className={styles.aviso}>Carregando ficha…</p>}>
          <sistema.Ficha ficha={ficha} onAlterarDados={alterarDados} onAlterarFicha={alterarFicha} />
        </Suspense>
      ) : (
        <p className={styles.aviso}>
          A ficha do sistema “{campanha.sistema_id || 'não definido'}” ainda não está disponível.
        </p>
      )}
    </section>
  );
}