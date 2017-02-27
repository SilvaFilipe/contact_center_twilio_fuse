(function () {
  'use strict';

  angular
    .module('app.services')
    .factory('UserService', UserService);

  /** @ngInject */
  function UserService($http, $resource, $q) {

    var UserService = {
      usersWithStars: function () {

        return UserService.$resource.query().$promise
          .then(function(users){
            users = users.map(function (user) {

              user.starred = user.starredBy.findIndex((starredBy) => starredBy.userId == req.user._id ) > -1;

              return user;
            });
            return users;
          })
      },
      starUser: function (user) {
        var defer = $q.defer();

        user.starred = !user.starred;
        user.id = user._id;
        user.$update(function(res){
          defer.resolve(res)
        });

        return defer.promise;
      },

      $resource:  $resource('/api/users/:id', {id: '@id'},
        {
          star: {
            method: 'POST',
            params: {
              star: true
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
