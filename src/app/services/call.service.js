(function () {
  'use strict';

  angular.module('app.services')
    .factory('CallService', CallService);


  /** @ngInject */
  function CallService($rootScope, $timeout, $http, $q, $window) {

    var currentUser = JSON.parse($window.sessionStorage.getItem('currentUser'));
    var workerName =  'w' + currentUser._id;
    var apiUrl = $rootScope.apiBaseUrl;

    var CallService = {};


    CallService.recordOn = function (call_sid) {
      return $http.get(apiUrl + 'api/callControl/recordOn?callSid=' + call_sid, {withCredentials: true});
    };

    CallService.recordOff = function (call_sid) {
      return $http.get(apiUrl + 'api/callControl/recordOff?callSid=' + call_sid, {withCredentials: true});
    };

    CallService.holdOn = function (call_sid) {
      return $http.get(apiUrl + 'api/callControl/holdOn?callSid=' + call_sid, {withCredentials: true});
    };

    CallService.holdOff = function (call_sid) {
      return $http.get(apiUrl + 'api/callControl/holdOff?callSid=' + call_sid, {withCredentials: true});
    };

    CallService.muteOn = function () {
      return $q.when(Twilio.Device.activeConnection().mute(true));
    };

    CallService.muteOff = function () {
      return $q.when(Twilio.Device.activeConnection().mute(false));
    };

    CallService.hangup = function (call_sid) {
      return $http.get(apiUrl + 'api/callControl/hangup?callSid=' + call_sid, {withCredentials: true});
    };

    CallService.toVoicemail = function (call_sid) {
      return $http.get(apiUrl + 'api/callControl/toVoicemail?callSid=' + call_sid, {withCredentials: true});
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
      if (!Twilio.Device.activeConnection()) {
        Twilio.Device.connect({'workerName': workerName, 'user_id': currentUser._id });
        Twilio.Device.connect(function (conn) {
          if(Twilio.Device.activeConnection()){
            callback(Twilio.Device.activeConnection().parameters.CallSid);
          }
        });
      } else {
        if(Twilio.Device.activeConnection()){
          callback(Twilio.Device.activeConnection().parameters.CallSid);
        }
      }

    };

    return CallService;

  }
})();
