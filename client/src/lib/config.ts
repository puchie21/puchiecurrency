export const API_BASE_URL = import.meta.env.PROD 
  ? '/.netlify/functions/api'
  : 'http://localhost:5000/api'; 