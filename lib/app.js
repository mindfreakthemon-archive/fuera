var express = require('express.io'),
	nconf = require('nconf'),
	passport = require('passport'),
	passport_io = require('passport.socketio'),
	less = require('less-middleware'),
	roles = require('connect-roles'),
	mailer = require('express-mailer'),
	swig = require('swig'),
	consolidate = require('consolidate'),
	path = require('path'),
	redis = require('./pool').redis,
	app = module.exports = express();

app.http().io();
app.disable('x-powered-by');

// Looks like heroku doesn't like realpath
var PROJECT_DIR = '..';

// SOCKET IO CONFIG
app.io.configure(function () {
	app.io.set('transports', ['xhr-polling', 'jsonp-polling']);
	app.io.set('polling duration', 10);
	app.io.set('log level', 1);
//	app.io.enable('browser client minification');
//	app.io.enable('browser client etag');
//	app.io.enable('browser client gzip');
});

// LOCAL VARIABLES
app.locals(nconf.get('locals'));

/// REALLY COOL STUFF GOES HERE ///

// MAILER
mailer.extend(app, nconf.get('mailer'));

// SWIG
app.engine('html', consolidate.swig);
app.set('view engine', 'html');
app.set('views', path.join(PROJECT_DIR, 'views/'));
swig.init({
	root: app.get('views'),
	allowErrors: true,
	cache: false
});

/// MIDDLEWARES INITIALIZATION ///

// MISC STUFF
app.use(express.logger('dev'));
app.use(express.compress());
app.use(express.cookieParser());

// BODY PARSER
app.use(express.bodyParser({
	keepExtensions: true,
	uploadDir: path.join(PROJECT_DIR, 'upload/')
}));
//app.use(express.csrf());

// SESSION
var session = nconf.get('session');
session.store = require('./storage');
app.use(express.session(session));

app.io.set('authorization', (function () {
	// storing express.io auth
	var auth = app.io.get('authorization');

	// creating passport auth
	session.cookieParser = express.cookieParser;
	session.success = function (data, accept) {
		auth(data, accept);
	};

	return passport_io.authorize(session);
})());

// PASSPORT SESSION
app.use(passport.initialize());
app.use(passport.session());

// ROLES @TODO todo
app.use(roles);

// LESS @TODO add settings
app.use(less({
	dest: path.join(PROJECT_DIR, 'static/css/'),
	src: path.join(PROJECT_DIR, 'static/less/'),
	prefix: '/less/',
	compress: false,
	pretty: true
}));

// LOCAL ROUTING
app.use(app.router);

// DEFAULT ERROR HANDLER @TODO add custom
app.use(express.errorHandler());

// STATIC
app.use(app.locals.STATIC_URL, express.static('static'));

/// STARTING HTTP SERVER ///
app.listen(nconf.get('app:port'));
