require('dotenv').config();

const port = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Compute Google OAuth callback URL robustly
const serverPort = port;
let googleCallbackURL = `http://localhost:${serverPort}/auth/google/callback`;
const envCallback = process.env.GOOGLE_CALLBACK_URL;
if (envCallback) {
    try {
        const parsed = new URL(envCallback);
        if (parsed.hostname === 'localhost' && !parsed.port) {
            parsed.port = String(serverPort);
            googleCallbackURL = parsed.toString();
            console.warn(`[auth] GOOGLE_CALLBACK_URL missing port. Using: ${googleCallbackURL}`);
        } else {
            googleCallbackURL = envCallback;
        }
    } catch (err) {
        console.warn(`[auth] Invalid GOOGLE_CALLBACK_URL. Falling back to: ${googleCallbackURL}`);
    }
} else {
    console.warn(`[auth] GOOGLE_CALLBACK_URL not set. Using default: ${googleCallbackURL}`);
}

const google = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackURL
};

module.exports = {
    port,
    mongoURI,
    clientOrigin,
    google
};
