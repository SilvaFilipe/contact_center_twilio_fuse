(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminUserController', AdminUserController);

  /** @ngInject */
  function AdminUserController($scope, $document, $state, User, AdminUserService, $mdToast)
  {
    var vm = this;

    vm.user = User;
    console.log(vm.user);
    vm.gotoUsers = gotoUsers;
    vm.isFormValid = isFormValid;
    vm.saveUser = saveUser;

    function gotoUsers() {
      $state.go('app.admin.users');
    }

    /**
     * Checks if the given form valid
     *
     * @param formName
     */
    function isFormValid(formName)
    {
      if ( $scope[formName] && $scope[formName].$valid )
      {
        return $scope[formName].$valid;
      }
    }

    /**
     * Save user
     */
    function saveUser()
    {
      // Since we have two-way binding in place, we don't really need
      // this function to update the products array in the demo.
      // But in real world, you would need this function to trigger
      // an API call to update your database.
      if ( vm.user._id )
      {
        AdminUserService.updateUser(vm.user._id, vm.user).then(function (res) {
          $mdToast.showSimple("User Information Saved.");
          $state.go("app.admin.users");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });
      }
      else
      {
        AdminUserService.createUser(vm.user).then(function (res) {
          console.log(res);
          $mdToast.showSimple("User Information Saved.");
          $state.go("app.admin.users");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });
      }

    }

  }

})();
