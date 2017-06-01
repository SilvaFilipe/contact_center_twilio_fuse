(function ()
{
    'use strict';

    angular
        .module('app.left-quick-panel')
        .controller('LeftQuickPanelController', LeftQuickPanelController);

    /** @ngInject */
    function LeftQuickPanelController($scope, $rootScope, UserService)
    {
        var vm = this;

        // Data
        vm.date = new Date();
        vm.settings = {
            notify: true,
            cloud : false,
            retro : true
        };

        if (!angular.isDefined($rootScope.leftPanelTabIndex)) {
          vm.tabIndex = $rootScope.leftPanelTabIndex;
        }
        else vm.tabIndex = 0;

        $scope.$watch(function () {
          return $rootScope.leftPanelTabIndex
        }, function (value) {
          vm.tabIndex = value;
        }, true);

        $scope.$watch(function () {
          return vm.tabIndex
        }, function (value) {
          $rootScope.leftPanelTabIndex = value;
        }, true);

        activate();


        function activate(){

        }
        // Methods

        //////////
    }

})();
