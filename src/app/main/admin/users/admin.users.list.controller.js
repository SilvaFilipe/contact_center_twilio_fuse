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
        responsive: true,
        scrollY     : 'auto',
        order: [[ 1, "asc" ]],
        columnDefs: [{"orderable": false, "targets": 0}, {"orderable": false, "targets": 5}]
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
    }
})();
