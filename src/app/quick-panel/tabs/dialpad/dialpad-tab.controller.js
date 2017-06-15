(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication')
        .controller('PhoneController', PhoneController);

    /** @ngInject */
    function PhoneController($scope, $state, $rootScope, $interval, $http, $timeout, $log, $mdSidenav, $mdDialog, $document, $mdToast, $window, msNavigationService, CallService, UserService, ExtensionCall, InboundCall, OutboundCall, ConferenceCall)
    {
      var vm = this;
      var currentUser = JSON.parse($window.sessionStorage.getItem('currentUser'));
      var workerName =  currentUser.friendlyWorkerName;
      var apiUrl = $rootScope.apiBaseUrl;

      //Generate random UUID to identify this browser tab
      //For a more robust solution consider a library like
      //fingerprintjs2: https://github.com/Valve/fingerprintjs2
      var getDeviceId = function () {
        return 'browser-' +
          'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
          });
      };

      $scope.currentUser = currentUser;

      if (!angular.isDefined($rootScope.callTasks)) {
        $rootScope.callTasks = [];
      }

      if (!angular.isDefined($rootScope.extensionCallTasks)) {
        $rootScope.extensionCallTasks = [];
      }


      $http.get(apiUrl + 'api/users/me', {withCredentials: true})
        .then(function (response) {
          $scope.user = response.data.user;
          //Get an access token for the current user, passing a device ID
          //In browser-based apps, every tab is like its own unique device
          //synchronizing state -- so we'll use a random UUID to identify
          //this tab.
          $http.get(apiUrl + 'api/sync/token?identity=' + $scope.user.friendlyWorkerName + '&device=' + getDeviceId(), {withCredentials: true})
            .then(function (res) {
              $log.log(res);
              $rootScope.syncClient = new Twilio.Sync.Client(res.data.token);
              $log.log('Sync initialized!');
              $rootScope.$broadcast('syncClientReady');
              $rootScope.syncClient.list('m' + $scope.user._id).then(function(list) {
                list.on("itemAdded", function(item) {
                  console.log("List item added!", item);
                  if (item.value.type === 'call-end' || item.value.type === 'transcription-sent'){
                    console.log('time to update history tab');
                    $rootScope.$broadcast('history.reload');
                  }
                  if (item.value.type === 'call-end' || item.value.type === 'voicemail-transcription-sent'){
                    console.log('time to update voicemail tab');
                    $rootScope.$broadcast('voicemail.reload');
                  }

                  if (item.value.type === 'answeredBySip'){
                    console.log('sip phone answered call');
                    $rootScope.callTasks.filter(function (callItem) {
                      if (callItem.callSid === item.value.data.callSid) {
                          //callItem.callStatus = 'completed';
                        console.log('callItem');
                        console.log(callItem);
                        callItem.sipAnswered = true;
                        //$log.log('call:' + data.callSid + ' to sipAnswered' + callItem.sipAnswered);
                        $log.log('call:' + item.value.data.callSid + ' to sipAnswered' + callItem.sipAnswered);
                      }
                    });
                  }

                  if (item.value.type === 'inboundCall') {
                    $http.post(apiUrl + 'api/callControl/inbound_ringing').then(function(res) {
                      var audio = new Audio(res.data);
                      audio.play();
                      var callParams = {fromNumber: item.value.data.fromNumber, type: 'inbound', callSid: item.value.data.callSid, callerName: item.value.data.callerName,
                        conferenceName: item.value.data.conferenceFriendlyName, sipAnswered: false};
                      var task = new ExtensionCall(callParams);
                      $rootScope.extensionCallTasks.push(task);
                      $rootScope.stopExtensionCounter();
                      $rootScope.startExtensionCounter(task);

                      if ($state.current.name !== 'app.workspace') {
                        $rootScope.showCallNotification();
                      }

                    });
                  }

                });
              });
            });
        });

      /* request configuration data and tokens from the backend */
      $scope.init = function () {

        $http.get(apiUrl + 'api/agents/session', {withCredentials: true})

          .then(function onSuccess(response) {

            /* keep a local copy of the configuration and the worker */
            $rootScope.configuration = response.data.configuration;

            /* initialize Twilio worker js with token received from the backend */
            $scope.initWorker(response.data.tokens.worker);

            /* initialize Twilio client with token received from the backend */
            $rootScope.$broadcast('InitializePhone', {token: response.data.tokens.phone});

            /* initialize Twilio IP Messaging client with token received from the backend */
            $rootScope.$broadcast('InitializeChat', {
              token: response.data.tokens.chat,
              identity: response.data.worker.friendlyName
            });

          }, function onError(response) {

            /* session is not valid anymore */
            if (response.status === 403) {
              alert('session is not valid anymore');
              window.location.replace('/access/login');
            } else {
              alert(JSON.stringify(response));
            }

          });

      };

      $timeout(function () {
        $scope.init();
      }, 1000);

      $scope.initWorker = function (token) {

        /* create TaskRouter Worker */
        $rootScope.workerJS = new Twilio.TaskRouter.Worker(token, true, $rootScope.configuration.twilio.workerIdleActivitySid, $rootScope.configuration.twilio.workerOfflineActivitySid);

        $rootScope.workerJS.on('ready', function (worker) {

          $log.log('TaskRouter Worker: ready');

          $rootScope.worker = worker;

        });


        $rootScope.workerJS.on('reservation.created', function (reservation) {

          $log.log('TaskRouter Worker: reservation.created');
          $log.log(reservation);

          $http.post(apiUrl + 'api/callControl/inbound_ringing').then(function(res) {
            var audio = new Audio(res.data);
            audio.play();
            $rootScope.reservation = reservation;
            $rootScope.startReservationCounter();
            if ($state.current.name !== 'app.workspace') {
              $rootScope.showCallNotification();
            }
          });

        });

        $rootScope.workerJS.on('reservation.accepted', function (reservation) {

          $log.log('TaskRouter Worker: reservation.accepted');
          $log.log(reservation);

          $rootScope.task = reservation.task;

          /* check if the customer name is a phone number */
          var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

          if (pattern.test($rootScope.task.attributes.name) === true) {
            $rootScope.task.attributes.nameIsPhoneNumber = true;
          }

          $rootScope.task.completed = false;
          $rootScope.reservation = null;
          $rootScope.stopReservationCounter();
          var caller_sid = reservation.task.attributes.call_sid;
          var agent_sid = reservation.task.attributes.worker_call_sid;
          $scope.$apply();

          // subscribe to updated events
          $rootScope.syncClient.document('c' + caller_sid )
            .then(function(doc) {
              doc.on('updated', function(data) {
                $log.log(data);
                $rootScope.$broadcast('callStatusChanged', {callSid: data.callSid, callEvent: data.callEvents[data.callEvents.length-1]});
              }, function onError(response) {
                console.log(response.data);
              });
            });

        });

        $rootScope.workerJS.on('reservation.timeout', function (reservation) {

          $log.log('TaskRouter Worker: reservation.timeout');
          $log.log(reservation);

          /* reset all data */
          $rootScope.reservation = null;
          $rootScope.task = null;
          $scope.$apply();

        });

        $rootScope.workerJS.on('reservation.rescinded', function (reservation) {

          $log.log('TaskRouter Worker: reservation.rescinded');
          $log.log(reservation);

          /* reset all data */
          $rootScope.reservation = null;
          $rootScope.task = null;
          $scope.$apply();

        });

        $rootScope.workerJS.on('reservation.canceled', function (reservation) {

          $log.log('TaskRouter Worker: reservation.cancelled');
          $log.log(reservation);

          $rootScope.reservation = null;
          $rootScope.task = null;
          $scope.$apply();

        });

        $rootScope.workerJS.on('activity.update', function (worker) {

          $log.log('TaskRouter Worker: activity.update');
          $log.log(worker);

          $rootScope.worker = worker;
          $scope.$apply();

        });

        $rootScope.workerJS.on('token.expired', function () {

          $log.log('TaskRouter Worker: token.expired');

          $rootScope.reservation = null;
          $rootScope.task = null;
          $scope.$apply();

          /* the worker token expired, the agent shoud log in again, token is generated upon log in */
          alert('Your worker token expired, please login again.');
          window.location.replace('/access/login');

        });

      };


      $scope.$on('NewOutBoundingCall', function (event, data) {
        $log.log('call: ' + data.phoneNumber);

        var callParams = {fromNumber: data.phoneNumber, callSid: data.callSid, conferenceName: data.callSid};
        $rootScope.currentCall = new OutboundCall(callParams);
        $rootScope.callTasks.push($rootScope.currentCall);
        $rootScope.stopWorkingCounter();
        $rootScope.startWorkingCounter();
        if ($state.current.name !== 'app.workspace') {
          $rootScope.showCallNotification();
        }

      });

      $scope.$on('AddCallTask', function (event, data) {
        $log.log('AddCallTask: ' + data);
        $rootScope.currentCall = data;
        $rootScope.callTasks.push($rootScope.currentCall);
        $rootScope.stopWorkingCounter();
        $rootScope.startWorkingCounter();
      });

      $scope.$on('NewExtensionCall', function (event, data) {
        $log.log('call: ' + data.phoneNumber);

        var callParams = {fromNumber: data.phoneNumber, type: 'outbound', callSid: data.callSid, callerName: data.recipientName, conferenceName: data.conferenceName};
        $rootScope.currentCall = new ExtensionCall(callParams);
        $rootScope.callTasks.push($rootScope.currentCall);
        $rootScope.stopWorkingCounter();
        $rootScope.startWorkingCounter();
        if ($state.current.name !== 'app.workspace') {
          $rootScope.showCallNotification();
        }

      });


      $scope.$on('endAllOutCalls', function (event) {
        $log.log('end all outbounding calls');
        if ($rootScope.currentCall && $rootScope.currentCall.isOutGoingCall()) {
          $rootScope.stopWorkingCounter();
          $rootScope.currentCall = null;

        }
        $rootScope.callTasks = $rootScope.callTasks.filter(function (callItem) {
          return callItem.type !== 'outbound';
        });

        if ($rootScope.callTasks.length === 0) {
          $rootScope.$broadcast('DisconnectSoftware');
        }
        else if ($rootScope.currentCall === null) {
          $rootScope.currentCall = $rootScope.callTasks[0];
          CallService.getActiveConnSid(function(ActiveConnSid) {
            $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $rootScope.currentCall.conferenceName, {withCredentials: true});
            $rootScope.startWorkingCounter();
          });
        }
        if ($state.current.name !== 'app.workspace') {
          $rootScope.showCallNotification();
        }
      });

      $scope.$on('callStatusChanged', function (event, data) {
        $rootScope.callTasks.filter(function (callItem) {
          if (callItem.callSid === data.callSid && !$rootScope.currentCall.isCompleted()) {
            if (callItem.isExtensionCall() && data.callEvent.callStatus === 'Completed') {
              callItem.callStatus = 'completed';
            }
            else {
              callItem.callStatus = (typeof data.callEvent.callStatus !== 'undefined') ? data.callEvent.callStatus : data.callEvent.conferenceStatusCallbackEvent;
            }
            $log.log('call status changed:' + data.callSid + ' to ' + callItem.callStatus);
          }
        });
        if ($state.current.name !== 'app.workspace') {
          $rootScope.showCallNotification();
        }

      });


      $scope.$watch('currentCall.callStatus', function (newVal, oldVal) {
        if (newVal === 'completed') {
          $rootScope.stopWorkingCounter();
          if (Twilio.Device.activeConnection() !== undefined) {
            $http.get(apiUrl + 'api/agents/toCallEnded?caller_sid=' + Twilio.Device.activeConnection().parameters.CallSid, {withCredentials: true});
          }
          if ($state.current.name !== 'app.workspace') {
            $rootScope.showCallNotification();
          }

        }
      });

      $scope.status = null;
      $scope.isActive = false;
      vm.phoneNumber = '';
      $scope.toggleRight = function() {
        $mdSidenav('right').toggle();
      };
      $rootScope.connection = null;
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
          $rootScope.connection = conn;
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
          $rootScope.connection = null;

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

          $rootScope.connection = conn;
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
        if (!Twilio.Device.activeConnection()) {
          Twilio.Device.connect({'phone': '', 'workerName': workerName, 'user_id': currentUser._id });
        }
        else {
          $scope.directCall();
        }

      });

      // dialpad events
      vm.digitClicked = function () {
        if($rootScope.connection){
          $rootScope.connection.sendDigits(vm.phoneNumber.charAt(vm.phoneNumber.length-1));
        }
        angular.element('.inputDialpad').focus();
      };

      vm.keyDowned = function (keyEvent) {
        if (keyEvent.which >= 48 && keyEvent.which <= 57) {
          if($rootScope.connection){
            $rootScope.connection.sendDigits(vm.phoneNumber.charAt(vm.phoneNumber.length-1));
          }
        }
      };

      vm.backBtnClicked = function () {
        vm.phoneNumber = vm.phoneNumber.substring(0, vm.phoneNumber.length - 1);
        angular.element('.inputDialpad').focus();
      };

      vm.call = function() {
        // here we can put call's info
        $scope.$broadcast('CallPhoneNumber', { phoneNumber: vm.phoneNumber});
      };

      vm.hangup = function () {
        $timeout(function(){
          $rootScope.$broadcast('endAllOutCalls');
        });
      }

    }

})();
