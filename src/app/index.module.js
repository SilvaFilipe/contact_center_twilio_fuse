(function ()
{
    'use strict';

    /**
     * Main module of the Fuse
     */
    angular
        .module('fuse', [

            // Core
            'app.core',

            // Navigation
            'app.navigation',

            // Toolbar
            'app.toolbar',

            // Quick Panel
            'app.quick-panel',
            // Left Panel
            'app.left-quick-panel',

            // callcenter Application
            'app.callcenterApplication',
            // Auth
            'app.auth'

        ]);
})();
