jQuery(function ($) {
	var map = window.map = new google.maps.Map(document.getElementById("map-profile"), {
		center: new google.maps.LatLng('79.828898', '80.8656143'),
		zoom: 8,
		streetViewControl: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	map.home = null;

	if (window.user.coords) {
		replaceHomeMarker(true);
	} else {
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
	}
});

function unsetHomeMarker() {
	if (map.home) {
		map.home.setMap(null);
		map.home = null;
	}
}

function replaceHomeMarker(center) {
	var map = window.map,
		loc = new google.maps.LatLng(window.user.lat, window.user.lng);

	unsetHomeMarker();

	var marker = map.home = new google.maps.Marker({
		position: loc,
		map: map,
		icon: '/static/img/home.png',
		title: 'To unset, click on marker'
	});

	google.maps.event.addListener(marker, 'click', function() {
		unsetHomeMarker();
	});

	if (center) {
		map.setCenter(loc);
	}
}

jQuery(function ($) {
	var $body = $(document.body),
		map = window.map,
		socket = window.socket;

	// Listen on location change
	socket.on('location:change', function () {
		if (window.user.coords) {
			replaceHomeMarker();
		} else {
			unsetHomeMarker();
		}
	});

	// Home marker selector
	locaitonTypeahead($("#location-search"), map);

	google.maps.event.addListener(map, 'click', function (event) {
		var location = event.latLng,
			changes = {
				coords: true,
				lat: location.lat(),
				lng: location.lng()
			};

		// external save
		socket.emit('profile:save', changes);
	});

	$body.on('click', '[data-api=unset-location]', function () {
		socket.emit('profile:save', {
			coords: false,
			lat: 0,
			lng: 0
		});
	});

	// Badges
	var $badges = $("#badges"),
		tagsApi = $badges.tagsManager({
			prefilled: $badges.val().split(','),
			onlyTagList: true
		});

	$badges.data('lhiddenTagList').addClass('changeable');

	// Profile & Settings stuff
	function mark(self, type) {
		var $self = $(self).closest('.form-group');

		$self
			.removeClass('has-error has-success')
			.addClass(type);

		setTimeout(function () {
			$self.removeClass(type);
		}, 3000);
	}

	$(".changeable")
		.on('change', function () {
			if (this.checkValidity()) {
				var kwargs = {},
					self = this;
				kwargs[this.name] = this.value;

				// external save
				socket.emit('profile:save', kwargs, function (data) {
					mark(self, 'has-success');
				});
			}
		})
		.on('invalid', function () {
			mark(this, 'has-error');
		});


	// Selfie selector
	var $images = $("#images"),
		$selfie = $("#selfie").children('img:first');

	$images
		.on('click', 'a[data-id]', function () {
			var $this = $(this),
				id = $this.data('id'),
				extension = $this.data('extension'),
				changes = {
					selfie: id + ':' + extension
				};

			// external save
			socket.emit('profile:save', changes, function () {
				$images.modal('hide');
				$selfie.attr('src', 'http://i.imgur.com/' + id + 's.' + extension);
			});
		});
});