(function ()
{
    'use strict';

    angular
        .module('fuse')
        .run(runBlock);

    /** @ngInject */
    function runBlock($rootScope, $timeout, $state, $log, $interval, authService, msNavigationService) {

      $rootScope.$on('$stateChangeStart',function(event, toState, toParams, fromState, fromParams){
        // console.log('$stateChangeStart to '+toState.name+'- fired when the transition begins. toState,toParams : \n',toState, toParams);
        if (fromState.name === 'app.workspace') {
          $rootScope.showCallNotification();
        }
      });
      $rootScope.$on('$stateChangeError',function(event, toState, toParams, fromState, fromParams, error){
        // console.log('$stateChangeError - fired when an error occurs during transition.');
        // console.log(arguments);
      });
      $rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
        // console.log('$stateChangeSuccess to '+toState.name+'- fired once the state transition is complete.');
      });
      $rootScope.$on('$viewContentLoading',function(event, viewConfig){
        // console.log('$viewContentLoading - view begins loading - dom not rendered',viewConfig);
      });

      /* $rootScope.$on('$viewContentLoaded',function(event){
       // runs on individual scopes, so putting it in "run" doesn't work.
       console.log('$viewContentLoaded - fired after dom rendered',event);
       }); */

      $rootScope.$on('$stateNotFound',function(event, unfoundState, fromState, fromParams){
        // console.log('$stateNotFound '+unfoundState.to+'  - fired when a state cannot be found by its name.');
        // console.log(unfoundState, fromState, fromParams);
      });

      window.authService = authService;
      // Activate loading indicator
      var stateChangeStartEvent = $rootScope.$on('$stateChangeStart', function (e, toState) {
        $rootScope.loadingProgress = true;
        var isLogin = (toState.name === 'auth.login') || (toState.name === 'auth.register') || (toState.name === 'auth.forgot-password') || (toState.name === 'auth.reset-password');
        if (isLogin) {
          return;
        }

        if(!authService.isLoggedIn()) {
          e.preventDefault(); // stop current execution
          console.log('user not logged in');
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

      $rootScope.startReservationCounter = function () {

        $log.log('start reservation counter');
        $rootScope.reservationCounter = $rootScope.reservation.task.age;

        $rootScope.reservationInterval = $interval(function () {
          $rootScope.reservationCounter++;
        }, 1000);

      };

      $rootScope.stopReservationCounter = function () {

        if (angular.isDefined($rootScope.reservationInterval)) {
          $interval.cancel($rootScope.reservationInterval);
          $rootScope.reservationInterval = undefined;
        }

      };

      $rootScope.startExtensionCounter = function (task) {

        $log.log('start working counter');
        $rootScope.extensionInterval = $interval(function () {
          task.duration++;
        }, 1000);

      };

      $rootScope.stopExtensionCounter = function () {
        $log.log('stop working counter');
        if (angular.isDefined($rootScope.extensionInterval)) {
          $interval.cancel($rootScope.extensionInterval);
          $rootScope.extensionInterval = undefined;
        }

      };

      $rootScope.startWorkingCounter = function () {

        $log.log('start working counter');
        $rootScope.workingInterval = $interval(function () {
          $rootScope.currentCall.duration++;
        }, 1000);
      };

      $rootScope.stopWorkingCounter = function () {
        $log.log('stop working counter');
        if (angular.isDefined($rootScope.workingInterval)) {
          $interval.cancel($rootScope.workingInterval);
          $rootScope.workingInterval = undefined;
        }
      };

      $rootScope.showCallNotification = function () {
        var nonCompletedCallTasks = $rootScope.callTasks.filter(function (task) {
          return !task.isCompleted();
        });
        var number = nonCompletedCallTasks.length;
        var nonCompletedExTasks = $rootScope.extensionCallTasks.filter(function (task) {
          return !task.isCompleted();
        });
        number += nonCompletedExTasks.length;
        if (angular.isDefined($rootScope.reservation) && $rootScope.reservation) {
          number += 1;
        }
        if (number>0){
          msNavigationService.saveItem('fuse.workspace', {
            badge : {
              content: number,
              color  : '#09d261'
            }
          });

        }
      };

    }
})();
