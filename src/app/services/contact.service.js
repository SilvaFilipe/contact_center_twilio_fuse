'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('ContactService', ContactService);

  /** @ngInject */
  function ContactService($http, $rootScope) {
    var apiUrl = $rootScope.apiBaseUrl + 'api';

    var ContactService = {
      create: function create(group) {
        return $http.post(apiUrl + '/contacts', group)
          .then(function (response) {
            return response.data;
          })
      }
    };

    return ContactService;
  }
})();
