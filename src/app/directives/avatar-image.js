(function () {
  'use strict';

  angular
    .module('app.directives', [])
    .directive('avatarImage', avatarImage);

  /** @ngInject */
  function avatarImage() {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        attrs.$observe('ngSrc', function (oldVal, newVal) {
          if(!newVal){
            attrs.$set('src', 'assets/images/avatars/profile.jpg');
          }
        })
      }
    }
  }
})();
