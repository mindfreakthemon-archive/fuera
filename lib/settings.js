var nconf = require('nconf'),
	url = require('url');

nconf.use('memory');

nconf.defaults({
	store: {
		app: {
			port: process.env.PORT || 80
		},
		timeout: 10000,
		locals: {
			GOOGLE_MAPS_KEY: 'AIzaSyBAM1cJV0u_kziXIpROYIQRVtx6vmOal0Y',
			STATIC_URL: '/static/'
		},
		mailer: {
			from: 'no-reply@example.com',
			host: 'smtp.gmail.com',
			secureConnection: true,
			port: 465,
			auth: {
				user: 'gmail.user@gmail.com',
				pass: 'userpass'
			}
		},
		passport: {
			imgur: {
				clientID: null,
				clientSecret: null,
				callbackURL: null,
				refreshURL: 'https://api.imgur.com/oauth2/token',
				passReqToCallback: true
			}
		},
		session: {
			secret: null,
			key: 'session.id',
			cookie: {
				path: '/',
				httpOnly: true,
				maxAge: 1000 * 3600 * 24 * 40
			}
		},
		storage: {
			ttl: 3600 * 24 * 40,
			prefix: 'session:'
		},
		redis: {
			port: null,
			hostname: null,
			db: 0,
			auth: null
		}
	}
});

/// HEROKU SETTINGS ///

if (process.env.REDISTOGO_URL) {
	var redis2go  = url.parse(process.env.REDISTOGO_URL);

	nconf.merge({
		redis: {
			port: redis2go.port,
			hostname: redis2go.hostname,
			auth: redis2go.auth.split(':')[1]
		}
	});
}

if (process.env.IMGUR_OAUTH2) {
	var imgur2oauth = url.parse(process.env.IMGUR_OAUTH2),
		auth = imgur2oauth.auth.split(':');

	delete imgur2oauth.auth;

	nconf.merge({
		'passport:imgur': {
			clientID: auth[0],
			clientSecret: auth[1],
			callbackURL: url.format(imgur2oauth)
		}
	});
}

if (process.env.SESSION_SECRET) {
	nconf.set('session:secret', process.env.SESSION_SECRET)
}
