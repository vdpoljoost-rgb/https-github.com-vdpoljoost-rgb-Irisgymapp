import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Fade-out van de preload-splash zodra React gestart is
const splash = document.getElementById('preload-splash');
if (splash) {
  const startFade = () => {
    splash.classList.add('fade-out');
    setTimeout(() => {
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 500); // zelfde duur als CSS transition
  };

  const img = splash.querySelector('img');
  if (img && img.complete) {
    // Afbeelding is al geladen
    setTimeout(startFade, 250);
  } else if (img) {
    // Wacht op load of error
    let done = false;
    const onDone = () => {
      if (!done) {
        done = true;
        setTimeout(startFade, 200);
      }
    };
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener('error', onDone, { once: true });
    // Safety fallback
    setTimeout(onDone, 1200);
  } else {
    // Geen img gevonden
    setTimeout(startFade, 200);
  }
}
