jQuery(function ($) {
	var map = window.map = new google.maps.Map(document.getElementById("map-canvas"), {
		center: new google.maps.LatLng('79.828898', '80.8656143'),
		zoom: 8,
		streetViewControl: false,
		minZoom: 6,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	map.user = null;
	map.home = null;
	map.markers = [];
	map.user_markers = {};

//	navigator.geolocation.getCurrentPosition(function (position) {
//		map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
//	}, function (error) {
//		console.info(function (error) {
//			switch (error.code) {
//				case error.PERMISSION_DENIED:
//					return "User denied the request for Geolocation.";
//				case error.POSITION_UNAVAILABLE:
//					return "Location information is unavailable.";
//				case error.TIMEOUT:
//					return "The request to get user location timed out.";
//				case error.UNKNOWN_ERROR:
//					return "An unknown error occurred.";
//				default:
//					return "LOL!";
//			}
//		} (error));
//	});
});

function unsetHomeMarker() {
	if (map.home) {
		map.home.setMap(null);
	}
}

function replaceHomeMarker() {
	var map = window.map,
		location = new google.maps.LatLng(map.user.lat, map.user.lng);

	unsetHomeMarker();

	map.home = new google.maps.Marker({
		position: location,
		map: map,
		icon: '/static/img/home.png'
	});
}

function clearUserMarkers() {
	var map = window.map;

	map.markers.forEach(function (marker) {
		marker.setMap(null);
	});

	map.markers = [];
	map.user_markers = {};
}

function eraseUserMarker(user) {
	var map = window.map;

	if (user.username in map.user_markers) {
		var old_marker = map.user_markers[user.username];

		map.markers.splice(map.markers.indexOf(old_marker), 1);
		delete map.user_markers[user.username];

		old_marker.setMap(null);
	}
}

function addUserMarker(user) {
	eraseUserMarker(user);

	var map = window.map,
		location = new google.maps.LatLng(user.lat, user.lng);

	var marker = new google.maps.Marker({
		position: location,
		map: map,
		icon: '/static/img/male.png',
		title: user.username
	});

	var infoWindow = new google.maps.InfoWindow({
		content: '<h4>' + user.username + '</h4>' +
			'<p><a href="http://imgur.com/user/' + user.username + '">Gallery profile</a></p>'
	});

	google.maps.event.addListener(marker, 'click', function() {
		infoWindow.open(map, marker);
	});

	map.markers.push(marker);
	map.user_markers[user.username] = marker;
}

jQuery(function ($) {
	var socket = window.socket = io.connect(location.protocol + '//' + location.host + '/'),
		map = window.map;

	socket.emit('ready');

	// get stored location
	socket.emit('location:get', {}, function (data) {
		if (data) {
			map.user = data;
			replaceHomeMarker();

			map.setCenter(new google.maps.LatLng(map.user.lat, map.user.lng));
		}
	});

	// listen on change
	socket.on('location:set', function (data) {
		map.user = data;
		replaceHomeMarker();
	});

	// listen on unset
	socket.on('location:unset', function () {
		map.user = null;
		unsetHomeMarker();
	});

	// someone changed something
	socket.on('map:update', function (user) {
		var mapBounds = map.getBounds(),
			location = new google.maps.LatLng(user.lat, user.lng);

		if (mapBounds.contains(location)) {
			addUserMarker(user);
		}
	});

	socket.on('map:erase', function (user) {
		eraseUserMarker(user);
	});
});

jQuery(function ($) {
	var $body = $(document.body),
		map = window.map,
		socket = window.socket;

	$body.on('click', '[data-map="set-center"]', function () {
		var $this = $(this);
		map.setCenter($this.data('lat'))
	});

	$("#geodecode")
		.typeahead({
			name: 'address',
			remote: {
				url: 'http://maps.googleapis.com/maps/api/geocode/json?address=%QUERY&sensor=false',
				filter: function (response) {
					if (response.status !== 'OK') {
						return [];
					}

					var datums = [];

					response.results.forEach(function (item) {
						datums.push({
							value: item.formatted_address,
							item: item,
							tokens: item.address_components.map(function (component) {
								return component.long_name;
							})
						});
					});


					return datums;
				}
			}
		})
		.on('typeahead:selected', function (e, datum, name) {
			var geometry = datum.item.geometry,
				location = geometry.location;

			map.setCenter(new google.maps.LatLng(location.lat, location.lng));

			switch (geometry.location_type) {
				case 'ROOFTOP':
					map.setZoom(18);
					break;
				case 'APPROXIMATE':
					map.setZoom(8);
					break;
			}
		});

	google.maps.event.addListener(map, 'click', function (event) {
		var location = event.latLng;

		map.user = {
			lat: location.lat(),
			lng: location.lng()
		};
		replaceHomeMarker();

		socket.emit('location:set', map.user);
	});

	$("#unset-location").on('click', function () {
		unsetHomeMarker();

		socket.emit('location:unset');
	});

	function boundsChanged() {
		var mapBounds = map.getBounds(),
			ne = mapBounds.getNorthEast(),
			se = mapBounds.getSouthWest();

		socket.emit('map:find', {
			lat_lo: se.lat(),
			lng_lo: se.lng(),
			lat_hi: ne.lat(),
			lng_hi: ne.lng()
		}, function (data) {
			clearUserMarkers();

			data.users.forEach(addUserMarker);
		});
	}

	var boundsChangedTimeout = null;
	google.maps.event.addListener(map, 'bounds_changed', function () {
		clearTimeout(boundsChangedTimeout);

		boundsChangedTimeout = setTimeout(boundsChanged, 1000);
	});
});