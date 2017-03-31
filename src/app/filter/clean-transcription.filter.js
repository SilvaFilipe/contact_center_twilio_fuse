'use strict';

(function () {
  'use strict';

  angular.module('app.filters').filter('cleanTranscription', cleanTranscription);

  /** @ngInject */
  function cleanTranscription() {
    return function(value) {
      return value.replace(/Agent:|Caller:/g, '');
    };
  }
})();
