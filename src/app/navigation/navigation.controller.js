(function ()
{
    'use strict';

    angular
        .module('app.navigation')
        .controller('NavigationController', NavigationController);

    /** @ngInject */
    function NavigationController($scope, EnvironmentConfig)
    {
        var vm = this;
        if (angular.isDefined(EnvironmentConfig.MenuLogoImageUrl))
          vm.MenuLogoImageUrl = EnvironmentConfig.MenuLogoImageUrl;
        else vm.MenuLogoText = EnvironmentConfig.MenuLogoText;

        if (angular.isDefined(EnvironmentConfig.MenuLogoTextUrl))
          vm.MenuLogoTextUrl = EnvironmentConfig.MenuLogoTextUrl;
        else vm.LogoLetter = EnvironmentConfig.LogoLetter;


        // Data
        vm.bodyEl = angular.element('body');
        vm.folded = false;
        vm.msScrollOptions = {
            suppressScrollX: true
        };

        // Methods
        vm.toggleMsNavigationFolded = toggleMsNavigationFolded;

        //////////

        /**
         * Toggle folded status
         */
        function toggleMsNavigationFolded()
        {
            vm.folded = !vm.folded;
        }

        // Close the mobile menu on $stateChangeSuccess
        $scope.$on('$stateChangeSuccess', function ()
        {
            vm.bodyEl.removeClass('ms-navigation-horizontal-mobile-menu-active');
        });
    }

})();
