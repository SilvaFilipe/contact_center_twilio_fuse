'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('UserService', UserService);

  /** @ngInject */
  function UserService($http, $resource, $q, authService) {

    var UserService = {

      getCurrentUser: function getCurrentUser() {
        return authService.loggedInUser || null;
      },
      getOwnCalls: function getOwnCalls(page) {
        page = page ? page : 1;
        return $http({
          url: '/api/users/' + UserService.getCurrentUser()._id + '/calls/' + page,
          method: 'GET'
        }).then(function (response) {
          return response.data;
        });
      },
      usersWithStars: function usersWithStars() {
        return UserService.$resource.query().$promise.then(function (users) {
          users = users.map(function (user) {
            user.starred = user.starredBy.findIndex(function (starredBy) {
                return starredBy.userId == authService.loggedInUser._id && starredBy.starred;
              }) > -1;
            return user;
          });

          return users;
        });
      },
      starUser: function starUser(user, starStatus) {
        return $http({
          url: '/api/users/' + user._id + '/star',
          method: 'POST',
          data: {
            starred: starStatus
          }
        });
      },

      $resource: $resource('/api/users/:id/:routeAction', {id: '@id', routeAction: '@routeAction'}, {
        star: {
          method: 'POST',
          params: {
            routeAction: 'star'
          }
        },
        update: {
          method: 'PUT' // this method issues a PUT request
        }
      })

    };

    return UserService;
  }
})();
