import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import MenuCampanhas from './pages/MenuCampanhas.jsx';
import Campanha from './pages/Campanha.jsx';

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