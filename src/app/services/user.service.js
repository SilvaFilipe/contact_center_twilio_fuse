'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('UserService', UserService);

  /** @ngInject */
  function UserService($http, $resource, $q, authService, $rootScope) {
    var apiUrl = $rootScope.apiBaseUrl;

    var UserService = {

      getCurrentUser: function getCurrentUser() {
        return authService.loggedInUser || null;
      },

      getAll: function getAll() {
        return $http.get(apiUrl + 'api/users', {withCredentials: true})
          .then(function (response) {
            return response.data;
          });
      },

      query: function query(query) {
        if(query.length == 0) return [];

        return $http.get(apiUrl + 'api/users?search=' + query, {withCredentials: true})
          .then(function (response) {
            return response.data;
          });
      },
      queryExcludeGroupUsers: function query(groupId, query) {
        if(query.length == 0) return [];

        return $http.get(apiUrl + 'api/users/excludeGroupUsers/'+ groupId +'?search=' + query, {withCredentials: true})
          .then(function (response) {
            return response.data;
          });
      },

      getOwnCalls: function getOwnCalls(search, page) {
        search = search ? search : '';
        page = page ? page : 1;
        return $http({
          url: apiUrl + 'api/users/' + UserService.getCurrentUser()._id + '/calls/' + page + '?search=' + search,
          method: 'GET',
          withCredentials: true
        }).then(function (response) {
          return response.data;
        });
      },
      getOwnVoicemails: function getOwnVoicemails(search, page) {
        search = search ? search : '';
        page = page ? page : 1;
        return $http({
          url: apiUrl + 'api/users/' + UserService.getCurrentUser()._id + '/voicemails/' + page + '?search=' + search,
          method: 'GET'
        }).then(function (response) {
          return response.data;
        });
      },
      usersWithStars: function usersWithStars() {
        return UserService.$resource.query().$promise.then(function (users) {
          users = users.map(function (user) {
            user.starred = user.starredBy.findIndex(function (starredBy) {
                return starredBy.userId === authService.loggedInUser._id && starredBy.starred;
              }) > -1;
            return user;
          });

          return users;
        });
      },
      starUser: function starUser(user, starStatus) {
        return $http({
          url: apiUrl + 'api/users/' + user._id + '/star',
          method: 'POST',
          data: {
            starred: starStatus
          },
          withCredentials: true
        });
      },

      $resource: $resource(apiUrl + 'api/users/:id/:routeAction', {id: '@id', routeAction: '@routeAction'}, {
        star: {
          method: 'POST',
          params: {
            routeAction: 'star'
          },
          withCredentials: true
        },
        update: {
          method: 'PUT' // this method issues a PUT request
        }
      })

    };

    return UserService;
  }
})();
