var nohm = require('nohm').Nohm,
	nconf = require('nconf'),
	request = require('request'),
	redis = require('redis'),
	async = require('async-mini');


// @TODO get rid of nohm
module.exports = function (callback) {
	// connecting to redis
	var client = redis.createClient(nconf.get('redis:port'), nconf.get('redis:hostname')),
		db = nconf.get('redis:db'),
		auth = nconf.get('redis:auth');

	if (auth) {
		client.auth(auth);
	}

	client.on('connect', function () {
		if (db) {
			client.select(db);
		}

		console.log('Nohm has connected to redis.');

		nohm.setClient(client);
		callback(client);
	});

	client.on('end', function () {
		console.log('Nohm has discconected from redis.');
	});
};

nohm.model('User', {
	properties: {
		username: {
			type: 'string',
			unique: true,
			validations: ['notEmpty']
		},

		// LOCATION
		// if the coords are non-nullable
		// (can't check it with nohm)
		coords: {
			type: 'boolean',
			defaultValue: false
		},
		lng: {
			type: 'float',
			index: true
		},
		lat: {
			type: 'float',
			index: true
		},

		// PROFILE
		first_name: {
			type: 'string',
			validations: [
				['length', { max: 20 }]
			]
		},
		selfie: {
			type: 'string',
			validations: [
				['length', { max: 20 }]
			]
		},
		type: {
			type: 'string',
			defaultValue: 'unknown',
			validations: [
				function (value, options, callback) {
					callback(~['unknown', 'guy', 'gal'].indexOf(value));
				}
			]
		},
		useless: {
			type: 'string',
			validations: [
				['length', { max: 591 }]
			]
		},

		// settings
		unit_sys: {
			type: 'string',
			defaultValue: 'METRIC',
			validations: [
				function (value, options, callback) {
					callback(~['METRIC', 'IMPERIAL'].indexOf(value));
				}
			]
		},
		notify_radius: {
			// in unit_sys Unit System
			type: 'integer',
			defaultValue: 1,
			validations: [
				['minMax', { max: 10000, min: 1 }]
			]
		}
	},
	methods: {
		type: function () {
			return {
				'unknown': 'Unknown',
				'guy': 'Boy',
				'gal': 'Girl'
			}[this.p('type')];
		},
		selfie: function () {
			var data = this.p('selfie');

			if (data) {
				return 'http://i.imgur.com/' + data.split(':').join('s.');
			}

			return '';
		},
		values: function () {
			var object = this.allProperties();

			object.selfie = this.selfie();
			object.id = this.id;
			return object;
		},
		providers: function (callback) {
			this.getAll('ProviderUser', 'default', function (error, ids) {
				if (error) {
					callback(error);
				}

				var loads = [],
					providers = [];

				ids.forEach(function (id) {
					loads.push(function (callback) {
						var providerUser = nohm.factory('ProviderUser', id, function (error) {
							providers.push(providerUser);
							callback(error);
						});
					})
				});

				async.parallel(loads, function (error) {
					callback(error, providers);
				});
			});
		}
	}
});


var providers = nconf.get('passport');

nohm.model('ProviderUser', {
	properties: {
		name: {
			type: 'string',
			validations: ['notEmpty']
		},
		accessToken: {
			type: 'string',
			validations: ['notEmpty']
		},
		refreshToken: {
			type: 'string',
			validations: ['notEmpty']
		},
		account: {
			type: 'string',
			validations: ['notEmpty'],
			index: true
		}
	},
	methods: {
		refreshAccessToken: function (callback) {
			var self = this,
				provider = providers[this.p('name')];

			request.post({
				url: provider.refreshURL,
				form: {
					refresh_token: this.p('refreshToken'),
					client_id: provider.clientID,
					client_secret: provider.clientSecret,
					grant_type: 'refresh_token'
				},
				json: true
			}, function (error, response, body) {
				console.log(arguments);
				if (error || body.success === false) {
					callback(error || body.data.error);
					return;
				}

				self.p('accessToken', body.access_token);
				self.save(function (error) {
					callback(error);
				});
			});
		}
	}
});
