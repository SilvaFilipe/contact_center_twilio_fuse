angular.module('app.components')
  .component('contactModal', {
    templateUrl: 'app/components/contact-modal/contact-modal.html',
    controller: ContactModalController,
    bindings: {
      group: '='
    }
  });

/** @ngInject */
function ContactModalController($log, $rootScope, $mdDialog, ContactService) {
  var $ctrl = this;

  $ctrl.showDialog = showDialog;
  $ctrl.addContact = addContact;

  function addContact(){

  }

  function showDialog($event) {
    var parentEl = angular.element(document.body);
    $mdDialog.show({
      parent: parentEl,
      targetEvent: $event,
      templateUrl: 'app/components/contact-modal/contact-modal-card.html',
      locals: {},
      controllerAs: '$ctrl',
      bindToController: true,
      controller: DialogController
    })
      .then(function (contact) {
        $rootScope.$broadcast('contactModal.created', {
          contact: contact
        });
      });



    function DialogController($scope, $mdDialog) {
      var $ctrl = this;
      $ctrl.contact = {};

      $ctrl.addContact = function () {
        ContactService.create($ctrl.contact)
          .then(function (contact) {
            $mdDialog.hide(contact)
          })
      };

      $scope.closeDialog = function () {
        $mdDialog.hide();
      }
    }
  }

  $log.log('ContactModalController load');
}
