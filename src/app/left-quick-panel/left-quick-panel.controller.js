(function ()
{
    'use strict';

    angular
        .module('app.left-quick-panel')
        .controller('LeftQuickPanelController', LeftQuickPanelController);

    /** @ngInject */
    function LeftQuickPanelController(UserService)
    {
        var vm = this;

        // Data
        vm.date = new Date();
        vm.settings = {
            notify: true,
            cloud : false,
            retro : true
        };


        activate();


        function activate(){

        }
        // Methods

        //////////
    }

})();
