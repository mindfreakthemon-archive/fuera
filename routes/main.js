var mw = require('../lib/middlewares'),
	app = require('../lib/app');


exports.index = function (req, res) {
	res.render('index');
};

exports.privacy = function (req, res) {
	res.render('privacy');
};

exports.terms = function (req, res) {
	res.render('terms');
};

app.get('/', mw.soft.anon, exports.index);
app.get('/privacy', exports.privacy);
app.get('/terms', exports.terms);