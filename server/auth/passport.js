const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { google } = require('../config');

function setupPassport() {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser((id, done) => {
        User.findById(id).then((user) => {
            done(null, user);
        });
    });

    passport.use(new GoogleStrategy({
        clientID: google.clientID,
        clientSecret: google.clientSecret,
        callbackURL: google.callbackURL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const currentUser = await User.findOne({ googleId: profile.id });
            if (currentUser) return done(null, currentUser);
            const newUser = await new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails && profile.emails[0] && profile.emails[0].value,
                image: profile.photos && profile.photos[0] && profile.photos[0].value
            }).save();
            return done(null, newUser);
        } catch (err) {
            return done(err);
        }
    }));
}

module.exports = { setupPassport };
