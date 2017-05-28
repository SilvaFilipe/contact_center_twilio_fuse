(function ()
{
  'use strict';

  angular
    .module('app.profile')
    .controller('userProfileController', userProfileController);

  /** @ngInject */
  function userProfileController($scope, $document, $state, $mdToast, $mdDialog, $rootScope,  $http, $window, AdminUserService)
  {
    var vm = this;
    var apiUrl = $rootScope.apiBaseUrl;

    AdminUserService.getUser(JSON.parse($window.sessionStorage.getItem('currentUser'))._id).then(function (user) {
      vm.user = user;
      if (angular.isDefined(vm.user.dids)) {
        vm.user.dids = vm.user.dids.map(function (did) {
          did.userFlag = false;
          return did;
        });
      }
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
      vm.confirmPassword = vm.user.password;
    });

    vm.removingDids = [];

    vm.isFormValid = isFormValid;
    vm.saveUser = saveUser;
    vm.openAddDidDialog = openAddDidDialog;
    vm.openDeleteDidDialog = openDeleteDidDialog;

    vm.dtOptions = {
      dom       : 'rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
      pagingType: 'simple',
      pageLength: 50,
      autoWidth : false,
      responsive: true,
      columnDefs: []
    };
    vm.dtInstance = {};

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
        vm.user.groups = vm.user.groups.map(function (group) {
            delete group.description;
            delete group.name;
            return group;
          });
      }

      AdminUserService.updateUser(vm.user._id, vm.user).then(function (res) {
        $mdToast.showSimple("User Information Saved.");
      }, function (err) {
        console.log(err);
        $mdToast.showSimple(err.data);
      });

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
