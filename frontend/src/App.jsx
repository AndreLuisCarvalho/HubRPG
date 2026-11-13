import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

// Cada página vira um arquivo separado: o menu inicial não baixa a campanha/ficha, e vice-versa
const MenuCampanhas = lazy(() => import('./pages/MenuCampanhas/MenuCampanhas'));
const Campanha = lazy(() => import('./pages/Campanha/Campanha'));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<MenuCampanhas />} />
        <Route path="/campanha/:id/*" element={<Campanha />} />
      </Routes>
    </Suspense>
  );
}
