(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminDidEditController', AdminDidEditController)
    .factory('AdminDidEditService', AdminDidEditService);

  /** @ngInject */
  function AdminDidEditController($scope, $document, $mdDialog, $state, $mdToast, $q, Did, DidService, AdminDidEditService)
  {
    var vm = this;

    vm.did = Did || {};
    vm.originalAudioUrl = vm.did.greetingAudioUrl;

    function activate(){

      console.log('vm.did', vm.did);

      $scope.$watch(function () {
        return AdminDidEditService.user
      }, function (oldVal, newVal) {
        if(newVal){
          console.log(newVal);
        }
      }, true)
    }

    activate();

    vm.saveDid = function () {
      var file = vm.did.greetingAudioUrl;
      var promises = [];
      promises.push(DidService.updateDid(vm.did));
      if (file !== vm.originalAudioUrl && file) {
        promises.push(DidService.uploadAudio(vm.did._id, file));
      }

      if(vm.did.flow != 'user'){
        promises.push(vm.updateDidUser())
      }

      $q.all(promises)
        .then(function (results) {
          console.log(results);
          $mdToast.showSimple("Did Information has been saved.");
          if(results.length > 1){
            $mdToast.showSimple("Greeting audio file has been saved.");
          }
          $state.go("app.admin.dids");
        })
        .catch(function (err) {
          $mdToast.showSimple(err.data.err);
        });
    };

    vm.updateDidUser = function(user){
      return DidService.updateDidUser(vm.did._id, vm.did.user ? vm.did.user._id : null, user ? user._id : null)
        .then(function (response) {
          vm.did.user = user;
          $mdToast.showSimple("Did user updated.");
          $mdDialog.hide();
        })
        .catch(function (err) {
          console.warn(err)
        })
    }

    vm.showUserWidgetDialog = function showUserWidgetDialog(ev){
      $mdDialog.show({
        /** @ngInject */
        controller: function showUserWidgetDialogController($mdDialog, did, updateDidUser){
          var vm = this;
          console.log(vm);
          vm.did = did;
          vm.updateDidUser = updateDidUser;
          vm.closeDialog = function () {
            $mdDialog.hide();
          }
        },
        controllerAs: 'vm',
        //scope: $scope,
        locals: {
          did: vm.did,
          updateDidUser: vm.updateDidUser
        },
        template: '<autocomplete-user-generic user="vm.did.user" on-item-selected="vm.updateDidUser"></autocomplete-user-generic>',
        parent: angular.element($document.body),
        targetEvent: ev,
        clickOutsideToClose: true
      });
    }
  }


  /** @ngInject */
  function AdminDidEditService(){
    var service = {};

    service.assignedUser = {};

    return service;
  }

})();
