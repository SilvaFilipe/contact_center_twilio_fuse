(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('TransferDialogController', TransferDialogController);

  /** @ngInject */
  function TransferDialogController($scope, $rootScope, $log, $mdDialog,  UserService, callTasks) {
    var vm = this;
    $scope.callTasks = callTasks;
    $scope.selected = [];

    $scope.toggle = function (item, list) {
      var idx = list.indexOf(item);
      if (idx > -1) {
        list.splice(idx, 1);
      }
      else {
        list.push(item);
      }
    };

    $scope.exists = function (item, list) {
      return list.indexOf(item) > -1;
    };


    vm.selectedAction = vm.displayableAction = 'transfer-call';

    activate();

    function activate(){
      UserService.usersWithStars()
        .then(function (users) {
          vm.users = users;
        });
    }
    vm.confirmChange = function () {
      console.log($scope.selected );
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
