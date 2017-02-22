(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('TransferDialogController', TransferDialogController)
    .controller('ToastTransferConfirmController', ToastTransferConfirmController);

  /** @ngInject */
  function TransferDialogController($mdToast) {
    var vm = this;
    vm.selectedAction = 'transfer-call';

    vm.onTransferChange = function onTransferChange(e) {

      $mdToast.show({
          template: '',
          ok: 'Confirm',
          cancel: 'Back',
          controller: ToastTransferConfirmController,
          controllerAs: 'vm'
      })
        .then(function (r) {
          console.log(r)
        });

      return false;
    }
  }

  /** @ngInject */
  function ToastTransferConfirmController() {

  }

})();
