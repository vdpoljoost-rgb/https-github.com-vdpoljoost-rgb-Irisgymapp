import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Mount React
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Snelle fade-out van de preload-splash zodra React gestart is
const splash = document.getElementById('preload-splash');
if (splash) {
  // Kleine delay zodat de gebruiker de splash even ziet en het niet flikkert
  const startFade = () => {
    // Voeg fade-out klasse toe
    splash.classList.add('fade-out');
    // Verwijder het element na de animatie
    setTimeout(() => {
      if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
    }, 500); // zelfde als CSS transition-duration
  };

  // Als de splash-afbeelding al geladen is, meteen wegfaden
  const img = splash.querySelector('img');
  if (img && img.complete) {
    // Een heel korte vertraging maakt het “snappy” maar netjes
    setTimeout(startFade, 250);
  } else if (img) {
    // Wacht tot de foto geladen is of een timeout om niet te lang te blijven hangen
    let done = false;
    const onDone = () => {
      if (done) return;
      done = true;
      setTimeout(startFade, 200); // korte visuele pauze
    };
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener('error', onDone, { once: true });
    // Safety timeout: als load/error niet triggert om wat voor reden dan ook
    setTimeout(onDone, 1200);
  } else {
    // Geen img gevonden? Fallback: direct wegfaden
    setTimeout(startFade, 200);
  }
}
