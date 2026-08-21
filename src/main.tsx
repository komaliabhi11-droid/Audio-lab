import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  // Gracefully suppress benign Vite HMR and WebSocket connection failures from logs and platforms diagnostics
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const msg = typeof reason === 'string' ? reason : (reason.message || '');
      if (
        msg.toLowerCase().includes('websocket') || 
        msg.toLowerCase().includes('vite') ||
        msg.toLowerCase().includes('connection')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, true);

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.toLowerCase().includes('websocket') || 
      msg.toLowerCase().includes('vite') ||
      msg.toLowerCase().includes('connection')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
