'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('DidService', DidService);

  /** @ngInject */
  function DidService($http, $rootScope, $q, AdminUserService) {
    var apiUrl = $rootScope.apiBaseUrl + 'api';

    var DidService = {

      getAll: function getAll() {
        return $http.get(apiUrl + '/dids')
          .then(function (response) {
            return response.data;
          });
      },

      deleteDids: function deleteDids(dids) {
        var promises = dids.map(function (did) {
          var data = [{id: did.id, sid: did.sid}];
          return AdminUserService.deleteDids(did.userId, data);
        });
        return $q.all(promises);
      }

    };

    return DidService;
  }
})();
