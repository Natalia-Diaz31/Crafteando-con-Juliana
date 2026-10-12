// js/config.js
// En local usamos la API de nuestra máquina (lee api_/.env); en línea, la API de Vercel
const esLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const API_URL = esLocal
    ? 'http://localhost:3000'
    : 'https://sistema-planillas-api.vercel.app';