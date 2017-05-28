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
      console.log(user);
      vm.confirmPassword = vm.user.password;
    });

    vm.isFormValid = isFormValid;
    vm.saveUser = saveUser;

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


  }

})();
