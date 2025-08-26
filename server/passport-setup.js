// This legacy entry now delegates to the modular setup in auth/passport.js
const { setupPassport } = require('./auth/passport');
module.exports = { setupPassport };