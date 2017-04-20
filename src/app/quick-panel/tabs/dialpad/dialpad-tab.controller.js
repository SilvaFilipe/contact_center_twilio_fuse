(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication')
        .controller('PhoneController', PhoneController);

    /** @ngInject */
    function PhoneController($scope, $rootScope, $http, $timeout, $log, $mdSidenav, $mdToast, $window, CallService)
    {
      var vm = this;
      var currentUser = JSON.parse($window.sessionStorage.getItem('currentUser'));
      var workerName =  currentUser.friendlyWorkerName;
      var apiUrl = $rootScope.apiBaseUrl;

      $scope.status = null;
      $scope.isActive = false;
      vm.phoneNumber = '';
      $scope.toggleRight = function() {
        $mdSidenav('right').toggle();
      };
      $scope.connection = null;
      $scope.isOutboundCall = false;


      $rootScope.$on('InitializePhone', function(event, data) {

        $log.log('InitializePhone event received');

        Twilio.Device.setup(data.token, {debug: true, closeProtection: false});

        Twilio.Device.ready(function (device) {
          $scope.status = 'Ready';
        });

        Twilio.Device.error(function (error) {
          $scope.status = 'error: ' + error.code + ' - ' + error.message;

          $mdToast.show({
            template : '<md-toast><div class="md-toast-content error">' + $scope.status + '</div></md-toast>',
            hideDelay: 7000,
            position : 'top left',
            parent   : '#layout-content-with-toolbar'
          });

          $scope.isActive = false;

          $timeout(function(){
            $scope.$apply();
          });

        });

        Twilio.Device.connect(function (conn) {
          $scope.connection = conn;
          bindVolumeIndicators(conn);
          $scope.status = 'successfully established call';
          $scope.isActive = true;
          if ($scope.isOutboundCall) {
            $scope.directCall();
            $scope.isOutboundCall = false;
          }

        });

        Twilio.Device.disconnect(function (conn) {
          $scope.status = 'call disconnected';
          $scope.isActive = false;
          $scope.connection = null;

          $timeout(function(){
            $scope.$apply();
          });

        });

        Twilio.Device.offline(function (device) {
          $scope.status = 'offline';
          $scope.isActive = false;

          $timeout(function(){
            $scope.$apply();
          });

        });

        Twilio.Device.incoming(function (conn) {
          $scope.status = 'incoming connection from ' + conn.parameters.From;
          $scope.isActive = true;

          conn.accept();
          bindVolumeIndicators(conn);

          conn.disconnect(function(conn) {
            $scope.status = 'call has ended';
            $scope.isActive = false;
            $scope.$apply();
          });

          $scope.connection = conn;
          vm.phoneNumber = conn.parameters.From;

        });

      });

      $scope.directCall = function () {
        $http.get(apiUrl + 'api/agents/outboundCall?user_id=' + currentUser._id + '&phone=' + vm.phoneNumber + '&workerName=' + workerName, {withCredentials: true}).then(function (response) {
          if(response.data !== "ERROR"){
            if (response.data.call.direction === 'extension') {
              $rootScope.syncClient.document('c'+ response.data.call.callSid)
                .then(function(doc) {
                  doc.on('updated', function(data) {
                    $log.log(data);
                    $rootScope.$broadcast('callStatusChanged', {callSid: data.callSid, callEvent: data});
                  }, function onError(response) {
                    console.log(response.data);
                  });
                });
              $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + Twilio.Device.activeConnection().parameters.CallSid + '&roomName=' + response.data.call.conferenceFriendlyName, {withCredentials: true});
              $rootScope.$broadcast('NewExtensionCall', { phoneNumber: vm.phoneNumber, conferenceName: response.data.call.conferenceFriendlyName, callSid: response.data.call.callSid, recipientName: response.data.call.recipientName});

            }
            else {
              // subscribe to updated events
              $rootScope.syncClient.document(response.data.document)
                .then(function(doc) {
                  doc.on('updated', function(data) {
                    $log.log(data);
                    $rootScope.$broadcast('callStatusChanged', {callSid: data.callSid, callEvent: data.callEvents[data.callEvents.length-1]});
                  }, function onError(response) {
                    console.log(response.data);
                  });
                });
              $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + Twilio.Device.activeConnection().parameters.CallSid + '&roomName=' + response.data.call.sid, {withCredentials: true});
              $rootScope.$broadcast('NewOutBoundingCall', { phoneNumber: vm.phoneNumber, callSid: response.data.call.sid});

            }
            $scope.state = 'isActive';
            $mdSidenav('quick-panel').toggle();

          }
          vm.phoneNumber = '';
        });

      };

      $scope.$on('DisconnectSoftware', function () {
        console.log('disconnect the softphone');
        Twilio.Device.disconnectAll();
      });

      $scope.hangup = function (event) {
        addAnimationToButton(event.target);
        $(".callbtn").removeClass("addCall");
        $(".callbtn").addClass("newCall");
        $timeout(function(){
          $rootScope.$broadcast('endAllOutCalls');
        });

      };

      $scope.call = function (phoneNumber, event) {
        addAnimationToButton(event.target);
        if (!$scope.isAcitve) {
          $(".callbtn").removeClass("newCall");
          $(".callbtn").addClass("addCall");
        }

        // here we can put call's info
        $scope.$broadcast('CallPhoneNumber', { phoneNumber: phoneNumber});
      };

      $scope.addDigit = function(digit, event){

        vm.phoneNumber = vm.phoneNumber + digit;

        addAnimationToButton(event.target);

        if($scope.connection){
          $scope.connection.sendDigits(digit);
        }
        $('.phoneNumberTxt').focus();

      };

      $scope.goBack = function (event) {
        addAnimationToButton(event.target);
        vm.phoneNumber = vm.phoneNumber.substring(0, vm.phoneNumber.length - 1);
        $('.phoneNumberTxt').focus();
      };

      var addAnimationToButton = function(thisButton){
        //add animation
        $(thisButton).removeClass('clicked');
        var _this = thisButton;
        setTimeout(function(){
          $(_this).addClass('clicked');
        },1);
      };

      function bindVolumeIndicators(connection) {
        connection.volume(function(inputVolume, outputVolume) {
          var inputVolumeBar = document.getElementById('input-volume');
          var volumeIndicators = document.getElementById('volume-indicators');
          var outputVolumeBar = document.getElementById('output-volume');
          var inputColor = 'red';
          if (inputVolume < .50) {
            inputColor = 'green';
          } else if (inputVolume < .75) {
            inputColor = 'yellow';
          }

          inputVolumeBar.style.width = Math.floor(inputVolume * 300) + 'px';
          inputVolumeBar.style.background = inputColor;

          var outputColor = 'red';
          if (outputVolume < .50) {
            outputColor = 'green';
          } else if (outputVolume < .75) {
            outputColor = 'yellow';
          }

          outputVolumeBar.style.width = Math.floor(outputVolume * 300) + 'px';
          outputVolumeBar.style.background = outputColor;
        });
      }

      $scope.$on('CallPhoneNumber', function(event, data) {

        $log.log('call: ' + data.phoneNumber);
        $scope.isOutboundCall = true;
        vm.phoneNumber = data.phoneNumber;
        if (Twilio.Device.activeConnection() === undefined) {
          Twilio.Device.connect({'phone': '', 'workerName': workerName, 'user_id': currentUser._id });
        }
        else {
          $scope.directCall();
        }

      });

    }

})();
