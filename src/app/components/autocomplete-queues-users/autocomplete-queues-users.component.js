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
  var items = [];

  $ctrl.queryModel = function () {
    return UserService.queryExcludeQueueUsers($ctrl.queue._id, $ctrl.searchText).then(function (res) {
      items = res.filter(function(val) {
        for( var i=0; i < $ctrl.queue.users.length; i++ ){
          if( $ctrl.queue.users[i]._id === val._id ) {
            return false;
          }
        }
        return true;
      });
      return items;
    }, function (err) {
      console.log(err);
    });
  };

  $ctrl.addToQueue = function (instance) {
      if (!instance) return;
      if (!angular.isDefined($ctrl.queue.users)) {
        $ctrl.queue.users = [];
      }
      if(!UserService.isUserInQueue(instance, $ctrl.queue)){
        $ctrl.queue.users.push(instance);
      }
      $ctrl.selectedItem = '';
      $('#queueUserInput').trigger('blur');

  };

  $log.log('AutocompleteContactController load');
}
