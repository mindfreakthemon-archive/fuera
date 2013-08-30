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

function eraseUserMarker(user_id) {
	var map = window.map;

	if (user_id in map.user_markers) {
		var old_marker = map.user_markers[user_id];

		map.markers.splice(map.markers.indexOf(old_marker), 1);
		delete map.user_markers[user_id];

		old_marker.setMap(null);
	}
}

function addUserMarker(user) {
	eraseUserMarker(user.id);

	var map = window.map,
		location = new google.maps.LatLng(user.lat, user.lng);

	var marker = new google.maps.Marker({
		position: location,
		map: map,
		icon: '/static/img/' + (user.id == window.user.id ? 'home' : user.type) + '.png',
		title: formatMarkerTitle(user, location)
	});

	var infoWindow = new google.maps.InfoWindow({
		content: '<div class="text-center" style="padding: 5px;">' +
			(user.selfie ?
			'<a href="/account/user/' + user.username + '">' +
			'<img class="img-thumbnail" src="' + user.selfie + '/">' +
			'</a>' : '') +

			'<a href="/account/user/' + user.username + '/">' +
			'<h4>' + user.username + '</h4>' +
			'</a>' +
			'</div>'
	});

	google.maps.event.addListener(marker, 'click', function() {
		infoWindow.open(map, marker);
	});

	map.markers.push(marker);
	map.user_markers[user.id] = marker;
}

function formatMarkerTitle(user, location) {
	var current_user_location = new google.maps.LatLng(window.user.lat, window.user.lng);

	return user.username +
		(window.user.id === user.id ?
			' (you)' :
			', ' + Math.round(distance(location, current_user_location)) +
			(window.user.unit_sys == 'METRIC' ? ' km' : ' mi') +
			' away from you');
}

function distance(X, Y) {
	// Earth radius
	var Rkm = 6371,
		Rmi = 3958.76,
		R = window.user.unit_sys == 'METRIC' ? Rkm : Rmi;

	var radian = Math.PI / 180;

	var dLat = (Y.lat() - X.lat()) * radian / 2,
		dLon = (Y.lng() - X.lng()) * radian / 2;

	var a = Math.sin(dLat) * Math.sin(dLat) +
		Math.cos(X.lat() * radian) * Math.cos(Y.lat() * radian) *
			Math.sin(dLon) * Math.sin(dLon);

	// distance in R units
	return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
}

jQuery(function () {
	var socket = window.socket,
		map = window.map;

	// someone changed something
	socket.on('map:update', function (user) {
		var mapBounds = map.getBounds(),
			location = new google.maps.LatLng(user.lat, user.lng);

		if (mapBounds.contains(location)) {
			addUserMarker(user);
		}
	});

	// someone has unset his/her location
	socket.on('map:erase', function (user) {
		eraseUserMarker(user.id);
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
			var ids = Object.keys(map.user_markers);

			data.users.forEach(function (user) {
				// if it's not on the map already
				if (!(user.id in map.user_markers)) {
					// add marker
					addUserMarker(user);
				}

				// remove from ids
				ids.splice(ids.indexOf(user.id), 1);
			});

			// erase the rest
			ids.forEach(eraseUserMarker);
		});
	}

	var boundsChangedTimeout = null;
	google.maps.event.addListener(map, 'bounds_changed', function () {
		clearTimeout(boundsChangedTimeout);

		boundsChangedTimeout = setTimeout(boundsChanged, 1000);
	});
});
