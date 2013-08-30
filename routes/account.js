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
	req.user.providers(function (error, providerUsers) {
		providerUsers.forEach(function (providerUser) {
			if (providerUser.p('name') !== 'imgur') {
				return;
			}

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
		});
	});
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
			req.io.broadcast('map:update', user.values());
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


app.io.route('profile', {
	save: function (req) {
		var user = req.handshake.user;

		user.p(req.data);

		user.save(function (err) {
			req.io.respond({
				error: err
			});
			req.io.broadcast('map:update', user.values());
		});
	}
});