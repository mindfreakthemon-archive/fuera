jQuery(function () {
	var socket = window.socket = io.connect(location.protocol + '//' + location.host + '/'),
		user = window.user;

	socket.on('connect', function() {
		console.log('launched connect')
		socket.emit('ready');
	});

	socket.on('profile:change', function (data) {
		data.changes.forEach(function (key) {
			user[key] = data.profile[key];
		});
	});
});