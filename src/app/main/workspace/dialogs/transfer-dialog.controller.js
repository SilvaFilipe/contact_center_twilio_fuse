(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('TransferDialogController', TransferDialogController);

  /** @ngInject */
  function TransferDialogController($scope, $rootScope, $log, $mdDialog,  UserService, callTasks) {
    var vm = this;
    $scope.callTasks = callTasks;

    vm.selectedAction = vm.displayableAction = 'transfer-call';

    activate();

    function activate(){
      UserService.usersWithStars()
        .then(function (users) {
          vm.users = users;
        });
    }
    vm.confirmChange = function () {
        vm.displayableAction = vm.selectedAction;
      $mdDialog.hide();
    };

    vm.cancelChange = function () {
      $mdDialog.hide();
    };
    vm.onTransferChange = function onTransferChange() {
      vm.displayableAction = vm.selectedAction;
    };
  }

})();
