import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.scss';
import App from './App';
import ContaProvider from './conta/ContaProvider';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ContaProvider>
        <App />
      </ContaProvider>
    </BrowserRouter>
  </StrictMode>
);
