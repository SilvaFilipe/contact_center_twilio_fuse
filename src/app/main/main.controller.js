(function ()
{
    'use strict';

    angular
        .module('fuse')
        .controller('MainController', MainController);

    /** @ngInject */
    function MainController($scope, $rootScope)
    {
        // Data

        //////////

        // Remove the splash screen
        $scope.$on('$viewContentAnimationEnded', function (event)
        {
            if ( event.targetScope.$id === $scope.$id )
            {
                $rootScope.$broadcast('msSplashScreen::remove');
            }
        });

<<<<<<< bd9ef2d73fde7f7ce0fdcde59f84761ce9f103bf
=======
        msNavigationService.saveItem('admin', {
          title : 'Admin',
          group : true,
          hidden: function ()
          {
            return !authService.userIsAdmin(); // must be a boolean value
          },
          weight: 1
        });

        msNavigationService.saveItem('admin.users', {
          title    : 'Users',
          icon     : 'icon-account-multiple',
          state    : 'app.admin.users'
        });

        msNavigationService.saveItem('admin.groups', {
          title    : 'Groups',
          icon     : 'icon-account-multiple',
          state    : 'app.admin.groups'
        });
>>>>>>> groups add routes templates nav
    }
})();
