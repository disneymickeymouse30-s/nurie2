import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { requestPersistentStorage } from './store/db';
import { markActiveToday } from './store/settings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

markActiveToday();
requestPersistentStorage();

// PWA：オフラインでも開けるようにする（対応していない環境では何もしない）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
