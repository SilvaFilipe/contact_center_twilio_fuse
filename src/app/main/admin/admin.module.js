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
                  templateUrl: 'app/main/admin/users/admin.users.list.html',
                  controller : 'AdminUsersController as vm'
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
                User: function (AdminUserService)
                {
                  return AdminUserService.newUser();
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

            //Groups

            .state('app.admin.groups', {
              url      : '/groups',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/groups/admin.groups.html',
                  controller : 'AdminGroupsController as vm'
                }
              }
            })
            .state('app.admin.groups.add', {
              url      : '/add',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/groups/group/group.html',
                  controller : 'AdminGroupController as vm'
                }
              },
              resolve  : {
                Group: function () {
                  return {users: []};
                }
              }
            })
            .state('app.admin.groups.edit', {
              url      : '/:id',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/groups/group/group.html',
                  controller : 'AdminGroupController as vm'
                }
              },
              resolve  : {
                Group: function ($stateParams, GroupService) {
                  return GroupService.getGroup($stateParams.id);
                }
              }
            })

            //Queues

            .state('app.admin.queues', {
              url      : '/queues',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/queues/admin.queues.html',
                  controller : 'AdminQueuesController as vm'
                }
              }
            })
            .state('app.admin.queues.add', {
              url      : '/add',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/queues/queue/queue.html',
                  controller : 'AdminQueueController as vm'
                }
              },
              resolve  : {
                Queue: function () {
                  return {users:[]};
                }
              }
            })

            .state('app.admin.queues.edit', {
              url      : '/:id',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/queues/queue/queue.html',
                  controller : 'AdminQueueController as vm'
                }
              },
              resolve  : {
                Queue: function ($stateParams, QueueService) {
                  return QueueService.getQueue($stateParams.id);
                }
              }
            })


            //Dids

            .state('app.admin.dids', {
              url      : '/dids',
              views    : {
                'content@app': {
                  templateUrl: 'app/main/admin/dids/admin.dids.html',
                  controller : 'AdminDidsController as vm'
                }
              }
            });

        msNavigationServiceProvider.saveItem('admin', {
          title : 'Admin',
          group : true,
          hidden: function ()
          {
            return !authService.userIsAdmin(); // must be a boolean value
          },
          weight: 1
        });

        msNavigationServiceProvider.saveItem('admin.users', {
          title    : 'Users',
          icon     : 'icon-account',
          state    : 'app.admin.users'
        });

        msNavigationServiceProvider.saveItem('admin.groups', {
          title    : 'Groups',
          icon     : 'icon-account-multiple',
          state    : 'app.admin.groups'
        });

        msNavigationServiceProvider.saveItem('admin.queues', {
          title    : 'Queues',
          icon     : 'icon-layers',
          state    : 'app.admin.queues'
        });

        msNavigationServiceProvider.saveItem('admin.dids', {
          title    : 'Dids',
          icon     : 'icon-cellphone',
          state    : 'app.admin.dids'
        });

    }
})();
