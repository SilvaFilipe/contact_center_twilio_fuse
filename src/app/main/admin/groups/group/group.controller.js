(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminGroupController', AdminGroupController);

  /** @ngInject */
  function AdminGroupController($scope, $rootScope, $state, Group, GroupService, $mdToast, ContactService)
  {
    var vm = this;

    vm.dtOptions = {
      dom       : 'rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
      pagingType: 'simple',
      pageLength: 50,
      autoWidth : false,
      responsive: true
    };
    vm.dtInstance = {};

    vm.group = Group || {};
    vm.group.users = Group.users.map(function (user) {
      user.groupFlag = false;
      return user
    });

    vm.isFormValid = isFormValid;
    vm.saveGroup = saveGroup;

    activate();

    function activate(){
      $rootScope.$on('contactModal.created', function (event, args) {
        console.log('hola');
        console.log('args', args);
        ContactService.addToGroup(vm.group._id, args.contact._id)
          .then(function (group) {
            console.log(group)
            vm.group = group;
          })
      });
    }

    /**
     * Checks if the given form valid
     *
     * @param formName
     */
    function isFormValid(formName) {
      if ($scope[formName] && $scope[formName].$valid) {
        return $scope[formName].$valid;
      }
    }

    /**
     * Save user
     */
    function saveGroup() {
      console.log(vm.group)

      vm.group.users = vm.group.users
        .filter(function (user) {
          return !user.groupFlag
        });

      if (vm.group._id) {

        GroupService.update(vm.group._id, vm.group).then(function (res) {
          $mdToast.showSimple("Group Information Saved.");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });

      } else {

        GroupService.create(vm.group).then(function (group) {
          console.log(group);
          vm.group = group;
          vm.tabIndex = 1;

          //$state.go('app.admin.groups.edit', {id: vm.group._id});

          $mdToast.showSimple("Group Information Saved.");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });

      }
    }

  }

})();
