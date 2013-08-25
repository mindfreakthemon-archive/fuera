exports.soft = {
	anon: function (req, res, next) {
		next(req.user.isAuthenticated ? 'route' : null);
	},
	user: function (req, res, next) {
		next(req.user.isAuthenticated ? null : 'route');
	}
};

exports.hard = {
	anon: function (req, res, next) {
		next(req.user.isAuthenticated ? new Error('Access denied') : null);
	},
	user: function (req, res, next) {
		next(req.user.isAuthenticated ? null : new Error('Access denied'));
	}
};