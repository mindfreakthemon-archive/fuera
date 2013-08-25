var nohm = require('nohm').Nohm,
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
		}
	},
	methods: {}
});

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
	}
});