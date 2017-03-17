(function ()
{
    'use strict';

    angular
        .module('app.left-quick-panel')
        .controller('LeftQuickPanelController', LeftQuickPanelController);

    /** @ngInject */
    function LeftQuickPanelController(CallService)
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
          CallService.getOwnCalls()
            .then(function(calls){
              console.log(calls);
              vm.calls = calls;
            })
        }
        // Methods

        //////////
    }

})();
