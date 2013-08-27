var nohm = require('nohm').Nohm,
	nconf = require('nconf'),
	request = require('request'),
	redis = require('./pool').redis;

module.exports = function (callback) {
	redis.acquire(function (err, client) {
		nohm.setClient(client);
		callback(client);
	});
};

nohm.model('User', {
	properties: {
		username: {
			type: 'string',
			unique: true,
			validations: ['notEmpty']
		},
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
		email: {
			type: 'string',
			unique: true,
			validations: [
				['email', { optional: true }],
				['length', { max: 40 }]
			]
		},
		first_name: {
			type: 'string',
			validations: [
				['length', { max: 20 }]
			]
		},
		selfie: {
			type: 'string',
			validations: [
				['length', { max: 10 }]
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
		}
	},
	methods: {
		selfie: function () {
			var data = this.p('selfie');

			if (data) {
				return 'http://i.imgur.com/' + data.split(':').join('t.');
			}

			return '';
		},
		values: function () {
			var object = this.allProperties();

			object.selfie = this.selfie();
			return object;
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
				if (error) {
					callback(error);
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
