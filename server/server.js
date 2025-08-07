require('dotenv').config();
require('./passport-setup'); 

const express = require('express');
const cors = require('cors');
const http = require('http'); // 1. Import http
const { Server } = require("socket.io"); // 2. Import Server from socket.io
const passport = require('passport');
const session = require('express-session');
const mongoose = require('mongoose');
const Room = require('./models/Room');

const port = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;

const app = express();
const server = http.createServer(app); // 3. Create an HTTP server with our app

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Add middleware
app.use(cors({
    origin: 'http://localhost:5173', // Allow our client to make requests
    credentials: true // Allows session cookie to be sent back and forth
}));

app.use(express.json()); // Add this line
app.use(express.urlencoded({ extended: true }));


// 4. Initialize a new instance of socket.io by passing the server object
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // The origin of our client app (Vite's default port)
        methods: ["GET", "POST"]
    }
});



// A simple middleware to check if a user is authenticated
const authCheck = (req, res, next) => {
    if (!req.user) {
        // If the user is not authenticated, send an unauthorized error
        res.status(401).json({ message: "Not authorized" });
    } else {
        // If they are, proceed to the next middleware or route handler
        next();
    }
};

app.use(session({
    secret: 'a_very_secret_key', // Replace with a real secret key in production
    resave: false,
    saveUninitialized: false, // Set to false, we don't want to save sessions for unauthenticated users
    cookie: {
        httpOnly: true,
        secure: false, // Set to true if you're using https
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Our Google Auth Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication, redirect home.
        res.redirect('http://localhost:5173'); // Redirect to our client app
    }
);


app.get('/', (req, res) => {
  res.send('Hello from the server!');
});


app.get('/api/profile', authCheck, (req, res) => {
    // If authCheck passes, req.user will be available
    res.json(req.user); 
});


app.post('/api/rooms', authCheck, async (req, res) => {
    try {
        // Get the room name from the request body
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Room name is required' });
        }

        // Create a new room instance
        const newRoom = new Room({ name });

        // Save it to the database
        await newRoom.save();

        // Send the new room back as a confirmation
        res.status(201).json(newRoom);
    } catch (error) {
        // Handle potential errors, like a duplicate room name
        res.status(500).json({ message: 'Error creating room: ', error });
    }
});

// 5. Listen for a connection event
io.on('connection', (socket) => {
  console.log('A user connected with id:', socket.id);

  // Listen for a disconnect event
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 6. Start the server using the http server instance
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
