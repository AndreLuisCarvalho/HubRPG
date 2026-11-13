import styles from './Notas.module.scss';

// As partes da descrição do personagem, cada uma com a sua caixa
const CAMPOS = [
  { id: 'aparencia', nome: 'Aparência', dica: 'Rosto, corpo, roupas, marcas, jeito de andar…' },
  { id: 'personalidade', nome: 'Personalidade', dica: 'Temperamento, manias, medos, como trata os outros…' },
  { id: 'historia', nome: 'História', dica: 'De onde veio, o que viveu, como conheceu o paranormal…' },
  { id: 'objetivos', nome: 'Objetivos', dica: 'O que quer alcançar, o que protege, o que busca descobrir…' },
];

/**
 * Aba de notas da ficha: Aparência, Personalidade, História e Objetivos.
 * Salva cada caixa ao sair dela (sem gravar a cada letra).
 * Fichas antigas tinham um texto único ("descricao"): ele aparece em "Outras anotações".
 */
export default function Notas({ dados, onAlterarDados }) {
  const notas = dados.notas ?? {};

  function salvar(campo, texto) {
    if (texto !== (notas[campo] ?? '')) onAlterarDados({ notas: { ...notas, [campo]: texto } });
  }

  function salvarAntigas(texto) {
    if (texto !== (dados.descricao ?? '')) onAlterarDados({ descricao: texto });
  }

  return (
    <div className={styles.notas}>
      {CAMPOS.map((c) => (
        <label key={c.id} className={styles.campo}>
          <span className={styles.nome}>{c.nome}</span>
          <textarea
            defaultValue={notas[c.id] ?? ''}
            onBlur={(e) => salvar(c.id, e.target.value)}
            placeholder={c.dica}
            rows={3}
          />
        </label>
      ))}

      {dados.descricao && (
        <label className={styles.campo}>
          <span className={styles.nome}>Outras anotações</span>
          <textarea
            defaultValue={dados.descricao}
            onBlur={(e) => salvarAntigas(e.target.value)}
            rows={3}
          />
        </label>
      )}
    </div>
  );
}
