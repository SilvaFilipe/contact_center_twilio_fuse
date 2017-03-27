'use strict';

(function () {
  'use strict';

  angular.module('app.filters').filter('time', time);

  /** @ngInject */
  function time() {
    return function(value) {
      return moment(value).format('HH:mm');
    };
  }
})();
