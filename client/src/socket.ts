import { io } from 'socket.io-client';

// The URL of our backend server
const URL = 'http://localhost:5000';

export const socket = io(URL);