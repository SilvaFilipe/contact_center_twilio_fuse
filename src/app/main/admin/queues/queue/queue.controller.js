(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminQueueController', AdminQueueController);

  /** @ngInject */
  function AdminQueueController($scope, $q, $state, UserService, Queue, QueueService, $mdToast, ContactService)
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

    vm.queue = Queue;

    activate();

    function activate(){
      flagUsers();

      $scope.$on('contactModal.created', function (event, args) {
        ContactService.addToQueues(vm.queue._id, args.contact._id)
          .then(function (queue) {
            console.log(queue)
            vm.queue = queue;
          })
      });
    }

    vm.isFormValid = isFormValid;
    vm.saveQueue = saveQueue;

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
    function saveQueue() {
      var users = angular.copy(vm.queue.users);
      vm.queue.users = users
        .filter(function (user) {
          return !user.queueFlag
        });

      var usersToRemoveFromQueue = users
        .filter(function (user) {
          return user.queueFlag
        });
      if (vm.queue._id) {
        var queueUpdatePromise = QueueService.update(vm.queue._id, vm.queue);
        var removeUsersPromise = UserService.removeMultipleUsersFromQueue(usersToRemoveFromQueue, vm.queue);

        $q.all([queueUpdatePromise, removeUsersPromise])
          .then(function (results) {
          //var queue = results[0];
          $mdToast.showSimple("Queue Information Saved.");
          //vm.queue = queue;
          flagUsers();
          $state.go("app.admin.queues");

        }, function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });

      } else {

        QueueService.create(vm.queue).then(function (queue) {
          vm.queue = queue;
          vm.tabIndex = 1;

          $mdToast.showSimple("Queue Information Saved.");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });

      }
    }

    function flagUsers(){
      vm.queue.users = vm.queue.users && vm.queue.users.map(function (user) {
          user.queueFlag = false;
          return user
        });
    }

  }

})();
