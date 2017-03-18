'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('CustomCallService', CustomCallService);

  /** @ngInject */
  function CustomCallService($http, $resource, $q, UserService) {

    var CustomCallService = {
      getOwnCalls: function getOwnCalls() {

        return $http({
          url: '/api/users/' + UserService.getCurrentUser()._id + '/calls',
          method: 'GET'
        }).then(function (response) {
          return response.data;
        });

      }
    };

    return CustomCallService;
  }
})();
