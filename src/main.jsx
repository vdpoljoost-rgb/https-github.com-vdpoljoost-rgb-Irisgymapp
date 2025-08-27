import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // <— .jsx ERBIJ, hoofdletter A

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
