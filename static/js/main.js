var KILOMETERS_IN_MILES = 1.60934;

function circleToBounds(latLng, radius) {
	// radius in meters
	return new google.maps.Circle({center: latLng, radius: radius}).getBounds();
}

// returns in kilometers
function distance(X, Y) {
	// Earth radius
	var R = 6371;

	var radian = Math.PI / 180;

	var dLat = (Y.lat() - X.lat()) * radian / 2,
		dLon = (Y.lng() - X.lng()) * radian / 2;

	var a = Math.sin(dLat) * Math.sin(dLat) +
		Math.cos(X.lat() * radian) * Math.cos(Y.lat() * radian) *
			Math.sin(dLon) * Math.sin(dLon);

	// distance in R units
	return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
}

function locaitonTypeahead($input, map) {
	$input
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
}

jQuery(function ($) {
	var $body = $(document.body);

	$body.on('click', 'button.btn[data-href]', function (e) {
		location.pathname = $(this).data('href');
	});

	$body.find('select[data-value]').each(function () {
		var $this = $(this);

		$this.val($this.data('value'));
	});
});