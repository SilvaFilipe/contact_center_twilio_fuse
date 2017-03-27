(function () {
  'use strict';

  angular
    .module('app.directives')
    .directive('dynamic', dynamic);

  /** @ngInject */
  function dynamic($compile) {
    return {
      restrict: 'A',
      replace: true,
      link: function (scope, ele, attrs) {
        scope.$watch(attrs.dynamic, function(html) {
          ele.html(html);
          $compile(ele.contents())(scope);
        });
      }
    };
  }
})();
