angular.module('app.components')
  .component('jpPlayerCall', {
    templateUrl: 'app/components/jp-player/jp-player.html',
    controller: JPPlayerController,
    bindings: {
      audioUrl: '=',
      voiceBaseMediaId: '='
    }
  });

/** @ngInject */
function JPPlayerController($element, $timeout) {

  var $ctrl = this;

  $ctrl.$onInit = function () {
    console.log('init', $element)
  };

  $ctrl.$postLink = function () {

    $timeout(function () {
      var $player = $($element).find("#jplayer");

      $player.jPlayer({
        ready: function () {
          $player.jPlayer("setMedia", {
            wav: $ctrl.audioUrl
          });
        },
        swfPath: "js/lib/jplayer",
        supplied: "wav"
      });

      $($element).voicebase({
        playerId: 'jplayer',
        playerType: 'jplayer',
        apiUrl: 'https://apis.voicebase.com/v2-beta/',
        token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIxNDYyMzM0NS02NmIzLTRiYTctODMxNy02N2IyMmViYzY5NTQiLCJ1c2VySWQiOiJhdXRoMHw1ODg2OGNkYTI3YWFkZTU0YzBiNDYwNDgiLCJvcmdhbml6YXRpb25JZCI6IjRlZWExMjMxLTRjYzQtOTkzOS04MTljLTgzMmY1YmRhMzdjMyIsImVwaGVtZXJhbCI6ZmFsc2UsImlhdCI6MTQ4OTMwNjU4MzA1NiwiaXNzIjoiaHR0cDovL3d3dy52b2ljZWJhc2UuY29tIn0.ZbfVFzj2R8wYrCSLxn2kEEljyP8Ua5HrU3oWRTSYZWg',
        mediaID: $ctrl.voiceBaseMediaId,
        apiVersion: '2.0',
        vbsButtons: {
          share: 0,
          comment: 0,
          downloadMedia: 0,
          downloadTranscript: 0,
          remove: 0,
          favorite: 0,
          help: 0,
          evernote: 0,
          edit: !1,
          print: !0,
          orderTranscript: 0,
          prev: 0,
          next: 0,
          fullscreen: 0,
          readermode: !0,
          pwrdb: !0,
          unquotes: !0
        },
        tabView: !0,
        localSearch: false
        // mediaTypeOverride: 'audio' // use if v2 api don't return media type
      });

    })
  }
}
