'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('DidService', DidService);

  /** @ngInject */
  function DidService($http, $rootScope, $q, AdminUserService) {
    var apiUrl = $rootScope.apiBaseUrl + 'api';

    var DidService = {

      getAll: function getAll() {
        return $http.get(apiUrl + '/dids', {withCredentials: true})
          .then(function (response) {
            return response.data;
          });
      },

      getDid: function getDid(id) {
        return $http.get(apiUrl + '/dids/' + id, {withCredentials: true})
          .then(function (response) {
            return response.data;
          }, function (err) {
            console.log(err);
            return err.data;
          });
      },

      updateDid: function updateDid(did) {
        return $http.put(apiUrl + '/dids/' + did._id, did, {withCredentials: true})
          .then(function (response) {
            return response.data;
          }, function (err) {
            console.log(err);
            return err.data;
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
