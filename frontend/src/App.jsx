import { useEffect, useState } from 'react';

export default function App() {
  const [campanhas, setCampanhas] = useState([]);

  useEffect(() => {
    fetch('/api/campanhas')
      .then((r) => r.json())
      .then(setCampanhas);
  }, []);

  return (
    <main>
      <h1>Campanhas de RPG</h1>
      <ul>
        {campanhas.map((c) => (
          <li key={c.id}>{c.nome} — {c.sistema}</li>
        ))}
      </ul>
    </main>
  );
}