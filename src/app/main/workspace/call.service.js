(function () {
  'use strict';

  angular.module('app.callcenterApplication')
    .factory('CallService', CallService)


  /** @ngInject */
  function CallService($http, $q) {

    var CallService = {};


    CallService.recordOn = function (call_sid) {
      return $http.get('/api/callControl/recordOn?callSid=' + call_sid);
    };

    CallService.recordOff = function (call_sid) {
      return $http.get('/api/callControl/recordOff?callSid=' + call_sid);
    };

    CallService.holdOn = function (call_sid) {
      return $http.get('/api/callControl/holdOn?callSid=' + call_sid);
    };

    CallService.holdOff = function (call_sid) {
      return $http.get('/api/callControl/holdOff?callSid=' + call_sid);
    };

    CallService.muteOn = function () {
      return $q.when(Twilio.Device.activeConnection().mute(true));
    };

    CallService.muteOff = function () {
      return $q.when(Twilio.Device.activeConnection().mute(false));
    };

    CallService.hangup = function (call_sid) {
      return $http.get('/api/callControl/hangup?callSid=' + call_sid);
    };

    return CallService;

  }


})();
