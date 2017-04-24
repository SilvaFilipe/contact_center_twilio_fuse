'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('QueueService', QueueService);

  /** @ngInject */
  function QueueService($http, $resource, $q, authService, $rootScope) {
    var apiUrl = $rootScope.apiBaseUrl + 'api';

    var QueueService = {

      getAll: function getAll() {
        return $http.get(apiUrl + '/queues')
          .then(function (response) {
            return response.data;
          });
      },
      getQueue: function getQueue(id) {
        return $http.get(apiUrl + '/queues/' + id)
          .then(function (response) {
            return response.data;
          });
      },
      create: function create(queue) {
        return $http.post(apiUrl + '/queues', queue)
          .then(function (response) {
            return response.data;
          })
      },
      update: function update(id, queue) {
        console.log('am i passing', queue)
        return $http.put(apiUrl + '/queues/' + id, queue)
          .then(function (response) {
            return response.data;
          })
          .catch(function (response) {
            console.log(response);
          })
      }
    };

    return QueueService;
  }
})();
