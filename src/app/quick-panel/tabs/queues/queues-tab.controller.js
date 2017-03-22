(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication')
        .controller('QueueTabController', QueueTabController);

    /** @ngInject */
    function QueueTabController($scope, $rootScope, $log)
    {
      var vm = this;

      $scope.$on('syncClientReady', function (event, data) {
        $rootScope.syncClient.map('taskQueues' )
          .then(function(map) {
            console.log(map);
            $scope.queueData =[];
            map.getItems({ limit: 20 }).then(function(item) {
              for (var x=0; x<item.items.length; x++){
                var queue = item.items[x];
                $scope.queueData.push(queue);
              }
              $scope.$apply();
            });


            map.on('itemUpdated', function(data) {
              $log.log('UPDATED taskQueues');
              console.log(data);
              vm.queueData = data;
            }, function onError(response) {
              console.log(response.data);
            });
          });
      });

    }

})();
