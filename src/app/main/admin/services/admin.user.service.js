(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .factory('AdminUserService', AdminUserService);

  /** @ngInject */
  function AdminUserService($q, $mdToast, $http, $rootScope)
  {
    var apiUrl = $rootScope.apiBaseUrl;

    var service = {
      getUser     : getUser,
      newUser     : newUser
    };

    return service;

    //////////

    /**
     * Get user
     */
    function getUser(id)
    {
      var deferred = $q.defer();
      $http.get(apiUrl + 'api/users/' + id, {withCredentials: true})
        .then(function (response) {
          console.log(response.data);
          deferred.resolve(response.data);
        });

      return deferred.promise;

    }

    /**
     * Make new user
     */
    function  newUser() {
      return [];
    }
  }

})();
