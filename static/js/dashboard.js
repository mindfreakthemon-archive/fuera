function process_hash(shash) {
	var lhash = shash.substr(1).split(':');

	if (lhash.length > 1) {
		var res = {
			center: new google.maps.LatLng(lhash[0], lhash[1])
		};

		if (lhash[2]) {
			res.zoom = lhash[2] | 0;
		}

		return res;
	}

	return {};
}

jQuery(function ($) {
	var shash = process_hash(location.hash);

	var map = window.map = new google.maps.Map(document.getElementById('map-canvas'), {
		center: shash.center || new google.maps.LatLng(window.user.lat || '51.5121612', window.user.lng || '0.1208496'),
		zoom: shash.zoom || 8,
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
		loc = new google.maps.LatLng(user.lat, user.lng);

	var marker = new google.maps.Marker({
		position: loc,
		map: map,
		icon: '/static/img/' + (user.id == window.user.id ? 'home' : user.type) + '.png',
		title: formatMarkerTitle(user, loc)
	});

	google.maps.event.addListener(marker, 'click', function() {
		location.href = '/account/user/' + user.username;
	});

	map.markers.push(marker);
	map.user_markers[user.id] = marker;
}

function formatMarkerTitle(user, location) {
	var current_user_location = new google.maps.LatLng(window.user.lat, window.user.lng);

	if (window.user.id === user.id) {
		return user.username + ' (you)';
	}

	var d = distance(location, current_user_location),
		units = ' km';

	if (window.user.unit_sys == 'IMPERIAL') {
		d /= KILOMETERS_IN_MILES;
		units = ' mi';
	}

	return user.username + ', ' + Math.round(d) + units + ' away from you';
}

jQuery(function () {
	var socket = window.socket,
		map = window.map;

	// someone changed something
	socket.on('map:update', function (user) {
		var mapBounds = map.getBounds(),
			loc = new google.maps.LatLng(user.lat, user.lng);

		if (mapBounds.contains(loc)) {
			addUserMarker(user);
		}

		var c_user = window.user;

		if (c_user.notify_radius) {
			var notify_sw = new google.maps.LatLng(c_user.notify_lat_lo, c_user.notify_lng_lo),
				notify_ne = new google.maps.LatLng(c_user.notify_lat_hi, c_user.notify_lng_hi),
				notify_bounds = new google.maps.LatLngBounds(notify_sw, notify_ne);

				if (notify_bounds.contains(loc)) {
					var n = noty({
						layout: 'topRight',
						text: 'WOW SUCH WIN! <b>' + user.username + '</b> is in your notification radius!',
						timeout: 10000,
						buttons:  [
							{
								addClass: 'btn btn-primary',
								text: 'Find user on the map',
								onClick: function ($noty) {
									$noty.close();

									map.setCenter(loc);
								}
							}
						]
					});
				}
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

	locaitonTypeahead($("#geodecode"), map);

	var boundsChangedTimeout = null,
		firstChange = true;

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

		// save change via url
		var center = map.getCenter(),
			shash = '#' + center.lat() + ':' + center.lng() + ':' + map.getZoom();

		if (firstChange) {
			firstChange = false;

			if (location.hash.length < 2) {
				history.replaceState(null, '', location.pathname + shash);
			}

			return;
		}

		// if hash is the same nothing will change
		location.hash = shash;
	}

	google.maps.event.addListener(map, 'bounds_changed', function () {
		clearTimeout(boundsChangedTimeout);

		boundsChangedTimeout = setTimeout(boundsChanged, 1000);
	});

	$(window).on('hashchange', function () {
		var result = process_hash(location.hash);

		map.setCenter(result.center);

		if (result.zoom) {
			map.setZoom(result.zoom);
		}
	});
});
