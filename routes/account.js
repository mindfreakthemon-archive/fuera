var mw = require('../lib/middlewares.js'),
	app = require('../lib/app'),
	nohm = require('nohm').Nohm,
	request = require('request'),
	models = nohm.getModels();

exports.profile = function (req, res) {
	res.render('profile', { title: 'Fuera - Profile' });
};

exports.logout = function (req, res) {
	req.logout();
	res.redirect('/');
};

exports.erase = function (req, res) {
	exports.logout(req, res);
	req.user.remove();
};

exports.user = function (req, res, next) {
	var username = req.param('username') || req.user.p('username');

	models.User.findAndLoad({
		username: username
	}, function (error, users) {
		if (error == 'not found') {
			next();
			return;
		}

		res.render('user', { person: users[0], title: 'Fuera - ' + username });
	});
};

exports.selfie = function (req, res) {
	req.user.providers(function (error, providerUser) {
		function respond(error, response, body) {
			var images = [];

			if (!error) {
				body.data.forEach(function (val) {
					if (val.nsfw) {
						return;
					}

					var thumb = val.link.split('.');
					thumb[thumb.length - 2] += 's';
					val.extension = thumb[thumb.length - 1];
					val.thumb = thumb.join('.');

					images.push(val);
				});
			}

			res.render('selfie', { images: images, error: error });
		}

		req.clearTimeout();

		providerUser.refreshAccessToken(function (error) {
			if (error) {
				respond(error);
				return;
			}

			request.get({
				url: 'https://api.imgur.com/3/account/me/images/',
				headers: {
					'Authorization': 'Bearer ' + providerUser.p('accessToken')
				},
				timeout: 10000,
				json: true
			}, respond);
		});
	}, 'imgur');
};

app.all('/account/*', mw.hard.user);
app.get('/account/user/:username?', exports.user);
app.get('/account/profile', exports.profile);
app.get('/account/selfie', exports.selfie);
app.get('/account/logout', exports.logout);
app.get('/account/erase', exports.erase);

app.io.route('ready', function (req) {
	req.io.join(req.handshake.user.id);
});

app.io.route('profile', {
	save: function (req) {
		var user = req.handshake.user,
			changes = Object.keys(req.data);

		user.p(req.data);

		// handle notify changes
		if (~changes.indexOf('lat') ||
			~changes.indexOf('lng') ||
			~changes.indexOf('coords') ||
			~changes.indexOf('notify_radius')) {
			var R = 6371,
				notify_update = {},
				degree = (user.p('notify_radius') / R) * (180 / Math.PI);

			notify_update.notify_lat_hi = user.p('lat') + degree;
			notify_update.notify_lat_lo = user.p('lat') - degree;

			notify_update.notify_lng_hi = user.p('lng') + degree;
			notify_update.notify_lng_lo = user.p('lng') - degree;

			user.p(notify_update);
		}

		user.save(function (err) {
			var profile = user.values();

			req.io.broadcast('map:update', profile);
			app.io.room(user.id).broadcast('profile:change', {
				profile: profile,
				changes: changes
			});

			// send signal to other windows
			if (~changes.indexOf('lat') ||
				~changes.indexOf('lng') ||
				~changes.indexOf('coords')) {
				app.io.room(user.id).broadcast('location:change');
			}

			req.io.respond({
				error: err
			});
		});
	}
});