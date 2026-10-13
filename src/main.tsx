import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './app/styles/global.scss';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('Application root element not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
