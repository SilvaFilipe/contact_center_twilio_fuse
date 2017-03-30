(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('TransferDialogController', TransferDialogController);

  /** @ngInject */
  function TransferDialogController($rootScope, $log, $mdDialog,  UserService) {
    var vm = this;

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
