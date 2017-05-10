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
  var items = [];

  $ctrl.queryModel = function () {
    return UserService.queryExcludeUserQueues($ctrl.user._id, $ctrl.searchText).then(function (res) {
      items = res.filter(function(val) {
        for( var i=0, len=$ctrl.user.queues.length; i<len; i++ ){
          if( $ctrl.user.queues[i]._id === val._id ) {
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

  $ctrl.addToUser = function (instance) {
    if(!instance) return;
    if(!UserService.isQueueInUser($ctrl.user, instance)){
      $ctrl.user.queues.push(instance);
    }
    $ctrl.selectedItem = '';
    $('#userQueueInput').trigger('blur');
  };

  $log.log('AutocompleteContactController load');
}
