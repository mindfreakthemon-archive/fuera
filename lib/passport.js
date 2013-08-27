var passport = require('passport'),
	nconf = require('nconf'),
	nohm = require('nohm').Nohm,
	models = nohm.getModels();

var User = models.User,
	ProviderUser = models.ProviderUser;

passport.serializeUser(function (user, done) {
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	var user = User.load(id, function (err) {
		done(err, user);
	});
});

var ImgurStrategy = require('passport-imgur').Strategy;
passport.use('imgur', new ImgurStrategy(nconf.get('passport:imgur'),
	function (req, accessToken, refreshToken, profile, done) {
		ProviderUser.findAndLoad({
			account: profile.id,
			name: profile.provider
		}, function (err, array) {
			var providerUser,
				user;

			var createUserLinked = function (providerUser) {
				if (req.user.isAuthenticated) {
					user = req.user;
				} else {
					user = new User();
					user.p('username', profile.url);
				}

				user.link(providerUser);
				user.save(function (err) {
					done(err, user);
				});
			};

			switch (array.length) {
				case 1: // parse provider user and get User somehow
					providerUser = array[0];

					providerUser.p({
						accessToken: accessToken,
						refreshToken: refreshToken
					});

					providerUser.getAll('User', 'defaultForeign', function (err, array) {
						switch (array.length) {
							case 0:
								createUserLinked(providerUser);
								break;
							case 1:
								user = User.load(array[0], function (err) {
									done(err, user);
								});
								break;
							default:
								done('ProviderUser is linked to more than one user');
						}
					});

					break;
				case 0: // create user and it's provider user
					providerUser = new ProviderUser();

					providerUser.p({
						name: profile.provider,
						accessToken: accessToken,
						refreshToken: refreshToken,
						account: profile.id.toString()
					});

					providerUser.save(function (err) {
						createUserLinked(providerUser);
					});
					break;
				default:
					done('ProviderUser returned more than 1 instance');
			}
		});
	}
));