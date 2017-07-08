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
  var items = [];

  $ctrl.queryModel = function () {
    return UserService.queryExcludeGroupUsers($ctrl.group._id, $ctrl.searchText).then(function (res) {
      items = res.filter(function(val) {
        for( var i=0; i < $ctrl.group.users.length; i++ ){
          if( $ctrl.group.users[i]._id === val._id ) {
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

  $ctrl.addToGroup = function (instance) {
    if (!instance) return;
    if (!angular.isDefined($ctrl.group.users)) {
      $ctrl.group.users = [];
    }
    if(!GroupService.isUserInGroup($ctrl.group, instance)){
      $ctrl.group.users.push(instance);
    }
    $ctrl.selectedItem = '';
    $('#groupUserInput').trigger('blur');
  };

  $log.log('AutocompleteContactController load');
}
