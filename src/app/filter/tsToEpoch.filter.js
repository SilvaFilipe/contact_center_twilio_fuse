'use strict';

(function () {
  'use strict';

  angular.module('app.filters').filter('tsToEpoch', tsToEpochFilter);

  /** @ngInject */
  function tsToEpochFilter() {
    return function (input) {
      if(angular.isString(input)){
        return new Date(input).getTime();
      }else{
        return input;
      }
    };
  }
})();
