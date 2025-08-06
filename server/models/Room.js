const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true, // Removes whitespace
        unique: true // No two rooms can have the same name
    }
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;