import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { handleSpotifyCallback } from './lib/spotifyAuth';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/400-italic.css';
import '@fontsource/merriweather/700.css';
import './styles.css';


// trata o retorno do login do Spotify (?code=…) antes de iniciar o app
handleSpotifyCallback()
  .then((err) => {
    if (err) sessionStorage.setItem('mb:sp:msg', err);
  })
  .catch(() => undefined)
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
