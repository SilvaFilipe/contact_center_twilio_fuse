angular.module('app.components')
  .component('autocompleteUserGroup', {
    templateUrl: 'app/components/autocomplete-user-group/autocomplete-user-group.html',
    controller: AutocompleteUserGroupController,
    bindings: {
      user: '='
    }
  });

/** @ngInject */
function AutocompleteUserGroupController($log, $rootScope, UserService, GroupService) {
  var $ctrl = this;

  $ctrl.queryModel = function () {
    return UserService.queryExcludeUserGroups($ctrl.user._id, $ctrl.searchText)
  };

  $ctrl.addToUser = function (instance) {
    if(!instance) return;
    if(!GroupService.isGroupInUser($ctrl.user, instance)){
      $ctrl.user.groups.push(instance);
    }
  };

  $log.log('AutocompleteContactController load');
}
