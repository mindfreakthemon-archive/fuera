jQuery(function () {
	var socket = window.socket = io.connect(location.protocol + '//' + location.host + '/'),
		user = window.user;

	socket.emit('ready');

	socket.on('user:change', function (data) {
		for (var key in data) {
			user[key] = data[key];
		}
	});
});