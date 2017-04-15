(function ()
{
    'use strict';

    angular
        .module('fuse')
        .run(runBlock);

    /** @ngInject */
    function runBlock($rootScope, $timeout, $state, authService) {

      $rootScope.$on('$stateChangeStart',function(event, toState, toParams, fromState, fromParams){
        console.log('$stateChangeStart to '+toState.name+'- fired when the transition begins. toState,toParams : \n',toState, toParams);
      });
      $rootScope.$on('$stateChangeError',function(event, toState, toParams, fromState, fromParams, error){
        console.log('$stateChangeError - fired when an error occurs during transition.');
        console.log(arguments);
      });
      $rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
        console.log('$stateChangeSuccess to '+toState.name+'- fired once the state transition is complete.');
      });
      $rootScope.$on('$viewContentLoading',function(event, viewConfig){
        console.log('$viewContentLoading - view begins loading - dom not rendered',viewConfig);
      });

      /* $rootScope.$on('$viewContentLoaded',function(event){
       // runs on individual scopes, so putting it in "run" doesn't work.
       console.log('$viewContentLoaded - fired after dom rendered',event);
       }); */

      $rootScope.$on('$stateNotFound',function(event, unfoundState, fromState, fromParams){
        console.log('$stateNotFound '+unfoundState.to+'  - fired when a state cannot be found by its name.');
        console.log(unfoundState, fromState, fromParams);
      });

      window.authService = authService;
      // Activate loading indicator
      var stateChangeStartEvent = $rootScope.$on('$stateChangeStart', function (e, toState) {
        $rootScope.loadingProgress = true;
        var isLogin = (toState.name === 'auth.login') || (toState.name === 'auth.register');
        if (isLogin) {
          return;
        }

        if(!authService.isLoggedIn()) {
          e.preventDefault(); // stop current execution
          $state.go('auth.login'); // go to login
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
