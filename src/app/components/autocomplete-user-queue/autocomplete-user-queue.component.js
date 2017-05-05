angular.module('app.components')
  .component('autocompleteUserQueue', {
    templateUrl: 'app/components/autocomplete-user-queue/autocomplete-user-queue.html',
    controller: AutocompleteUserQueueController,
    bindings: {
      user: '='
    }
  });

/** @ngInject */
function AutocompleteUserQueueController($log, $rootScope, UserService, QueueService) {
  var $ctrl = this;

  $ctrl.queryModel = function () {
    return UserService.queryExcludeUserQueues($ctrl.user._id, $ctrl.searchText)
  };

  $ctrl.addToUser = function (instance) {
    if(!instance) return;
    if(!UserService.isQueueInUser($ctrl.user, instance)){
      $ctrl.user.queues.push(instance);
    }
  };

  $log.log('AutocompleteContactController load');
}
