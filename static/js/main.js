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