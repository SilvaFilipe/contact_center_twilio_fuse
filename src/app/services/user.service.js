(function () {
  'use strict';

  angular
    .module('app.services')
    .factory('UserService', UserService);

  /** @ngInject */
  function UserService($http, $resource) {
    return $resource('/api/users/:id', {id: '@id'});
  }
})();
