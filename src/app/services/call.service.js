(function () {
  'use strict';

  angular.module('app.services')
    .factory('CallService', CallService);


  /** @ngInject */
  function CallService($timeout, $http, $q, $window) {

    var currentUser = JSON.parse($window.sessionStorage.getItem('currentUser'));
    var workerName =  'w' + currentUser._id;

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

    CallService.hangupDialpad = function () {
      return $q.when($timeout(function(){
        Twilio.Device.disconnectAll();
      }));
    };

    CallService.setupDialpad = function () {
      return $q.when(
        Twilio.Device.setup(data.token, {debug: true})
      );
    };

    CallService.getActiveConnSid = function (callback) {
      if (Twilio.Device.activeConnection() == undefined) {
        Twilio.Device.connect({'workerName': workerName, 'user_id': currentUser._id });
        Twilio.Device.connect(function (conn) {
          callback(Twilio.Device.activeConnection().parameters.CallSid);
        });
      } else {
        callback(Twilio.Device.activeConnection().parameters.CallSid);
      }

    };

    return CallService;

  }
})();
