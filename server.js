require('./lib/settings');
require('./lib/app');
require('./lib/roles');
require('./lib/models')(function () {
	require('./lib/passport');
	require('./routes');
});

