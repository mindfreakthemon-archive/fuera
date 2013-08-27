jQuery(function ($) {
	var $map = $("#map-canvas");

	var map = window.map = new google.maps.Map($map[0], {
		center: new google.maps.LatLng($map.data('lat') || '51.5121612', $map.data('lng') || '0.1208496'),
		zoom: 8,
		streetViewControl: false,
		minZoom: 4,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	map.user = null;
	map.home = null;
	map.markers = [];
	map.user_markers = {};
});

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
		icon: '/static/img/' + user.type + '.png',
		title: user.username
	});

	var infoWindow = new google.maps.InfoWindow({
		content: '<div class="media">' +
			(user.selfie ?
			'<a class="pull-left">' +
			'<img class="media-object" src="' + user.selfie + '">' +
			'</a>' : '') +
			'<div class="media-body">' +
			'<h4 class="media-heading">' +
			(user.first_name ?
				user.first_name + ' (' + user.username + ')' :
				user.username) + '</h4>' +
			'<p><a href="http://imgur.com/user/' + user.username + '" target="_blank">Imgur gallery profile</a></p>' +
			'</div>' +
			'</div>'
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
	var map = window.map,
		socket = window.socket;

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