'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('GroupService', GroupService);

  /** @ngInject */
  function GroupService($http, $resource, $q, authService, $rootScope) {
    var apiUrl = $rootScope.apiBaseUrl + 'api';

    var GroupService = {

      getAll: function getAll() {
        return $http.get(apiUrl + '/groups')
          .then(function (response) {
            return response.data;
          });
      },
      getGroup: function getGroup(id) {
        return $http.get(apiUrl + '/groups/' + id)
          .then(function (response) {
            return response.data;
          });
      },
      create: function create(group) {
        return $http.post(apiUrl + '/groups', group)
          .then(function (response) {
            return response.data;
          })
      },
      update: function update(id, group) {
        return $http.put(apiUrl + '/groups/' + id, group)
          .then(function (response) {
            return response.data;
          })
          .catch(function (response) {
            console.log(response);
          })
      },
      //Non-Async methods
      isUserInGroup: function (group, user) {
        return group.users.some(function (u) {
          console.log(u._id, user._id);
          return (u._id === user._id);
        })
      },

      isGroupInUser: function (user, group) {
        return user.groups.some(function (g) {
          console.log(g._id, group._id);
          return (g._id === group._id);
        })
      }
    };

    return GroupService;
  }
})();
