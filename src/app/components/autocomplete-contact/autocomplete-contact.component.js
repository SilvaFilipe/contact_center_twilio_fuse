angular.module('app.components')
  .component('autocompleteContact', {
    templateUrl: 'app/components/autocomplete-contact/autocomplete-contact.html',
    controller: AutocompleteContactController,
    bindings: {
      group: '='
    }
  });

/** @ngInject */
function AutocompleteContactController($log, $rootScope, UserService, GroupService) {
  var $ctrl = this;

  $ctrl.queryModel = function () {
    return UserService.queryExcludeGroupUsers($ctrl.group._id, $ctrl.searchText)
  };

  $ctrl.addToGroup = function (instance) {
    if(!instance) return;
    console.log($ctrl.group, instance);
    if(!GroupService.isUserInGroup($ctrl.group, instance)){
      $ctrl.group.users.push(instance);
      GroupService.update($ctrl.group._id, $ctrl.group);
    }
  };

  $log.log('AutocompleteContactController load');
}
