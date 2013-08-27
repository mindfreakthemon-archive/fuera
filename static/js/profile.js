jQuery(function ($) {
	var map = window.map = new google.maps.Map(document.getElementById("map-profile"), {
		center: new google.maps.LatLng('79.828898', '80.8656143'),
		zoom: 8,
		streetViewControl: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	map.user = null;
	map.home = null;
	map.markers = [];
	map.user_markers = {};

	navigator.geolocation.getCurrentPosition(function (position) {
		map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
	}, function (error) {
		console.info(function (error) {
			switch (error.code) {
				case error.PERMISSION_DENIED:
					return "User denied the request for Geolocation.";
				case error.POSITION_UNAVAILABLE:
					return "Location information is unavailable.";
				case error.TIMEOUT:
					return "The request to get user location timed out.";
				case error.UNKNOWN_ERROR:
					return "An unknown error occurred.";
				default:
					return "LOL!";
			}
		} (error));
	});
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
});

jQuery(function ($) {
	var $body = $(document.body),
		map = window.map,
		socket = window.socket;

	$("#location-search")
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

	function mark(self, type) {
		var $self = $(self).closest('.form-group');

		$self
			.removeClass('has-error has-success')
			.addClass(type);

		setTimeout(function () {
			$self.removeClass(type);
		}, 3000);
	}

	$("#first-name, #type")
		.on('change', function () {
			if (this.checkValidity()) {
				var kwargs = {},
					self = this;
				kwargs[this.name] = this.value;

				socket.emit('profile:save', kwargs, function (data) {
					mark(self, 'has-success');
				});
			}
		})
		.on('invalid', function () {
			mark(this, 'has-error');
		});


	var $images = $("#images"),
		$selfie = $("#selfie").children('img:first');

	$images
		.on('click', 'a[data-id]', function (e) {
			var $this = $(this),
				id = $this.data('id'),
				extension = $this.data('extension');

			socket.emit('profile:save', { selfie: id + ':' + extension  }, function () {
				$images.modal('hide');
				$selfie.attr('src', 'http://i.imgur.com/' + id + 't.' + extension);
			});
		});
});