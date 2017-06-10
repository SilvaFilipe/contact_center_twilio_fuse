(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('TransferDialogController', TransferDialogController);

  /** @ngInject */
  function TransferDialogController($scope, $rootScope, $log, $mdDialog,  $http, UserService, callTasks, ConferenceCall, CallService, ContactsDirectoryService) {
    var vm = this;
    var apiUrl = $rootScope.apiBaseUrl;
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


    vm.selectedAction = vm.displayableAction = 'start-screen';

    activate();

    function activate(){
      UserService.usersWithStars()
        .then(function (users) {
          vm.users = users;
        });
    }

    vm.confirmChange = function () {
      vm.transferExternalNumber = ContactsDirectoryService.selectedUser.extension;

      if (vm.displayableAction == 'transfer-call') {
        console.log('transfer to ' + vm.transferExternalNumber);
        CallService.getActiveConnSid(function(ActiveConnSid) {
          $http.get(apiUrl + 'api/agents/dialCustomerTransfer?caller_sid=' + $rootScope.currentCall.callSid + '&toNumber=' + vm.transferExternalNumber, {withCredentials: true});
          var index = $scope.callTasks.indexOf($rootScope.currentCall);
          $scope.callTasks.splice(index, 1);
        });
        vm.displayableAction = vm.selectedAction;
        $mdDialog.hide();
      } else {
        //join lines
        console.log($scope.selected );
        //TODO: should probably be a service
        var uniqueId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
        });
        var callParams = {fromNumber: 'Conference', duration: 0, callSid: uniqueId, conferenceName: uniqueId , name: 'Conference'};
        var newConference = new ConferenceCall(callParams);
        $scope.selected.forEach(function (call) {
          newConference.calls.push(call);
          $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + call.callSid + '&roomName=' + uniqueId, {withCredentials: true});
          var index = $scope.callTasks.indexOf(call);
          $scope.callTasks.splice(index, 1);
        });
        console.log('newConference', newConference);
        $rootScope.$broadcast('AddCallTask', newConference);
        CallService.getActiveConnSid(function(ActiveConnSid) {
          $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + uniqueId, {withCredentials: true});
        });
        vm.displayableAction = vm.selectedAction;
        $mdDialog.hide();
      }
    };

    vm.cancelChange = function () {
      $mdDialog.hide();
    };
    vm.onTransferChange = function onTransferChange() {
      vm.displayableAction = vm.selectedAction;
    };
  }

})();
