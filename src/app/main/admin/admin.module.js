(function ()
{
    'use strict';

    angular
        .module('app.admin', [])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.admin', {
                abstract: true,
                url: '/admin'
            })
            .state('app.admin.users', {
              url      : '/users',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/users/admin.users.html',
                  controller : 'AdminUsersController as vm'
                }
              }
            });

        // Navigation
        msNavigationServiceProvider.saveItem('fuse.admin', {
          title : 'Admin',
          icon  : 'icon-account-multiple',
          weight: 3
        });

        msNavigationServiceProvider.saveItem('fuse.admin.users', {
          title: 'Users',
          state: 'app.admin.users'
        });
    }
})();
