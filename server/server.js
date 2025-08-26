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
const Message = require('./models/Message');

const port = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.createServer(app); // 3. Create an HTTP server with our app

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Add middleware
app.use(cors({
    origin: clientOrigin, // Allow our client to make requests
    credentials: true // Allows session cookie to be sent back and forth
}));

app.use(express.json()); // Add this line
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
    secret: 'a_very_secret_key', // Replace with a real secret key in production
    resave: false,
    saveUninitialized: false, // Set to false, we don't want to save sessions for unauthenticated users
    cookie: {
        httpOnly: true,
        secure: false, // Set to true if you're using https
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
});

// 4. Initialize a new instance of socket.io by passing the server object
const io = new Server(server, {
    cors: {
        origin: clientOrigin, // The origin of our client app (Vite's default port)
        methods: ["GET", "POST"],
        credentials: true
    }
});

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
    if (socket.request.user) {
        next();
    } else {
        next(new Error('unauthorized'));
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

app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

// Our Google Auth Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: `${clientOrigin}/login` }),
    (req, res) => {
        // Successful authentication, redirect home.
        res.redirect(clientOrigin); // Redirect to our client app
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
        const { name, password } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Room name is required' });
        }

        // Generate a unique 6-digit room number
        const generateNumber = () => String(Math.floor(100000 + Math.random() * 900000));
        let number = generateNumber();
        // Ensure uniqueness (try up to 5 times)
        for (let i = 0; i < 5; i++) {
            const exists = await Room.findOne({ number });
            if (!exists) break;
            number = generateNumber();
        }

        let passwordHash = null;
        if (password && password.length > 0) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        // Create a new room instance
        const newRoom = new Room({ name, number, passwordHash });

        // Save it to the database
        await newRoom.save();

        // Send the new room back as a confirmation (omit passwordHash)
        const { passwordHash: _, ...roomObj } = newRoom.toObject();
        res.status(201).json(roomObj);
    } catch (error) {
        // Handle potential errors, like a duplicate room name
        res.status(500).json({ message: 'Error creating room: ', error });
    }
});

// List all rooms (requires auth)
app.get('/api/rooms', authCheck, async (req, res) => {
    try {
        const rooms = await Room.find().select('-passwordHash').sort({ name: 1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rooms', error });
    }
});

app.get('/api/rooms/:roomId/messages', authCheck, async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.roomId })
            .sort({ createdAt: 'ascending' })
            .populate('user', 'displayName image'); // Populate user info
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error });
    }
});

// 5. Listen for a connection event
io.on('connection', (socket) => {
  console.log('A user connected with id:', socket.id);
  const user = socket.request.user;
  console.log('Authenticated user:', user.displayName);

  socket.on('joinRoom', async ({ roomId }) => {
    // Deprecated: keep for backward compat but do not recommend
    if (!roomId) return;
    socket.join(roomId);
    await Room.findByIdAndUpdate(roomId, { $addToSet: { users: user._id } });
    socket.to(roomId).emit('userJoined', { user, roomId });
    const rooms = await Room.find().select('-passwordHash').populate('users', 'displayName image');
    io.emit('updateRooms', rooms);
  });

  socket.on('joinRoomByNumber', async ({ roomNumber, password }, ack) => {
    try {
      const room = await Room.findOne({ number: roomNumber });
      if (!room) return ack && ack({ ok: false, error: 'Room not found' });
      if (room.passwordHash) {
        const bcrypt = require('bcryptjs');
        const match = await bcrypt.compare(password || '', room.passwordHash);
        if (!match) return ack && ack({ ok: false, error: 'Invalid password' });
      }
      const roomId = room._id.toString();
      socket.join(roomId);
      await Room.findByIdAndUpdate(roomId, { $addToSet: { users: user._id } });
      socket.to(roomId).emit('userJoined', { user, roomId });
      const rooms = await Room.find().select('-passwordHash').populate('users', 'displayName image');
      io.emit('updateRooms', rooms);
      const safeRoom = await Room.findById(roomId).select('-passwordHash').populate('users', 'displayName image');
      ack && ack({ ok: true, room: safeRoom });
    } catch (e) {
      ack && ack({ ok: false, error: 'Join failed' });
    }
  });

  socket.on('leaveRoom', async ({ roomId }) => {
    socket.leave(roomId);
    console.log(`${user.displayName} left room ${roomId}`);

    // Remove user from the room in the database
    await Room.findByIdAndUpdate(roomId, { $pull: { users: user._id } });
    
    // Notify other users in the room
    socket.to(roomId).emit('userLeft', { userId: user._id, roomId });

    // Send updated room info to all clients
    const rooms = await Room.find().select('-passwordHash').populate('users', 'displayName image');
    io.emit('updateRooms', rooms);
  });

  socket.on('sendMessage', async ({ roomId, text }, ack) => {
    try {
      const message = new Message({
        text,
        user: user._id,
        room: roomId,
      });
      await message.save();
      
      // Populate user info before sending to clients
      const populatedMessage = await Message.findById(message._id).populate('user', 'displayName image');
      
      // Broadcast the new message to the room
      io.to(roomId).emit('newMessage', populatedMessage);
      ack && ack({ ok: true, message: populatedMessage });
    } catch (error) {
      console.error('Error sending message:', error);
      ack && ack({ ok: false, error: 'Failed to send' });
    }
  });

  // Listen for a disconnect event
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    // On disconnect, remove user from all rooms
    const rooms = await Room.find({ users: user._id });
    for (const room of rooms) {
      room.users.pull(user._id);
      await room.save();
      // Notify other users in the room
      socket.to(room._id.toString()).emit('userLeft', { userId: user._id, roomId: room._id.toString() });
    }
    // Send updated room info to all clients
    const updatedRooms = await Room.find().select('-passwordHash').populate('users', 'displayName image');
    io.emit('updateRooms', updatedRooms);
  });
});

// 6. Start the server using the http server instance
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
