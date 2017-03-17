'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('CallService', CallService);

  /** @ngInject */
  function CallService($http, $resource, $q, UserService) {

    var CallService = {
      getOwnCalls: function getOwnCalls() {

        return $http({
          url: '/api/users/' + UserService.getCurrentUser()._id + '/calls',
          method: 'GET'
        }).then(function (response) {
          return response.data;
        });

      }
    };

    return CallService;
  }
})();
