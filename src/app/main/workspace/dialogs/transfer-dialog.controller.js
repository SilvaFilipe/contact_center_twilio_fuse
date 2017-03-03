(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('TransferDialogController', TransferDialogController)
    .controller('ToastTransferConfirmController', ToastTransferConfirmController)
    .factory('ToastTransferConfirmService', ToastTransferConfirmService);

  /** @ngInject */
  function TransferDialogController($rootScope, $log, $mdToast, $mdDialog, ToastTransferConfirmService, UserService) {
    var vm = this;

    vm.selectedAction = vm.displayableAction = 'transfer-call';

    ToastTransferConfirmService.confirmed = false;

    activate();

    function activate(){
      UserService.usersWithStars()
        .then(function (users) {
          vm.users = users;
        });
    }

    vm.onTransferChange = function onTransferChange() {
      $mdToast.show({
          template: (
          '<md-toast>' +
            '<div class="md-toast-content">' +
              '<md-button class="md-accent" ng-click="vm.confirmChange()">Confirm</md-button>' +
              '<md-button class="md-warn" ng-click="vm.cancelChange()">Cancel</md-button>' +
            '</div>'+
          '</md-toast>'
          ),
          controller: ToastTransferConfirmController,
          controllerAs: 'vm',
          bindToController: true,
          hideDelay: 0,
          theme: 'accent'
        })
        .finally(function () {

          if (ToastTransferConfirmService.confirmed) {
            vm.displayableAction = vm.selectedAction;
          } else {
            vm.selectedAction = vm.displayableAction;
          }

          ToastTransferConfirmService.confirmed = false;
        });
    };

    vm.closeDialog = function(){
      $mdDialog.hide();
    };
  }

  /** @ngInject */
  function ToastTransferConfirmController($mdToast, ToastTransferConfirmService) {
    var vm = this;

    vm.confirmChange = function () {
      ToastTransferConfirmService.confirmed = true;
      $mdToast.hide();
    };

    vm.cancelChange = function () {
      ToastTransferConfirmService.confirmed = false;
      $mdToast.cancel();
    };
  }


  /** @ngInject */
  function ToastTransferConfirmService() {
    var ToastTransferConfirmService = {};

    ToastTransferConfirmService.confirmed = false;

    ToastTransferConfirmService.isConfirmed = function () {
      return ToastTransferConfirmService.confirmed;
    };

    return ToastTransferConfirmService;
  }

})();
