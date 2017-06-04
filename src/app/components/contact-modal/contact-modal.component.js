angular.module('app.components')
  .component('contactModal', {
    templateUrl: 'app/components/contact-modal/contact-modal.html',
    controller: ContactModalController,
    bindings: {
      group: '='
    }
  })
  .directive("fileread", ['$parse',function ($parse) {
    return {
      link: function (scope, element, attributes) {

        var modelGet = $parse(attributes.fileread);
        var modelSet = modelGet.assign;
        //var onChange = $parse(attributes.onChange);

        var updateModel = function () {
          console.log('updating scope directive', scope);
          scope.$apply(function () {
            console.log(element[0].files[0])
            modelSet(scope, element[0].files[0]);
            //onChange(scope);
          });
        };

        element.bind('change', updateModel);
      }
    }
  }])
  .directive('mediaPreview', function() {

    var directive = {
      restrict: 'E',
      scope: { model: '=?' },
      template:   '<input type="file" accept="image/*,video/*,audio/*" class="fileInput ng-hide" ng-model="model" />' +
      '<md-button class="uploadButton md-raised md-primary"> Choose File </md-button>' +
      '<md-input-container  md-no-float>    <input class="textInput" ng-model="fileName" type="text" placeholder="No file chosen" ng-readonly="true"></md-input-container>',
      link: _link
    };

    return directive;

    function _link(scope, elem, attrs) {
      var input = elem.find('.fileInput');
      var button = elem.find('.uploadButton');
      var textInput = elem.find('.textInput');

      if (input.length && button.length) {
        button.click(function (e) {
          input.click()
        });
        textInput.click(function(e) {
          input.click();
        });
      }
      var $input = angular.element( elem.children().eq(0) );
      // get the model controller
      var ngModel = $input.controller('ngModel');

      // the preview container
      var container;

      var fallbackImage = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAMDAwMDAwQEBAQFBQUFBQcHBgYHBwsICQgJCAsRCwwLCwwLEQ8SDw4PEg8bFRMTFRsfGhkaHyYiIiYwLTA+PlQBAwMDAwMDBAQEBAUFBQUFBwcGBgcHCwgJCAkICxELDAsLDAsRDxIPDg8SDxsVExMVGx8aGRofJiIiJjAtMD4+VP/CABEIAGAAYAMBIgACEQEDEQH/xAAbAAEBAQADAQEAAAAAAAAAAAAACAcEBQYJA//aAAgBAQAAAAD6QAADwOO8XevYAYbJIuDSARTloq7egSXhYp6igRLmI1a0gTDOopSlAfj87eveqv4BFOWtcswHV4jLIpzdO4eHwfE+GDlbRvkIgA//xAAXAQEBAQEAAAAAAAAAAAAAAAAAAwIB/9oACAECEAAAAKtMm6o5bqlh26HHboctoZ//xAAXAQADAQAAAAAAAAAAAAAAAAAAAQMC/9oACAEDEAAAAMCGGYl2ZiW0KDsxRLOWAN//xAA2EAABAwIDBQQIBgMAAAAAAAABAgMEBREGByEAEiAxURATQYEIFCIjMGFxkSQmMkBCgmJyof/aAAgBAQABPwD9hiTMvCWGVrakzO/kp0MaOnvFg9DyCdqj6QNQUtQptHYQnwVIWpwnyTu22gekBXEOj16lQnW/EMlbSvuor2wljihYyiKdgu7rqdHYztg4g/S+o+Y+BnJjuTh+KzR6c6pqXMbK3XUmym2b29noVEc9iSo3PPtBKSCDYjkRtlXiGRiPB8Z6SvvJEVa4zqzqVluxST87KF+POZxxeYFRC+TbUdKPp3aTw5AH8t1QdKhf7tp48+aYiPiWFOQpP4uFZQ8d5o2v9lcPo+SUKgVuNdO8l9le742UCL/8484XZa8f1Jt51SktJZSyDyQgtpVYeZ4cl5MhjHsNtsqCH2JCHR1SEFYv5p487MGVV+rorsGI4/HVEAlFA3y2Wr+0oD+NuAAqNhz2yYwJWabVnK1VIbkVAjFEdDuiypwi6t3mLAcciO1KjvMOp3m3UKQtPVKxY7VenuUmqToDmq4kl1lR6ltRTftwJDM/GNCZ3N4GoMqUn/FtQUr4Ob1Tw/UsVvKpbLiXmVFma5oEPONm28mx8ie3KLEeHMPVtZqTDpky1NMR5ACShgKNlFVyLX6jjqtbpFDj+s1KYxFa8FOrAv8AIDmT9NsV550hMCTGoLT7slbZS3JWju0IvpvAE3JHhe2xJUVEquTqSeDB+eFMap0SHXmpIfZbCDKQkOJWBoFKF7362vtR6/RsQR+/pk1iU347itR/snmnz7cQ5iYSwyVtzJ6VSE847PvXL9CBon+xG2JM9azO32aLGRBaOgeXZx4/Qck7T6jUKpIVJnSXZDyubjqys/c8cKfNp0hEmJJdjPJ/S40soUPMbYbzzr9O3GawwiosjTvRZt0Dy0VthzMbCWKChqJOS1IVyjP+7cv0F9Ff1J2JKjc6k8z8MEpNxoRyO3//xAAdEQEAAwACAwEAAAAAAAAAAAABAAIQICESMTJB/9oACAECAQE/AMK2fyNbB64UBdt1Z2n1t/rRTGKugsOiMRMKV4+BP//EABsRAQACAwEBAAAAAAAAAAAAAAEAEAISISAx/9oACAEDAQE/AK2IZD4zULx+Xn8vB5aDR1gBexHrDjDIa3fO7P/Z";

      // get custom class or set default
      var previewClass = attrs.previewClass || 'md-avatar avatar contact-avatar';

      // get custom class or set default
      var containerClass = attrs.containerClass || 'media-container';

      if( typeof attrs.multiple !== 'undefined' && attrs.multiple != 'false' ) {
        $input.attr('multiple', true);
      }

      // as default if nothing is specified or
      // the element specified is not a valid html
      // element: create the default media container
      // and append before input element
      if( !attrs.previewContainer || ( !document.getElementById(attrs.previewContainer) && !angular.isElement(attrs.previewContainer) ) ) {

        // create container
        container = angular.element( document.createElement('div') );

        // append before elem
        elem.parent()[0].insertBefore(container[0], elem[0]);

      } else {

        // get the container
        container = angular.isElement(attrs.previewContainer) ? attrs.previewContainer : angular.element(document.getElementById(attrs.previewContainer));
      }

      // add default class
      container.addClass(containerClass);

      // the change function
      function onChange(e) {
        // get files from target
        var files = $input[0].files;

        // update model value
        attrs.multiple ? ngModel.$setViewValue(files) : ngModel.$setViewValue(files[0]);

        // reset container
        container.empty();

        // check if there are files to read
        if( files && files.length ) {

          // start the load process for each file
          angular.forEach(files, function(data, index) {

            // init variables
            var $reader = new FileReader(), result, $mediaElement;

            // set fallback image on error
            $reader.onloaderror = function (e) {
              result = fallbackImage;
            }

            // set resulting image
            $reader.onload = function (e) {
              result = e.target.result;
            }

            // when file reader has finished
            // add the source to element and append it
            $reader.onloadend = function(e) {

              // if audio
              if( result.indexOf('data:audio') > -1 ) {

                $mediaElement = angular.element( document.createElement('audio') );
                $mediaElement.attr('controls', 'true');

              } else if( result.indexOf('data:video') > -1 ) {

                $mediaElement = angular.element( document.createElement('video') );
                $mediaElement.attr('controls', 'true');

              } else {

                $mediaElement = angular.element( document.createElement('img') );

              }

              // add the source
              $mediaElement.attr('src', result);
              // add the element class
              $mediaElement.addClass(previewClass);
              // append to the preview container
              container.append( $mediaElement );
              scope.$apply(function () {
                scope.fileName = data.name;
              });

            };

            // read file
            $reader.readAsDataURL( data );
          });

        }

      }

      scope.$watch(function () {
        return ngModel.$modelValue
      }, function () {
        if(angular.isString(ngModel.$modelValue)){
          var $mediaElement = angular.element( document.createElement('img') );
          $mediaElement.attr('src', ngModel.$modelValue);
          $mediaElement.addClass(previewClass);
          container.append( $mediaElement );
        }
      });


      // clear the preview and the input on click
      scope.clearPreview = function () {
        // clear the input value
        $input.val('');
        //ngModel.$setViewValue(undefined);
        // reset container
        container.empty();
      };

      // bind change event
      elem.on('change', onChange);

      // unbind event listener to prevent memory leaks
      scope.$on('$destroy', function () {
        elem.off('change', onChange);
      });

    }

  })
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
        console.log(attributes)
        scope.$watch('ngThumb',function () {
          //var params = scope.$eval(attributes.ngThumb);
          var params = {
            height: 80,
            width: 80,
            file: scope.$eval(attributes.ngThumb).file
          };
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
function ContactModalController($log, $scope, $mdDialog, ContactService, $q) {
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
      $ctrl.closeDialog = function(){
        $mdDialog.cancel({success: false});
      };

      $ctrl.addContact = function () {
        var fileObj = $ctrl.contact.avatarUrl;

        ContactService.create($ctrl.contact)
          .then(function (contact) {
            if(fileObj){//only proceed to upload when there's an actual avatar set
              return ContactService.uploadAvatar(contact._id, fileObj);
            }else{
              return $q.resolve({success: true, contact: contact});
            }
          })
          .then(function (response) {
            if(response.success){
              $mdDialog.hide(response.contact);
            }else{
              $mdDialog.cancel(response);
            }
          });
      };

      $scope.closeDialog = function () {
        $mdDialog.hide();
      }
    }
  }

  $log.log('ContactModalController load');
}
