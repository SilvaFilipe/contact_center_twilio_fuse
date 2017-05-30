'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('DidService', DidService);

  /** @ngInject */
  function DidService($http, $rootScope) {
    var apiUrl = $rootScope.apiBaseUrl + 'api';

    var DidService = {

      getAll: function getAll() {
        return $http.get(apiUrl + '/dids')
          .then(function (response) {
            return response.data;
          });
      },

    };

    return DidService;
  }
})();
