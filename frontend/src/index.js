import React from 'react';
import ReactDOM from 'react-dom/client';
import processLib from 'process';
import { Buffer } from 'buffer';
import './index.css';
import App from './App';

if (typeof window !== 'undefined') {
  window.global = window;
  window.Buffer = Buffer;
  window.process = processLib;
  window.process.env = {}; // Ensure env object exists
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
