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
      if (angular.isDefined(vm.queue.users)) {
        vm.queue.users = vm.queue.users
          .filter(function (user) {
            return !user.queueFlag
          }).map(function (user) {
            return user._id;
          });
      }

      var promise;
      if (vm.queue._id) {
        promise = QueueService.update(vm.queue._id, vm.queue);
      } else {
        promise = QueueService.create(vm.queue);
      }

      promise
        .then(function (response) {
          console.log(response);
          $mdToast.showSimple("Queue Information Saved.");
          $state.go("app.admin.queues");
        })
        .catch(function (err) {
          console.log(err);
          $mdToast.showSimple("Something went wrong, Please try again");
        });
    }

    function flagUsers(){
      vm.queue.users = vm.queue.users && vm.queue.users.map(function (user) {
          user.queueFlag = false;
          return user
        });
    }

  }

})();
