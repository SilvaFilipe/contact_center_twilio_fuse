(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminQueueController', AdminQueueController);

  /** @ngInject */
  function AdminQueueController($scope, $state, Queue, QueueService, $mdToast)
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
    vm.queue.users = Queue.users && Queue.users.map(function (user) {
      user.queueFlag = true;
      return user
    });

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
      console.log(vm.queue)

      vm.queue.users = vm.queue.users
        .filter(function (user) {
          return user.queueFlag
        });

      if (vm.queue._id) {

        QueueService.update(vm.queue._id, vm.queue).then(function (res) {
          $mdToast.showSimple("Queue Information Saved.");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });

      } else {

        QueueService.create(vm.queue).then(function (queue) {
          console.log(queue);
          vm.queue._id = queue._id;

          $state.go('app.admin.queues.edit', {id: vm.queue._id});

          $mdToast.showSimple("Queue Information Saved.");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });

      }
    }

  }

})();
