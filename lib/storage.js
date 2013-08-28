var session = require('express.io').session,
	nconf = require('nconf'),
	redis = require('redis');

function Storage(options) {
	var self = this;

	options = options || {};
	session.Store.call(this, options);

	this.prefix = options.prefix || 'sess:';
	this.ttl = options.ttl;

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

		console.log('Session storage has connected to redis.');

		self.client = client;

		client.on('error', function () {
			self.emit('disconnect');
		});

		// already connected
		self.emit('connect');
	});

	client.on('end', function () {
		console.log('Session storage has discconected from redis.');
	});
}

Storage.prototype.__proto__ = session.Store.prototype;

Storage.prototype.get = function (sid, fn) {
	this.client.get(this.prefix + sid, function (err, data) {
		if (err) {
			return fn(err);
		}

		if (!data) {
			return fn();
		}

		data = data.toString();

		try {
			return fn(null, JSON.parse(data));
		} catch (err) {
			return fn(err);
		}
	});
};

Storage.prototype.set = function (sid, sess, fn) {
	try {
		var maxAge = sess.cookie.maxAge,
			ttl = this.ttl;

		sess = JSON.stringify(sess);
		ttl = ttl || (typeof maxAge === 'number' ? maxAge / 1000 | 0 : 86400);

		this.client.setex(this.prefix + sid, ttl, sess, function (err) {
			fn && fn.apply(this, arguments);
		});
	} catch (err) {
		fn && fn(err);
	}
};

Storage.prototype.destroy = function (sid, fn) {
	this.client.del(this.prefix + sid, fn);
};

module.exports = new Storage(nconf.get('storage'));