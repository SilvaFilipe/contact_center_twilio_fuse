'use strict';

(function () {
  'use strict';

  angular.module('app.filters').filter('escapeRegex', escapeRegex);

  /** @ngInject */
  function escapeRegex() {
    return function(str){
      if (str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
      }
    }
  }
})();
