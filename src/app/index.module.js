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

            // Sample

            //callcenter Application
            'app.callcenterApplication',
            //login
            'app.pages.auth.login',
            // Register
            'app.pages.auth.register'
        ]);
})();
