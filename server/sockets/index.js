const { Server } = require('socket.io');
const passport = require('passport');
const Room = require('../models/Room');
const Message = require('../models/Message');

function registerSockets(server, { clientOrigin, sessionMiddleware }) {
    const io = new Server(server, {
        cors: {
            origin: clientOrigin,
            methods: ['GET', 'POST'],
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

    io.on('connection', (socket) => {
        const user = socket.request.user;

        socket.on('joinRoom', async ({ roomId }) => {
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
            await Room.findByIdAndUpdate(roomId, { $pull: { users: user._id } });
            socket.to(roomId).emit('userLeft', { userId: user._id, roomId });
            const rooms = await Room.find().select('-passwordHash').populate('users', 'displayName image');
            io.emit('updateRooms', rooms);
        });

        socket.on('sendMessage', async ({ roomId, text }, ack) => {
            try {
                const message = new Message({ text, user: user._id, room: roomId });
                await message.save();
                const populatedMessage = await Message.findById(message._id).populate('user', 'displayName image');
                io.to(roomId).emit('newMessage', populatedMessage);
                ack && ack({ ok: true, message: populatedMessage });
            } catch (error) {
                ack && ack({ ok: false, error: 'Failed to send' });
            }
        });

        socket.on('disconnect', async () => {
            const rooms = await Room.find({ users: user._id });
            for (const room of rooms) {
                room.users.pull(user._id);
                await room.save();
                socket.to(room._id.toString()).emit('userLeft', { userId: user._id, roomId: room._id.toString() });
            }
            const updatedRooms = await Room.find().select('-passwordHash').populate('users', 'displayName image');
            io.emit('updateRooms', updatedRooms);
        });
    });

    return io;
}

module.exports = { registerSockets };
