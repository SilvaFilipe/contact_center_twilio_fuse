(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('KeypadDialogController', KeypadDialogController);

  /** @ngInject */
  function KeypadDialogController($scope, $rootScope, $log, $mdDialog,  $http) {
    var vm = this;
    var apiUrl = $rootScope.apiBaseUrl;
    $scope.hide = function() {
      $mdDialog.hide();
    };
    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    vm.keyPressed = function (numbers) {
      var number = numbers.charAt(numbers.length-1);
      if($rootScope.connection){
        $rootScope.connection.sendDigits(number);
      }
    }
  }

})();
