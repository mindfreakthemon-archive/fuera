var mw = require('../lib/middlewares'),
	request = require('request'),
	app = require('../lib/app');


exports.index = function (req, res) {
	res.render('index',{ title: 'Fuera' });
};

exports.privacy = function (req, res) {
	res.render('privacy', { title: 'Fuera - Privacy policy' });
};

exports.terms = function (req, res) {
	res.render('terms', { title: 'Fuera - Terms and conditions' });
};

exports.feedback = function (req, res) {
	res.render('feedback', { title: 'Leave a feedback', success: req.param('success') });
};

exports.feedback_message = function (req, res) {
	var subject = ('' + req.param('subject')).trim(),
		body = ('' + req.param('body')).trim();

	function respond(error) {
		res.redirect('/feedback/?success=' + (error ? 'error&error=' + error : 'ok'));
	}

	if (!subject || !body) {
		respond('empty');
		return;
	}

	req.user.providers(function (error, providerUsers) {
		providerUsers.forEach(function (providerUser) {
			if (providerUser.p('name') !== 'imgur') {
				return;
			}

			req.clearTimeout();

			providerUser.refreshAccessToken(function (error) {
				if (error) {
					respond(error);
					return;
				}

				request.post({
					url: 'https://api.imgur.com/3/message',
					headers: {
						'Authorization': 'Bearer ' + providerUser.p('accessToken')
					},
					form: {
						recipient: 'mindfreakthemon',
						subject: subject,
						body: body
					},
					timeout: 10000,
					json: true
				}, respond);
			});
		});
	});


};

app.get('/', mw.soft.anon, exports.index);
app.get('/privacy', exports.privacy);
app.get('/terms', exports.terms);
app.get('/feedback', exports.feedback);
app.post('/feedback', exports.feedback_message);