const router = require('express').Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const { authCheck } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/profile', authCheck, (req, res) => {
    res.json(req.user);
});

router.post('/rooms', authCheck, async (req, res) => {
    try {
        const { name, password } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Room name is required' });
        }

        const generateNumber = () => String(Math.floor(100000 + Math.random() * 900000));
        let number = generateNumber();
        for (let i = 0; i < 5; i++) {
            const exists = await Room.findOne({ number });
            if (!exists) break;
            number = generateNumber();
        }

        let passwordHash = null;
        if (password && password.length > 0) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        const newRoom = new Room({ name, number, passwordHash });
        await newRoom.save();
        const { passwordHash: _, ...roomObj } = newRoom.toObject();
        res.status(201).json(roomObj);
    } catch (error) {
        res.status(500).json({ message: 'Error creating room: ', error });
    }
});

router.get('/rooms', authCheck, async (req, res) => {
    try {
        const rooms = await Room.find().select('-passwordHash').sort({ name: 1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rooms', error });
    }
});

router.get('/rooms/:roomId/messages', authCheck, async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.roomId })
            .sort({ createdAt: 'ascending' })
            .populate('user', 'displayName image');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error });
    }
});

module.exports = router;
