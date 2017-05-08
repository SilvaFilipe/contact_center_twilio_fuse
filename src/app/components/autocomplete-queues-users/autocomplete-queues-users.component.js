angular.module('app.components')
  .component('autocompleteQueuesUsers', {
    templateUrl: 'app/components/autocomplete-queues-users/autocomplete-queues-users.html',
    controller: AutocompleteContactController,
    bindings: {
      queue: '='
    }
  });

/** @ngInject */
function AutocompleteContactController($log, $rootScope, UserService) {
  var $ctrl = this;

  $ctrl.queryModel = function () {
    return UserService.queryExcludeQueueUsers($ctrl.queue._id, $ctrl.searchText)
  };

  $ctrl.addToQueue = function (instance) {
    if(!instance) return;
    console.log($ctrl.queue, instance);
    if(!UserService.isQueueInUser(instance, $ctrl.queue)){
      instance.queues.push($ctrl.queue);
      console.log(instance.queues)
      UserService.update(instance._id, instance);
      instance.queues = []; //avoid recursive reference
      $ctrl.queue.users.push(instance);
    }
  };

  $log.log('AutocompleteContactController load');
}
