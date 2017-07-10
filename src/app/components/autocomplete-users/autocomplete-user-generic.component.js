angular.module('app.components')
  .component('autocompleteUserGeneric', {
    templateUrl: 'app/components/autocomplete-users/autocomplete-user-generic.html',
    controller: AutocompleteUserGenericController,
    bindings: {
      user: '=',
      onItemSelected: '='
    }
  });

/** @ngInject */
function AutocompleteUserGenericController($log, UserService, AdminDidEditService, orderByFilter) {
  var $ctrl = this;
  var items = [];


  $ctrl.queryModel = function () {
    return UserService.getAll().then(function (res) {
      items = res.filter(function (val) {
        return $ctrl.user._id !== val._id
      });
      return orderByFilter(items, 'firstName');
    }, function (err) {
      console.log(err);
    });
  };

  $ctrl.assignUser = function (instance) {
    AdminDidEditService.assignedUser = instance;
  };

  $log.log('AutocompleteContactController load');
}
