(function () {
  'use strict';

  angular
    .module('app.directives')
    .directive('avatarImage', avatarImage);

  /** @ngInject */
  function avatarImage() {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        console.log('avatarImage');
        attrs.$observe('ngSrc', function (oldVal, newVal) {
          if(!newVal){
            attrs.$set('src', 'assets/images/avatars/profile.jpg');
          }
        })
      }
    }
  }
})();
