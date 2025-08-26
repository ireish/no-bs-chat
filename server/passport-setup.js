const User = require('./models/User');
const passport = require('passport');
require('dotenv').config();
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Determine callback URL robustly to avoid redirects to localhost without a port
const serverPort = process.env.PORT || 5000;
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

passport.serializeUser((user, done) => {
    done(null, user.id); // user.id is the MongoDB _id
});

passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
        done(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackURL
},
    (accessToken, refreshToken, profile, done) => {
        // Check if user already exists in our DB
        User.findOne({ googleId: profile.id }).then((currentUser) => {
            if (currentUser) {
                // Already have the user
                console.log('User is:', currentUser);
                done(null, currentUser);
            } else {
                // If not, create a new user in our DB
                new User({
                    googleId: profile.id,
                    displayName: profile.displayName,
                    email: profile.emails[0].value,
                    image: profile.photos[0].value
                }).save().then((newUser) => {
                    console.log('New user created:', newUser);
                    done(null, newUser);
                });
            }
        });
    }
));