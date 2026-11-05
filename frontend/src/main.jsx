import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/global.scss';
import { Campanha, MenuCampanhas } from './pages';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuCampanhas />} />
        <Route path="/campanha/:id" element={<Campanha />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);