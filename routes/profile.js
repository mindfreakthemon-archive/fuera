var mw = require('../lib/middlewares.js'),
	app = require('../lib/app'),
	nohm = require('nohm').Nohm,
	models = nohm.getModels();

var User = models.User;

exports.dashboard = function (req, res) {
	res.render('dashboard');
};

exports.profile = function (req, res) {
	res.render('profile');
};

exports.logout = function (req, res) {
	req.logout();
	res.redirect('/');
};

exports.erase = function (req, res) {
	req.user.remove(function (err) {
		exports.logout(req, res);
	});
};


app.get('/', mw.soft.user, exports.dashboard);
app.all('/account/*', mw.hard.user);
app.get('/account/dashboard', exports.dashboard);
app.get('/account/profile', exports.profile);
app.get('/account/logout', exports.logout);
app.get('/account/erase', exports.erase);


app.io.route('ready', function (req) {
	req.io.join(req.handshake.user.id);
});

app.io.route('location', {
	get: function (req) {
		var user = req.handshake.user;

		if (user.p('coords')) {
			req.io.respond({
				lng: user.p('lng'),
				lat: user.p('lat')
			});
		} else {
			req.io.respond(null);
		}
	},
	set: function (req) {
		var user = req.handshake.user;

		user.p({
			lat: req.data.lat,
			lng: req.data.lng,
			coords: true
		});

		user.save(function (err) {
			req.io.respond({
				error: err
			});

			req.io.room(user.id).broadcast('location:set', req.data);
			req.io.broadcast('map:update', user.allProperties());
		});
	},
	unset: function (req) {
		var user = req.handshake.user;

		user.p({
			lng: 0,
			lat: 0,
			coords: false
		});

		user.save(function (err) {
			req.io.respond({
				error: err
			});

			req.io.room(user.id).broadcast('location:unset');
			req.io.broadcast('map:erase', { username: user.username });
		});
	}
});

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
				if (user.id !== req.handshake.user.id) {
					array.push(user.allProperties());
				}
			});

			req.io.respond({
				error: err,
				users: array
			});
		});
	}
});