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
  var items = [];

  $ctrl.queryModel = function () {
    return UserService.queryExcludeUserGroups($ctrl.user._id, $ctrl.searchText).then(function (res) {
      items = res.filter(function(val) {
        for( var i=0, len=$ctrl.user.groups.length; i<len; i++ ){
          if( $ctrl.user.groups[i]._id === val._id ) {
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
    if (!angular.isDefined($ctrl.user.groups)) {
      $ctrl.user.groups = [];
    }
    if(!GroupService.isGroupInUser($ctrl.user, instance)){
      $ctrl.user.groups.push(instance);
    }
    $ctrl.selectedItem = '';
    $('#userGroupInput').trigger('blur');
  };

  $log.log('AutocompleteContactController load');
}
