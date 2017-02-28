(function ()
{
    'use strict';

    angular
        .module('fuse')
        .run(runBlock);

    /** @ngInject */
    function runBlock($rootScope, $timeout, $state, authService) {

      window.authService = authService;
      // Activate loading indicator
      var stateChangeStartEvent = $rootScope.$on('$stateChangeStart', function (e, toState) {
        $rootScope.loadingProgress = true;
        var isLogin = (toState.name === 'app.auth_login') || (toState.name === 'app.auth_register');
        if (isLogin) {
          return;
        }

        if(!authService.isLoggedIn()) {
          e.preventDefault(); // stop current execution
          $state.go('app.auth_login'); // go to login
        }

      });

      // De-activate loading indicator
      var stateChangeSuccessEvent = $rootScope.$on('$stateChangeSuccess', function () {
        $timeout(function () {
          $rootScope.loadingProgress = false;
        });
      });

      // Store state in the root scope for easy access
      $rootScope.state = $state;

      // Cleanup
      $rootScope.$on('$destroy', function () {
        stateChangeStartEvent();
        stateChangeSuccessEvent();
      });

      $rootScope.setCurrentUser = function (user) {
        $rootScope.currentUser = user;
      };

      $rootScope.syncClient = null;

    }
})();
