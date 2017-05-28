(function ()
{
  'use strict';

  angular
    .module('app.profile', [])
    .config(config);

  /** @ngInject */
  function config($stateProvider, msApiProvider, msNavigationServiceProvider)
  {
    // State
    $stateProvider
      .state('app.profile', {
        url    : '/profile',
        views  : {
          'content@app': {
            templateUrl: 'app/main/profile/profile.html',
            controller : 'userProfileController as vm'
          }
        },
        bodyClass: 'profile'
      });

    msNavigationServiceProvider.saveItem('fuse.profile', {
      title    : 'Profile',
      icon     : 'icon-cog',
      state    : 'app.profile',
      weight   : 2
    });
  }
})();
