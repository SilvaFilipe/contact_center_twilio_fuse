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
      newUser     : newUser,
      updateUser  : updateUser,
      createUser  : createUser,
      didSearch   : didSearch,
      didPurchase : didPurchase
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
          deferred.resolve(response.data);
        });

      return deferred.promise;

    }

    /**
     * Make new user
     */
    function  newUser() {
      return {};
    }

    /**
     * Update user
     */
    function updateUser(id, user) {
      var deferred = $q.defer();
      $http.put(apiUrl + 'api/users/' + id, user, {withCredentials: true})
        .then(function (response) {
          deferred.resolve(response);
        }, function (err) {
          deferred.reject(err);
        });

      return deferred.promise;
    }
    /**
     * Create user
     */
    function createUser(user) {
      var deferred = $q.defer();
      $http.post(apiUrl + 'auth/register', user, {withCredentials: true})
        .then(function (response) {
          deferred.resolve(response);
        }, function (err) {
          deferred.reject(err);
        });

      return deferred.promise;
    }

    /**
     * search did
     */
    function didSearch(areaCode) {
      var deferred = $q.defer();
      $http.get(apiUrl + 'api/admin/didSearch/' + areaCode, {withCredentials: true})
        .then(function (response) {
          deferred.resolve(response);
        }, function (err) {
          deferred.reject(err);
        });

      return deferred.promise;

    }

    /**
     * purchase did
     */
    function didPurchase (data) {
      var deferred = $q.defer();
      $http.post(apiUrl + 'api/admin/didPurchase', data, {withCredentials: true})
        .then(function (response) {
          deferred.resolve(response);
        }, function (err) {
          deferred.reject(err);
        });

      return deferred.promise;
    }
  }

})();
