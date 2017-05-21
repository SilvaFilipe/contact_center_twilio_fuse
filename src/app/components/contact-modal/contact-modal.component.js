angular.module('app.components')
  .component('contactModal', {
    templateUrl: 'app/components/contact-modal/contact-modal.html',
    controller: ContactModalController,
    bindings: {
      group: '='
    }
  })
  .directive("fileread", [function () {
    return {
      scope: {
        fileread: "="
      },
      link: function (scope, element, attributes) {
        element.bind("change", function (changeEvent) {
          scope.$apply(function () {
            scope.fileread = null;
          });
          scope.$apply(function () {
            scope.fileread = changeEvent.target.files[0];
          });
        });
      }
    }
  }])
  .directive("filereadChange", [function () {
    return {
      scope: {
        filereadChange: "="
      },
      link: function (scope, element, attributes) {
        element.bind("change", function (changeEvent) {
          scope.$apply(function () {
            scope.filereadChange(changeEvent);
          });
        });
      }
    }
  }])
  .directive('ngThumb', ['$window', function ($window) {
    var helper = {
      support: !!($window.FileReader && $window.CanvasRenderingContext2D),
      isFile: function (item) {
        return angular.isObject(item) && item instanceof $window.File;
      },
      isImage: function (file) {
        var type = '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';
        return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
      }
    };

    return {
      restrict: 'A',
      template: '<canvas/>',
      link: function (scope, element, attributes) {
        if (!helper.support) return;

        attributes.$observe('ngThumb',function () {
          var params = scope.$eval(attributes.ngThumb);
          console.log(params);
          if (!helper.isFile(params.file)) return;
          if (!helper.isImage(params.file)) return;
          console.log('here');
          var canvas = element.find('canvas');
          var reader = new FileReader();

          reader.onload = onLoadFile;
          reader.readAsDataURL(params.file);

          function onLoadFile(event) {
            var img = new Image();
            img.onload = onLoadImage;
            img.src = event.target.result;
          }

          function onLoadImage() {
            console.log('onloadimage');
            var width = params.width || this.width / this.height * params.height;
            var height = params.height || this.height / this.width * params.width;
            canvas.attr({width: width, height: height});
            canvas[0].getContext('2d').drawImage(this, 0, 0, width, height);
          }
        })
      }
    }
  }]);

/** @ngInject */
function ContactModalController($log, $scope, $mdDialog, ContactService) {
  var $ctrl = this;

  $ctrl.showDialog = showDialog;
  $ctrl.avatarChange = avatarChange;

  function avatarChange(event){
    console.log(event);
    console.log($ctrl.contact.avatarUrl);
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
        console.log(contact);
        $scope.$emit('contactModal.created', {
          contact: contact
        });
      })
      .catch(function (response) {
        console.log('error', JSON.stringify(response));
      });

    function DialogController($scope, $mdDialog) {
      var $ctrl = this;
      $ctrl.contact = {};

      $ctrl.addContact = function () {
        var fileObj = $ctrl.contact.avatarUrl;

        ContactService.create($ctrl.contact)
          .then(function (contact) {
            return ContactService.uploadAvatar(contact._id, fileObj);
          })
          .then(function (response) {
            if(response.success){
              $mdDialog.hide(response.contact);
            }else{
              $mdDialog.cancel(response);
            }

          })
      };

      $scope.closeDialog = function () {
        $mdDialog.hide();
      }
    }
  }

  $log.log('ContactModalController load');
}
