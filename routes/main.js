var mw = require('../lib/middlewares'),
	app = require('../lib/app');


exports.index = function (req, res) {
	res.render('index');
};


app.get('/', mw.soft.anon, exports.index);