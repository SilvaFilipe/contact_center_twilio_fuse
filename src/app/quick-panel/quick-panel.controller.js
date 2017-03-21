(function () {
  'use strict';

  angular
    .module('app.quick-panel')
    .controller('QuickPanelController', QuickPanelController);

  /** @ngInject */
  function QuickPanelController(msApi, UserService, $rootScope, $scope, $log) {
    var vm = this;

    // Data
    vm.date = new Date();
    vm.queueData = {};
    vm.settings = {
      notify: true,
      cloud: false,
      retro: true
    };


    activate();

    function activate(){
      UserService.usersWithStars()
        .then(function (users) {
          vm.users = users;
        });



    }

    msApi.request('quickPanel.directory@get', {},
      // Success
      function (response) {
        vm.contacts = response.data;
      }
    );

    msApi.request('quickPanel.user@get', {},
      // Success
      function (response) {
        vm.user = response.data;
      }
    );

    msApi.request('quickPanel.activities@get', {},
      // Success
      function (response) {
        vm.activities = response.data;
      }
    );

    msApi.request('quickPanel.events@get', {},
      // Success
      function (response) {
        vm.events = response.data;
      }
    );

    msApi.request('quickPanel.notes@get', {},
      // Success
      function (response) {
        vm.notes = response.data;
      }
    );

    // Methods

    //////////
  }

})();
