(function ()
{
    'use strict';

    angular
        .module('fuse')
        .controller('MainController', MainController);

    /** @ngInject */
    function MainController($scope, $rootScope, msNavigationService,  authService)
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
    }
})();
