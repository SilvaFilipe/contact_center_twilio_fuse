'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('UserService', UserService);

  /** @ngInject */
  function UserService($http, $resource, $q, authService, $rootScope, $window) {
    var apiUrl = $rootScope.apiBaseUrl;

    var UserService = {

      getCurrentUser: function getCurrentUser() {
        return authService.loggedInUser || JSON.parse($window.sessionStore.currentUser) || null;
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

      update: function update(id, user) {
        var payload = angular.copy(user);
        return $http.put(apiUrl + 'api/users/' + id, payload)
          .then(function (response) {
            return response.data;
          })
          .catch(function (response) {
            console.log(response);
          })
      },

      removeQueue: function removeQueue(user, queue) {
        return $http.post(apiUrl + 'api/users/' + user._id + '/removeQueue/' + queue._id);
      },

      removeMultipleUsersFromQueue: function removeMultipleUsersFromQueue(users, queue) {
        console.log('users', users);
          var userPromises = users.map(function (user) {
              return UserService.removeQueue(user, queue)
          });
        console.log(userPromises)
          return $q.all(userPromises);
      },
      queryExcludeGroupUsers: function query(groupId, query) {
        //if(query.length == 0) return [];

        return $http.get(apiUrl + 'api/users/excludeGroupUsers/'+ groupId +'?search=' + query, {withCredentials: true})
          .then(function (response) {
            return response.data;
          });
      },
      queryExcludeQueueUsers: function query(queueId, query) {
        //if(query.length == 0) return [];

        return $http.get(apiUrl + 'api/users/excludeQueueUsers/'+ queueId +'?search=' + query, {withCredentials: true})
          .then(function (response) {
            return response.data;
          });
      },

      queryExcludeUserGroups: function query(userId, query) {
        return $http.get(apiUrl + 'api/users/excludeUserGroups/'+ userId +'?search=' + query, {withCredentials: true})
          .then(function (response) {
            return response.data;
          });
      },

      queryExcludeUserQueues: function query(userId, query) {
        return $http.get(apiUrl + 'api/users/excludeUserQueues/'+ userId +'?search=' + query, {withCredentials: true})
          .then(function (response) {
            return response.data;
          });
      },

      isQueueInUser: function (user, queue) {
        return user.queues.some(function (q) {
          return (q._id === queue._id);
        })
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
