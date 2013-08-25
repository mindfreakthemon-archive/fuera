var roles = require('connect-roles');

//moderator users can access private page, but
//they might not be the only one so we don't return
//false if the user isn't a moderator
//roles.use('access private page', function (req) {
//	if (req.user.role === 'moderator') {
//		return true;
//	}
//});

//admin users can access all pages
//roles.use(function (req) {
//	if (req.user.role === 'admin') {
//		return true;
//	}
//});

//optionally controll the access denid page displayed
//roles.setFailureHandler(function (req, res, action){
//	var accept = req.headers.accept || '';
//	res.status(403);
//	if (~accept.indexOf('html')) {
//		res.render('access-denied', {action: action});
//	} else {
//		res.send('Access Denied - You don\'t have permission to: ' + action);
//	}
//});