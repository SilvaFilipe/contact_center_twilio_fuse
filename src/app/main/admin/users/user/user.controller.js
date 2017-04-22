(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminUserController', AdminUserController);

  /** @ngInject */
  function AdminUserController($scope, $document, $state, User)
  {
    var vm = this;

    vm.user = User;
    vm.gotoUsers = gotoUsers;

    function gotoUsers() {
      $state.go('app.admin.users');
    }

  }

})();
