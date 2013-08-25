var passport = require('passport'),
	mw = require('../lib/middlewares'),
	app = require('../lib/app');


app.all('/auth/*', mw.hard.anon);
app.get('/auth/imgur', passport.authenticate('imgur'));
app.get('/auth/imgur/callback', passport.authenticate('imgur', { successRedirect: '/', failureRedirect: '/' }));