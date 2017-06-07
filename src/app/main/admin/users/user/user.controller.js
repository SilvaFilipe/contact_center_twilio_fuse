(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminUserController', AdminUserController);

  /** @ngInject */
  function AdminUserController($scope, $document, $state, User, AdminUserService, $mdToast, $mdDialog, ContactService, $rootScope,  $http, $q, UserService)
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
    var originalAvatarUrl = vm.user.avatarUrl;

    $scope.$watch(function () {
      return vm.user.dids;
    },function(dids){
      vm.removingDids = [];
      if (angular.isDefined(dids)) {
        dids.filter(function (did) {
          if (did.userFlag) {
            vm.removingDids.push({id: did._id, sid: did.sid});
          }
        });
      }

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
    function saveUser() {
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


      var file = vm.user.avatarUrl;
      var isUpdate = angular.isDefined(vm.user._id);
      var promise;
      if (isUpdate) {
        promise = AdminUserService.updateUser(vm.user._id, vm.user)
      } else {
        promise = AdminUserService.createUser(vm.user)
      }

      promise
        .then(function (response) {
          vm.user = response.data;
          if (file !== originalAvatarUrl && file) {
            return UserService.uploadAvatar(vm.user._id, file);
          } else {
            return $q.resolve({success: true, user: vm.user});
          }
        })
        .then(function (response) {
          if (!isUpdate && response.success) {
            //vm.user = response.user;
            vm.confirmPassword = response.user.password;
            vm.tabIndex = 1;
          }
          if (isUpdate) {
            $mdToast.showSimple("User Information Saved.");
            $state.go("app.admin.users");
          } else {
            $mdToast.showSimple("New User Added Successfully.");
          }
        })
        .catch(function (err) {
          console.log(err);
          $mdToast.showSimple(err.data);
        });
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
      return list && list.indexOf(item) > -1;
    }

    $scope.showSipHelpDialog = function(ev) {
      var apiUrl = $rootScope.apiBaseUrl;
      $http.get(apiUrl + 'api/admin/showSipInfo?email=' + vm.user.email, {withCredentials: true}).then(function(response) {
        $mdDialog.show({
          targetEvent: ev,
          template:
          '<md-dialog>' +
          '  <md-dialog-content>' + response.data + '</md-dialog-content>' +
          // '  <md-dialog-actions>' +
          // '    <md-button ng-click="$mdDialog.hide()" class="md-primary">' +
          // '      Close' +
          // '    </md-button>' +
          // '  </md-dialog-actions>' +
          '</md-dialog>',
          clickOutsideToClose: true,
          escapeToClose: true
        });
        // $mdDialog.show(
        //   $mdDialog.alert()
        //     .parent(angular.element(document.querySelector('#popupContainer')))
        //     .clickOutsideToClose(true)
        //     .title('This is an alert title')
        //     .textContent('You can specify some description text in here.')
        //     .ariaLabel('Alert Dialog Demo')
        //     .ok('Got it!')
        //     .targetEvent(ev)
        //);
        console.log(response.data);
      });

    };

    $scope.closeDialog = function() {
      // Easily hides most recent dialog shown...
      // no specific instance reference is needed.
      $mdDialog.hide();
    };

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
