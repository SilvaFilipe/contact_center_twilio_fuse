(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('TransferDialogController', TransferDialogController);

  /** @ngInject */
  function TransferDialogController($scope, $rootScope, $log, $mdDialog,  UserService, callTasks, ConferenceCall) {
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
      var callParams = {fromNumber: 12345, duration: 0, callSid: 'CA12345', conferenceName: 'ConferenceTest', name: 'MockConference'};
      var newConference = new ConferenceCall(callParams);
      $scope.selected.forEach(function (call) {
        newConference.calls.push(call);
      });
      console.log('newConference', newConference);
      //$scope.currentCall = newConference;
      //$scope.callTasks.push($scope.currentCall);
      $rootScope.$broadcast('AddCallTask', newConference);
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
