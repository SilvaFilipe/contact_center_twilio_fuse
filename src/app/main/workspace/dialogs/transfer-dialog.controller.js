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
          console.log(users);
          vm.users = users;
        });
    }

    vm.updatedStarredUser = function (user, status) {
      UserService.starUser(user, status)
        .then(function (r) {
          console.log(r);
        });
    };

    vm.isStarred = function (user) {
      return user.starred;
    };

    vm.callUser = function (user) {
      $log.log('call inline number ' + user.phone);
      //$rootScope.$broadcast('CallPhoneNumber', {phoneNumber: user.phone});
    };

    vm.orderStarredUser = function(user){
      return !user.starred ? -1 : 1;
    };

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
