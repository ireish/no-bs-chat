const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://localhost:${import.meta.env.VITE_SERVER_PORT || 5000}`;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

export const config = {
  API_BASE_URL,
  SOCKET_URL,
};
