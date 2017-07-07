(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminDidEditController', AdminDidEditController)
    .factory('AdminDidEditService', AdminDidEditService);

  /** @ngInject */
  function AdminDidEditController($scope, $rootScope, $state, $mdToast, $q, Did, DidService, AdminDidEditService)
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
      if(!user || !user._id) return;
      DidService.updateDidUser(vm.did._id, user._id)
        .then(function (response) {
          vm.did.user = user;
          $mdToast.showSimple("Did user updated.");
        })
        .catch(function (err) {
          console.warn(err)
        })
    }
  }

  /** @ngInject */
  function AdminDidEditService(){
    var service = {};

    service.assignedUser = {};

    return service;
  }

})();
