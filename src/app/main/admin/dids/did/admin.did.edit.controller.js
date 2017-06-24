(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminDidEditController', AdminDidEditController);

  /** @ngInject */
  function AdminDidEditController($scope, $rootScope, $state, $mdToast, Did, DidService)
  {
    var vm = this;

    vm.did = Did || {};

    vm.saveDid = function () {
      DidService.updateDid(vm.did).then(function (res) {
        $mdToast.showSimple("Did Information Saved.");
      }, function (err) {
        console.log(err);
        $mdToast.showSimple(err);
      });
    }

  }

})();
