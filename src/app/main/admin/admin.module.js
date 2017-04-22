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
            })
            .state('app.admin.users.edit', {
              url      : '/:id',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/users/user/user.html',
                  controller : 'AdminUserController as vm'
                }
              },
              resolve  : {
                User: function ($stateParams, AdminUserService)
                {
                  return AdminUserService.getUser($stateParams.id);
                }
              }
            })
            .state('app.admin.users.add', {
              url      : '/add',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/users/user/user.html',
                  controller : 'AdminUserController as vm'
                }
              },
              resolve  : {
                User: function ($stateParams, AdminUserService)
                {
                  return AdminUserService.newUser();
                }
              }
            });

    }
})();
