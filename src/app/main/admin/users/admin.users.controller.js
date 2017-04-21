(function ()
{
    'use strict';

    angular
        .module('app.admin')
        .controller('AdminUsersController', AdminUsersController);

    /** @ngInject */
    function AdminUsersController($state, $http, $rootScope)
    {
      var vm = this;
      vm.dtOptions = {
        dom       : '<"top"f>rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
        pagingType: 'simple',
        pageLength: 50,
        autoWidth : false,
        responsive: true
      };

      var apiUrl = $rootScope.apiBaseUrl;

      //get all users
      $http.get(apiUrl + 'api/users', {withCredentials: true})
        .then(function (response) {
          console.log("fetched all users");
          vm.users = response.data;
        });

    }
})();
