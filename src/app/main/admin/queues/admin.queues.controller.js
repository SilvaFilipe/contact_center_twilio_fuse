(function ()
{
    'use strict';

    angular
        .module('app.admin')
        .controller('AdminQueuesController', AdminQueuesController);

    /** @ngInject */
    function AdminQueuesController(QueueService)
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
      var searchBox = angular.element('body').find('#admin-queues-search');

      if ( searchBox.length > 0 )
      {
        searchBox.on('keyup', function (event)
        {
          vm.dtInstance.DataTable.search(event.target.value);
          vm.dtInstance.DataTable.search(event.target.value).draw();
        });
      }

      //get all queues
      QueueService.getAll().then(function (queues) {
          console.log("fetched all queues");
          vm.queues = queues;
        });
    }
})();
