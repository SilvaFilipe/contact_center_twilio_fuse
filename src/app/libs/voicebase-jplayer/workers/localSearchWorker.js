(function () {
  "use strict";
  if ('function' === typeof importScripts) {

    importScripts('../lib/fuse.min.js', 'localSearchHelper.js');

    self.onmessage = function (e) {
      var results = localSearchHelper.localTranscriptSearch(e.data.transcript, e.data.terms, e.data.isApi2_0);
      self.postMessage({results: results});
    };
  }
})();
