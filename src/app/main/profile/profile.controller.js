(function ()
{
  'use strict';

  angular
    .module('app.profile')
    .controller('userProfileController', userProfileController);

  /** @ngInject */
  function userProfileController($scope, $document, $q, $mdToast, $mdDialog, $rootScope,  $http, $window, AdminUserService, ContactService, UserService)
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
      if (angular.isDefined(vm.user.mailGreetingUrl) && vm.user.mailGreetingUrl)
        vm.mailGreetingUrl = vm.user.mailGreetingUrl;
      else {
        $http.post(apiUrl + 'api/callControl/leave_message').then(function(res) {
          vm.mailGreetingUrl = res.data;
        });
      }

      activate();

      function activate(){

        $scope.$on('contactModal.created', function (event, args) {
          ContactService.addToUser(vm.user._id, args.contact._id)
            .then(function (user) {
              vm.user.contacts = user.contacts;
              $rootScope.$broadcast('quickpanel.contacts.reload');
              //$state.go("app.admin.users.edit", {id: vm.user._id})
            })
        });
      }
    });

    vm.removingDids = [];

    vm.isFormValid = isFormValid;
    vm.saveUser = saveUser;
    vm.openDeleteDidDialog = openDeleteDidDialog;
    vm.setVoicemailGreeting = setVoicemailGreeting;

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
      var file = vm.user.avatarUrl;
      var promises = [];
      promises.push(AdminUserService.updateUser(vm.user._id, vm.user));
      if (file) {
        promises.push(UserService.uploadAvatar(vm.user._id, file));
      }
      $q.all(promises)
        .then(function (results) {
          $mdToast.showSimple("User Information Saved.");
           if(results.length > 1){
              $mdToast.showSimple("User avatar saved.");
           }
        })
        .catch(function (err) {
          console.log(err);
          $mdToast.showSimple(err.data);
        });

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

    function setVoicemailGreeting (ev) {
      var confirm = $mdDialog.prompt()
        .title('What phone number should we call you at record your voicemail greeting?')
        .ariaLabel('Set Voicemail Greeting')
        .targetEvent(ev)
        .parent(angular.element(document.body))
        .ok('OKAY')
        .cancel('CANCEL');
      $mdDialog.show(confirm).then(function(number) {
        AdminUserService.setVoiceMailGreeting(vm.user._id, number).then(function (res) {
          console.log(res);
          $mdToast.showSimple("Successfully Set Voicemail Greeting.");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple('Internal Server Error.');
        });
      }, function() {
        console.log('set voicemail greeting is canceled');
      });
    }


  }

})();
