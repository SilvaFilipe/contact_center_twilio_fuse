'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('UserService', UserService);

  /** @ngInject */
  function UserService($http, $resource, $q, authService) {

    var UserService = {
      usersWithStars: function usersWithStars() {

        return UserService.$resource.query().$promise.then(function (users) {
          users = users.map(function (user) {

            user.starred = user.starredBy.findIndex(function (starredBy) {
                console.log(starredBy);
                return starredBy.userId == authService.loggedInUser._id;
              }) > -1;

            return user;
          });
          return users;
        });
      },
      starUser: function starUser(user, starStatus) {
        var defer = $q.defer();

        user.starred = !user.starred;
        user.id = user._id;
        user.$star({
          id: user.id,
          starred: starStatus
        }, function (r) {
          console.log(r)
          defer.resolve(r);
        }, function (r) {
          console.log(r)
          defer.reject(r);
        });

        return defer.promise;
      },

      $resource: $resource('/api/users/:id/:routeAction', { id: '@id', routeAction: '@routeAction' }, {
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
