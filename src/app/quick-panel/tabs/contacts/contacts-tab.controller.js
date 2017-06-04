(function () {
  'use strict';

  angular
    .module('app.callcenterApplication')
    .controller('ContactsTabController', ContactsTabController);

  /** @ngInject */
  function ContactsTabController($scope, $rootScope, ContactService) {
    var vm = this;
    vm.contacts = [];

    vm.makeCall = makeCall;

    activate();

    function activate() {
      loadContacts();

      $scope.$on('quickpanel.contacts.reload', function () {
        loadContacts();
      })
    }

    function loadContacts() {
      ContactService.getOwnContacts()
        .then(function (contacts) {
          vm.contacts = contacts;
        });
    }

    function makeCall(contact) {
      if (!contact.phone) return;
      $rootScope.$broadcast('CallPhoneNumber', {phoneNumber: contact.phone});
    }
  }

})();
