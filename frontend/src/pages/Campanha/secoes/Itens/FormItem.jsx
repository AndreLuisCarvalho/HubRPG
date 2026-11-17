import { useState } from 'react';
import Contador from '../../../../components/Contador/Contador';
import Seletor from '../../../../components/Seletor/Seletor';
import { reduzirImagem } from '../../../../services/imagem';
import EditorDano from '../../../../sistemas/ordemParanormal/FichaOrdemParanormal/partes/EditorDano/EditorDano';
import { ELEMENTOS } from '../../../../sistemas/ordemParanormal/modelo';
import { TIPOS_DE_ITEM } from '../../../../sistemas/ordemParanormal/itensCampanha';
import CartaItem from './CartaItem';
import styles from './Itens.module.scss';

const ROMANOS = ['0', 'I', 'II', 'III', 'IV'];
const OPCOES_TIPO = Object.entries(TIPOS_DE_ITEM).map(([valor, rotulo]) => ({ valor, rotulo }));
const OPCOES_ELEMENTO = [
  { valor: '', rotulo: 'Nenhum (item comum)' },
  ...Object.entries(ELEMENTOS).map(([valor, e]) => ({ valor, rotulo: e.nome })),
];

/**
 * Criar / editar um item do catálogo. A carta ao lado mostra como fica enquanto você escreve.
 * sessoes: para o "onde foi achado".
 */
export default function FormItem({ inicial, sessoes = [], onSalvar, onCancelar }) {
  const [item, setItem] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const { dados } = item;
  const paranormal = dados.paranormal ?? {};

  const mudar = (campo, valor) => setItem((i) => ({ ...i, dados: { ...i.dados, [campo]: valor } }));
  const mudarParanormal = (campo, valor) =>
    setItem((i) => ({ ...i, dados: { ...i.dados, paranormal: { ...i.dados.paranormal, [campo]: valor } } }));

  const opcoesSessao = [
    { valor: '', rotulo: 'Não registrar' },
    ...sessoes.map((s) => ({ valor: String(s.id), rotulo: `Sessão ${s.numero}`, detalhe: s.titulo })),
  ];

  async function escolherImagem(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      setErro('');
      mudar('imagem', await reduzirImagem(arquivo, 360));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    if (!item.nome.trim()) return setErro('Dê um nome ao item.');
    try {
      setSalvando(true);
      setErro('');
      await onSalvar({ ...item, nome: item.nome.trim(), dados: { ...dados, danos: (dados.danos ?? []).filter((d) => d.formula) } });
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <div className={styles.previa}>
        <CartaItem item={{ ...item, nome: item.nome || 'Nome do item' }} grande />
        <div className={styles.botoesImagem}>
          <label className={styles.secundario}>
            {dados.imagem ? 'Trocar imagem' : 'Escolher imagem'}
            <input type="file" accept="image/*" onChange={escolherImagem} hidden />
          </label>
          {dados.imagem && (
            <button type="button" className={styles.secundario} onClick={() => mudar('imagem', '')}>Tirar</button>
          )}
        </div>
      </div>

      <div className={styles.campos}>
        <label className={styles.campo}>
          <span>Nome</span>
          <input
            value={item.nome}
            onChange={(e) => setItem({ ...item, nome: e.target.value })}
            placeholder="Ex.: Lâmina do ritualista"
            maxLength={60}
            autoFocus
          />
        </label>

        <div className={styles.linha}>
          <div className={styles.campo}>
            <span>Tipo</span>
            <Seletor rotulo="Tipo do item" valor={dados.tipo} opcoes={OPCOES_TIPO} onMudar={(v) => mudar('tipo', v)} />
          </div>
          <div className={styles.campo}>
            <span>Espaços</span>
            <Contador valor={Number(dados.espacos) || 0} onMudar={(v) => mudar('espacos', v)} min={0} max={20} rotulo="Espaços" />
          </div>
        </div>

        <div className={styles.campo}>
          <span>Categoria</span>
          <div className={styles.categorias} role="radiogroup" aria-label="Categoria">
            {ROMANOS.map((r, c) => (
              <button key={r} type="button" role="radio" aria-checked={Number(dados.categoria) === c} onClick={() => mudar('categoria', c)}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.campo}>
          <span>Descrição</span>
          <textarea
            value={dados.descricao}
            onChange={(e) => mudar('descricao', e.target.value)}
            rows={3}
            placeholder="O que o item é e o que ele faz. Aparece na carta."
          />
        </label>

        <fieldset className={styles.grupo}>
          <legend>Dano (se causar)</legend>
          <EditorDano danos={dados.danos ?? []} onMudar={(danos) => mudar('danos', danos)} />
          <div className={styles.linha}>
            <label className={styles.campo}>
              <span>Crítico</span>
              <input value={dados.critico} onChange={(e) => mudar('critico', e.target.value)} placeholder="19/x3" maxLength={12} />
            </label>
            <label className={styles.campo}>
              <span>Alcance</span>
              <input value={dados.alcance} onChange={(e) => mudar('alcance', e.target.value)} placeholder="Corpo a corpo" maxLength={20} />
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.grupo}>
          <legend>Paranormal</legend>
          <div className={styles.linha}>
            <div className={styles.campo}>
              <span>Elemento</span>
              <Seletor rotulo="Elemento" valor={paranormal.elemento ?? ''} opcoes={OPCOES_ELEMENTO} onMudar={(v) => mudarParanormal('elemento', v)} />
            </div>
            <label className={styles.marcar}>
              <input type="checkbox" checked={Boolean(paranormal.amaldicoado)} onChange={(e) => mudarParanormal('amaldicoado', e.target.checked)} />
              Amaldiçoado
            </label>
          </div>
          <label className={styles.campo}>
            <span>Custo ou efeito colateral</span>
            <input
              value={paranormal.custo ?? ''}
              onChange={(e) => mudarParanormal('custo', e.target.value)}
              placeholder="Ex.: 2 de Sanidade por uso"
              maxLength={80}
            />
          </label>
        </fieldset>

        <div className={styles.campo}>
          <span>Onde foi achado</span>
          <Seletor
            rotulo="Sessão em que foi achado"
            valor={dados.sessaoId ? String(dados.sessaoId) : ''}
            opcoes={opcoesSessao}
            onMudar={(v) => mudar('sessaoId', v ? Number(v) : null)}
          />
        </div>

        <label className={styles.campo}>
          <span>Nota do mestre</span>
          <textarea
            value={dados.notaMestre}
            onChange={(e) => mudar('notaMestre', e.target.value)}
            rows={2}
            placeholder="Segredos do item. Fica escondida até você abrir."
          />
        </label>

        {erro && <p className="erro">{erro}</p>}

        <div className={styles.botoes}>
          <button type="button" className={styles.secundario} onClick={onCancelar}>Cancelar</button>
          <button type="submit" className={styles.primario} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar item'}</button>
        </div>
      </div>
    </form>
  );
}
