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

            // 3rd party
            'cl.paging',

            // Quick Panel
            'app.quick-panel',
            // Left Panel
            'app.left-quick-panel',

            // callcenter Application
            'app.callcenterApplication',

            'app.services',
            'app.filters',

            'app.directives',
            'app.components',
            // Auth
            'app.auth',
            'app.config',
            'app.admin',
            'app.profile',
            'datatables',
            'ngAvatar'

        ]);
})();
