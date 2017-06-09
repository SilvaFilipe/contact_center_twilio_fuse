(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('KeypadDialogController', KeypadDialogController);

  /** @ngInject */
  function KeypadDialogController($scope, $rootScope, $mdDialog) {
    var vm = this;
    $scope.hide = function() {
      $mdDialog.hide();
    };
    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    vm.digitClicked = function () {
      if($rootScope.connection){
        $rootScope.connection.sendDigits(vm.numbers.charAt(vm.numbers.length-1));
      }
    };

    vm.keyDowned = function (keyEvent) {
      if (keyEvent.which >= 48 && keyEvent.which <= 57) {
        if($rootScope.connection){
          $rootScope.connection.sendDigits(vm.numbers.charAt(vm.numbers.length-1));
        }
      }
    };
  }

})();
