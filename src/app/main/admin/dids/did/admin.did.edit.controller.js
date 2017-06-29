(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminDidEditController', AdminDidEditController);

  /** @ngInject */
  function AdminDidEditController($scope, $rootScope, $state, $mdToast, $q, Did, DidService)
  {
    var vm = this;

    vm.did = Did || {};
    vm.originalAudioUrl = vm.did.greetingAudioUrl;

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
          console.log(err);
          $mdToast.showSimple(err.data.err);
        });
    }

  }

})();
