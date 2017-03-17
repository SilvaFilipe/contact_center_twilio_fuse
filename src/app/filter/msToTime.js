'use strict';

(function () {
  'use strict';

  angular.module('app.filters').filter('msToTime', msToTimeFilter);

  /** @ngInject */
  function msToTimeFilter(seconds) {
    seconds = Math.floor((seconds / 60) % 60);
    var minutes = Math.floor((seconds / (60 * 60)) % 60);

    return minutes + ":" + seconds;
  }
})();
