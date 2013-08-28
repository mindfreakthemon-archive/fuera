var genericPool = require('generic-pool'),
	nconf = require('nconf'),
	redis = require('redis');

//noinspection JSValidateTypes
exports.redis = genericPool.Pool({
	name: 'redis',
	create: function (callback) {
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

			console.log('Connected to redis.');

			callback(null, client);
		});

		client.on('end', function () {
			console.log('Disconnected from redis.');
		});
	},
	destroy: function (client) {
		client.quit();
	},
	max: 50,
	log: false
});