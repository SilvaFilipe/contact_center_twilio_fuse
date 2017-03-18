'use strict';

(function () {
  'use strict';

  angular.module('app.filters').filter('secsToDuration', secsToDurationFilter);

  /** @ngInject */
  function secsToDurationFilter() {
    return function (seconds) {
      var minutes = Math.floor(seconds / 60);
      seconds = seconds % 60;
      return (minutes < 10 ? '0' + minutes : minutes ) + ":" + (seconds < 10 ? '0' + seconds : seconds );
    }
  }
})();
