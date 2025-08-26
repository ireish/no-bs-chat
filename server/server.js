require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const passport = require('passport');
const mongoose = require('mongoose');

const { port, mongoURI, clientOrigin } = require('./config');
const { createSession } = require('./config/session');
const { setupPassport } = require('./auth/passport');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { registerSockets } = require('./sockets');

const app = express();
const server = http.createServer(app);

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Add middleware
app.use(cors({
    origin: clientOrigin, // Allow our client to make requests
    credentials: true // Allows session cookie to be sent back and forth
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const sessionMiddleware = createSession();
app.use(sessionMiddleware);

setupPassport();
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);


app.get('/', (req, res) => {
  res.send('Hello from the server!');
});


app.use('/api', apiRoutes);

registerSockets(server, { clientOrigin, sessionMiddleware });

// 6. Start the server using the http server instance
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
