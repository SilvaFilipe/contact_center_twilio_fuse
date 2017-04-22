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
        dom       : 'rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
        pagingType: 'simple',
        pageLength: 50,
        autoWidth : false,
        responsive: true
      };
      vm.dtInstance = {};

      // customize search box
      var searchBox = angular.element('body').find('#admin-users-search');

      if ( searchBox.length > 0 )
      {
        searchBox.on('keyup', function (event)
        {
          vm.dtInstance.DataTable.search(event.target.value);
          vm.dtInstance.DataTable.search(event.target.value).draw();
        });
      }

      var apiUrl = $rootScope.apiBaseUrl;

      //get all users
      $http.get(apiUrl + 'api/users', {withCredentials: true})
        .then(function (response) {
          console.log("fetched all users");
          vm.users = response.data;
        });

      // Methods
      vm.gotoAddUser = gotoAddUser;
      vm.gotoEditUser = gotoEditUser;
      /**
       * Go to add user
       */
      function gotoAddUser()
      {
        $state.go('app.admin.users.add');
      }

      /**
       * Go to product detail
       *
       * @param id
       */
      function gotoEditUser(id)
      {
        $state.go('app.admin.users.edit', {id: id});
      }

    }
})();
