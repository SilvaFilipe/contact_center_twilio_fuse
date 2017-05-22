(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminUserController', AdminUserController);

  /** @ngInject */
  function AdminUserController($scope, $document, $state, User, AdminUserService, $mdToast, $mdDialog, ContactService)
  {
    var vm = this;
    vm.roles = ['phone', 'contact_center', 'admin'];
    vm.tabIndex = 0;

    vm.dtOptions = {
      dom       : 'rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
      pagingType: 'simple',
      pageLength: 50,
      autoWidth : false,
      responsive: true,
      columnDefs: [{"orderable": false, "targets": 2}]
    };
    vm.dtInstance = {};

    vm.user = User;
    console.log(vm.user);
    vm.confirmPassword = vm.user.password;
    vm.removingDids = [];

    $scope.$watch(function () {
      return vm.user.dids;
    },function(dids){
      vm.removingDids = [];
      dids.filter(function (did) {
        if (did.userFlag) {
          vm.removingDids.push({id: did._id, sid: did.sid});
        }
      });
    }, true);

    if (angular.isDefined(User.groups)) {
      vm.user.groups = User.groups.map(function (group) {
        group.userFlag = false;
        return group;
      });
    }
    if (angular.isDefined(User.queues)) {
      vm.user.queues = User.queues.map(function (queue) {
        queue.userFlag = false;
        return queue;
      });
    }
    if (angular.isDefined(vm.user.dids)) {
      vm.user.dids = vm.user.dids.map(function (did) {
        did.userFlag = false;
        return did;
      });
    }

    activate();

    function activate(){

      $scope.$on('contactModal.created', function (event, args) {
        ContactService.addToUser(vm.user._id, args.contact._id)
          .then(function (user) {
            vm.user.contacts = user.contacts;
            //$state.go("app.admin.users.edit", {id: vm.user._id})
          })
      });
    }

    vm.isFormValid = isFormValid;
    vm.saveUser = saveUser;
    vm.roleToggle = roleToggle;
    vm.roleExists = roleExists;
    vm.openAddDidDialog = openAddDidDialog;
    vm.openDeleteDidDialog = openDeleteDidDialog;

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
      if (angular.isDefined(vm.user.groups)) {
        vm.user.groups = vm.user.groups
          .filter(function (group) {
            return !group.userFlag
          }).map(function (group) {
            delete group.userFlag;
            delete group.description;
            delete group.name;
            return group;
          });
      }

      if (angular.isDefined(vm.user.queues)) {
        vm.user.queues = vm.user.queues
          .filter(function (queue) {
            return !queue.userFlag
          });
      }


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
          vm.confirmPassword = vm.user.password;
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

    function DidDialogController($scope, $mdDialog, AdminUserService, $mdToast, $timeout, userId) {
      $scope.isTollFree = '0';
      $scope.hide = function() {
        $mdDialog.hide();
      };
      $scope.cancel = function() {
        $mdDialog.cancel();
      };

      $scope.searchDid = function() {
        $scope.loadingProgress = true;
        if (!angular.isDefined($scope.areaCode)) {
          $scope.areaCode = "";
        }
        AdminUserService.didSearch($scope.areaCode, $scope.countryCode.toUpperCase(), $scope.isTollFree).then(function (res) {
          $scope.loadingProgress = false;
          $mdToast.showSimple("Did Searched Successfully.");
          $scope.didSearch = res.data;
        }, function (err) {
          $scope.loadingProgress = false;
          console.log(err);
          $mdToast.showSimple('Internal Server Error.');
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

      $scope.$watch('isTollFree', function (newValue, oldValue) {
        $scope.didSearch = null;
        if (newValue === '1') {
          $scope.searchDid();
        }
      });

      $scope.$watch('countryCode', function (newValue, oldValue) {
          $scope.didSearch = null;
          $scope.areaCode = '';
          $scope.searchDid();
      });

      $timeout(function () {
        $scope.searchDid();
      }, 500);

    }

    function openDeleteDidDialog (ev) {
      // Appending dialog to document.body to cover sidenav in docs app
      var confirm = $mdDialog.confirm()
        .title('Confirm')
        .textContent('Are you sure you want to delete the selected dids?')
        .ariaLabel('delete dids')
        .targetEvent(ev)
        .clickOutsideToClose(true)
        .parent(angular.element(document.body))
        .ok('Yes')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function() {
        AdminUserService.deleteDids(vm.user._id, vm.removingDids).then(function (res) {
          console.log(res);
          vm.user.dids = vm.user.dids.filter(function (did) {
            return !did.userFlag
          });
          $mdToast.showSimple("Successfully Deleted Dids.");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple('Internal Server Error.');
        });
      }, function() {
        console.log('Delete is canceled');
      });
    }

  }

})();
