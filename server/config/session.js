const session = require('express-session');

function createSession() {
    return session({
        secret: process.env.SESSION_SECRET || 'a_very_secret_key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        }
    });
}

module.exports = { createSession };
