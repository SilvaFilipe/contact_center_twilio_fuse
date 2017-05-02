(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminUserController', AdminUserController);

  /** @ngInject */
  function AdminUserController($scope, $document, $state, User, AdminUserService, $mdToast, $mdDialog)
  {
    var vm = this;
    vm.roles = ['phone', 'contact_center', 'admin'];
    vm.tabIndex = 0;

    vm.user = User;
    console.log(vm.user);
    vm.isFormValid = isFormValid;
    vm.saveUser = saveUser;
    vm.roleToggle = roleToggle;
    vm.roleExists = roleExists;
    vm.openAddDidDialog = openAddDidDialog;

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
          $mdToast.showSimple(err.data);
        });
      }
      else
      {
        AdminUserService.createUser(vm.user).then(function (res) {
          $mdToast.showSimple("New User Added Successfully.");
          vm.user = res.data;
          vm.tabIndex = 1;
        }, function (err) {
          console.log(err);
          $mdToast.showSimple(err.data);
        });
      }

    }

    function roleToggle (item, list) {
      var idx = list.indexOf(item);
      if (idx > -1) {
        list.splice(idx, 1);
      }
      else {
        list.push(item);
      }
    }

    function roleExists (item, list) {
      return list.indexOf(item) > -1;
    }

    function openAddDidDialog (ev) {
      $mdDialog.show({
        controller: DidDialogController,
        templateUrl: 'app/main/admin/users/user/views/user-add-did.html',
        parent: angular.element(document.body),
        targetEvent: ev,
        clickOutsideToClose:true,
        locals:{userId: vm.user._id},
      })
        .then(function(did) {
          vm.user.dids.push(did);
        }, function() {
          $scope.status = 'You cancelled the dialog.';
        });
    }

    function DidDialogController($scope, $mdDialog, AdminUserService, $mdToast, userId) {
      $scope.loadingProgress = false;
      $scope.hide = function() {
        $mdDialog.hide();
      };
      $scope.cancel = function() {
        $mdDialog.cancel();
      };

      $scope.searchDid = function() {
        $scope.loadingProgress = true;
        AdminUserService.didSearch($scope.areaCode).then(function (res) {
          $scope.loadingProgress = false;
          $mdToast.showSimple("Did Searched Successfully.");
          $scope.didSearch = res.data;
        }, function (err) {
          $scope.loadingProgress = false;
          console.log(err);
          $mdToast.showSimple(err.data);
        });
      };

      $scope.purchaseDid = function () {
        $scope.loadingProgress = true;
        var data = {phoneNumber: $scope.selectedDid, userId: userId};
        AdminUserService.didPurchase(data).then(function (res) {
          $scope.loadingProgress = false;
          $mdToast.showSimple("Did Purcharsed Successfully.");
          $mdDialog.hide(res.data);
        }, function (err) {
          $scope.loadingProgress = false;
          console.log(err);
          $mdToast.showSimple(err.data);
        });
      };
    }

  }

})();
