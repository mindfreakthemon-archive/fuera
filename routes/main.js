var mw = require('../lib/middlewares'),
	app = require('../lib/app');


exports.index = function (req, res) {
	res.render('index',{ title: 'Fuera' });
};

exports.privacy = function (req, res) {
	res.render('privacy', { title: 'Fuera - Privacy policy' });
};

exports.terms = function (req, res) {
	res.render('terms', { title: 'Fuera - Terms and conditions' });
};

app.get('/', mw.soft.anon, exports.index);
app.get('/privacy', exports.privacy);
app.get('/terms', exports.terms);