const router = require('express').Router();
const passport = require('passport');
const { clientOrigin } = require('../config');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: `${clientOrigin}/login` }),
    (req, res) => {
        res.redirect(clientOrigin);
    }
);

module.exports = router;
