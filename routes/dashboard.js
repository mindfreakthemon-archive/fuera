var mw = require('../lib/middlewares.js'),
	app = require('../lib/app'),
	nohm = require('nohm').Nohm,
	models = nohm.getModels();

var User = models.User;

exports.dashboard = function (req, res) {
	res.render('dashboard', { title: 'Fuera - Map' });
};

app.get('/', mw.soft.user, exports.dashboard);
app.get('/dashboard', mw.hard.user, exports.dashboard);

app.io.route('map', {
	find: function (req) {
		User.findAndLoad({
			lat: {
				min: req.data.lat_lo,
				max: req.data.lat_hi
			},
			lng: {
				min: req.data.lng_lo,
				max: req.data.lng_hi
			}
		}, function (err, users) {
			var array = [];

			users.forEach(function (user) {
				if (user.p('coords')) {
					array.push(user.values());
				}
			});

			req.io.respond({
				error: err,
				users: array
			});
		});
	}
});