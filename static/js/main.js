jQuery(function ($) {
	var $body = $(document.body);

	$body.on('click', 'button.btn[data-href]', function (e) {
		location.pathname = $(this).data('href');
	});
});