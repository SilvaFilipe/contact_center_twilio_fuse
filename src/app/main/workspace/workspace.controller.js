(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication')
        .controller('WorkflowController', WorkflowController);

    /** @ngInject */
    function WorkflowController($scope, $rootScope, $http, $interval, $log, $timeout, $mdSidenav, $mdDialog, $document, CallService, UserService, ExtensionCall, InboundCall, OutboundCall, ConferenceCall) {
      var vm = this;

      var apiUrl = $rootScope.apiBaseUrl;

      //Generate random UUID to identify this browser tab
      //For a more robust solution consider a library like
      //fingerprintjs2: https://github.com/Valve/fingerprintjs2
      var getDeviceId = function () {
        return 'browser-' +
          'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
          });
      };

      vm.toggleLeftSidenav = function (sidenavId) {
        $mdSidenav(sidenavId).toggle();
      };

      /* misc configuration data, for instance callerId for outbound calls */
      $scope.configuration;

      /* contains task data pushed by the TaskRouter JavaScript SDK */
      $scope.reservation = null;
      $scope.task = null;
      $scope.callTasks = [];
      $scope.currentCall = null;
      $scope.extensionCallTask = null;

      /* contains worker record received by the Twilio API or the TaskRouter JavaScript SDK */
      $scope.worker;

      /* TaskRouter Worker */
      $scope.workerJS;

      $http.get(apiUrl + '/users/me', {withCredentials: true})
        .then(function (response) {
          $scope.user = response.data.user;
          //Get an access token for the current user, passing a device ID
          //In browser-based apps, every tab is like its own unique device
          //synchronizing state -- so we'll use a random UUID to identify
          //this tab.
          $http.get(apiUrl + '/sync/token?identity=' + $scope.user.friendlyWorkerName + '&device=' + getDeviceId(), {withCredentials: true})
            .then(function (res) {
              $log.log(res);
              $rootScope.syncClient = new Twilio.Sync.Client(res.data.token);
              $log.log('Sync initialized!');
              $rootScope.$broadcast('syncClientReady');
              $rootScope.syncClient.list('m' + $scope.user._id).then(function(list) {
                list.on("itemAdded", function(item) {
                  console.log("List item added!", item);
                  if (item.value.type == 'call-end' || item.value.type == 'transcription-sent'){
                    console.log('time to update history tab');
                    $rootScope.$broadcast('history.reload');
                  }
                  if (item.value.type == 'inboundCall'&& !$scope.extensionCallTask) {
                    $http.post('/api/callControl/inbound_ringing').then(function(res) {
                      var audio = new Audio(res.data);
                      audio.play();
                      var callParams = {fromNumber: item.value.data.fromNumber, type: 'inbound', callSid: item.value.data.callSid, callerName: item.value.data.callerName,
                        conferenceName: item.value.data.conferenceFriendlyName};
                      $scope.extensionCallTask = new ExtensionCall(callParams);
                      $scope.startExtensionCounter();
                    });
                  }

                });
              });
            });
        });

      /* request configuration data and tokens from the backend */
      $scope.init = function () {

        $http.get(apiUrl + '/agents/session', {withCredentials: true})

          .then(function onSuccess(response) {

            /* keep a local copy of the configuration and the worker */
            $scope.configuration = response.data.configuration;

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
            if (response.status == 403) {
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
        $scope.workerJS = new Twilio.TaskRouter.Worker(token, true, $scope.configuration.twilio.workerIdleActivitySid, $scope.configuration.twilio.workerOfflineActivitySid);

        $scope.workerJS.on('ready', function (worker) {

          $log.log('TaskRouter Worker: ready');

          $scope.worker = worker;

        });


        $scope.workerJS.on('reservation.created', function (reservation) {

          $log.log('TaskRouter Worker: reservation.created');
          $log.log(reservation);

          $http.post('/api/callControl/inbound_ringing').then(function(res) {
            var audio = new Audio(res.data);
            audio.play();
            $scope.reservation = reservation;
            $scope.startReservationCounter();
          });

        });

        $scope.workerJS.on('reservation.accepted', function (reservation) {

          $log.log('TaskRouter Worker: reservation.accepted');
          $log.log(reservation);

          $scope.task = reservation.task;

          /* check if the customer name is a phone number */
          var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

          if (pattern.test($scope.task.attributes.name) == true) {
            $scope.task.attributes.nameIsPhoneNumber = true;
          }

          $scope.task.completed = false;
          $scope.reservation = null;
          $scope.stopReservationCounter();
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

        $scope.workerJS.on('reservation.timeout', function (reservation) {

          $log.log('TaskRouter Worker: reservation.timeout');
          $log.log(reservation);

          /* reset all data */
          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

        });

        $scope.workerJS.on('reservation.rescinded', function (reservation) {

          $log.log('TaskRouter Worker: reservation.rescinded');
          $log.log(reservation);

          /* reset all data */
          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

        });

        $scope.workerJS.on('reservation.canceled', function (reservation) {

          $log.log('TaskRouter Worker: reservation.cancelled');
          $log.log(reservation);

          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

        });

        $scope.workerJS.on('activity.update', function (worker) {

          $log.log('TaskRouter Worker: activity.update');
          $log.log(worker);

          $scope.worker = worker;
          $scope.$apply();

        });

        $scope.workerJS.on('token.expired', function () {

          $log.log('TaskRouter Worker: token.expired');

          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

          /* the worker token expired, the agent shoud log in again, token is generated upon log in */
          window.location.replace('/access/login');

        });

      };

      $scope.acceptReservation = function (reservation) {

        $log.log('accept reservation with TaskRouter Worker JavaScript SDK');

        /* depending on the typ of taks that was created we handle the reservation differently */
        if (reservation.task.attributes.channel == 'chat') {

          reservation.accept(
            function (err, reservation) {

              if (err) {
                $log.error(err);
                return;
              }

              $scope.$broadcast('ActivateChat', {channelSid: reservation.task.attributes.channelSid});

            });


        }

        if (reservation.task.attributes.channel == 'phone' && reservation.task.attributes.type == 'inbound_call') {

          $log.log('dequeue reservation with  callerId: ' + $scope.configuration.twilio.callerId);

          reservation.accept(
            function (error, reservation) {
              if (error) {
                console.log(error.code);
                console.log(error.message);
                return;
              }
              $log.log("reservation accepted");
              var callParams = {fromNumber: reservation.task.attributes.from, duration: reservation.task.age, callSid: reservation.task.attributes.call_sid, conferenceName: reservation.sid};
              $scope.currentCall = new InboundCall(callParams);
              $scope.callTasks.push($scope.currentCall);
              CallService.getActiveConnSid(function(ActiveConnSid) {
                if ($scope.currentCall) {
                  $http.get(apiUrl + '/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $scope.currentCall.conferenceName, {withCredentials: true});
                  $scope.stopWorkingCounter();
                  $scope.startWorkingCounter();
                }
              });
            }
          );

        }

        /* we accept the reservation and initiate a call to the customer's phone number */
        if (reservation.task.attributes.channel == 'phone' && reservation.task.attributes.type == 'callback_request') {

          reservation.accept(
            function (err, reservation) {

              if (err) {
                $log.error(err);
                return;
              }

              $rootScope.$broadcast('CallPhoneNumber', {phoneNumber: reservation.task.attributes.phone});

            });
        }
      };


      $scope.recordOn = function () {
        CallService.recordOn($scope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $scope.currentCall.recording = true;
            }
          })
      };

      $scope.recordOff = function () {
        CallService.recordOff($scope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $scope.currentCall.recording = false;
            }
          })
      };

      $scope.hangup = function () {
        CallService.hangup($scope.currentCall.callSid)
          .then(function (response) {
            $scope.currentCall.callStatus = 'completed';
            $scope.stopWorkingCounter();
          })
      };

      $scope.holdOn = function () {
        CallService.holdOn($scope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $scope.currentCall.onhold = true;
            }
          })
      };

      $scope.holdOff = function () {
        CallService.holdOff($scope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $scope.currentCall.onhold = false;
            }
          })
      };

      $scope.muteOn = function () {
        CallService.muteOn()
          .then(function () {
            $scope.callTasks.forEach(function (eachCall) {
              eachCall.muted = true;
            });
          });
      };

      $scope.muteOff = function () {
        CallService.muteOff()
          .then(function () {
            $scope.callTasks.forEach(function (eachCall) {
              eachCall.muted = false;
            });
          });
      };


      $scope.transfer = function (ev) {
        $mdDialog.show({
          controller: 'TransferDialogController',
          controllerAs: 'vm',
          //scope: $scope,
          locals: {
            callTasks: $scope.callTasks
          },
          templateUrl: 'app/main/workspace/dialogs/transfer.html',
          parent: angular.element($document.body),
          targetEvent: ev,
          clickOutsideToClose: true
        });
      };

      $scope.complete = function (isChat) {
        if ($scope.currentCall && !isChat) {
          if ($scope.currentCall.type == 'outbound') {
            $scope.stopWorkingCounter();
            $scope.closeTab();
            return;
          }
          if ($scope.currentCall.isExtensionCall()) {
            $scope.closeTab();
            return;
          }
          $scope.closeTab();

        }

        if ($scope.task.attributes.channel == 'chat') {
          $scope.$broadcast('DestroyChat');
        }

        $scope.task.complete();

        $scope.workerJS.update('ActivitySid', $scope.configuration.twilio.workerIdleActivitySid, function (err, worker) {

          if (err) {
            $log.error(err);
            return;
          }

          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

        });

      };

      $scope.callPhoneNumber = function (phoneNumber) {
        $rootScope.$broadcast('CallPhoneNumber', {phoneNumber: phoneNumber});
      };

      $scope.$on('NewOutBoundingCall', function (event, data) {
        $log.log('call: ' + data.phoneNumber);

        var callParams = {fromNumber: data.phoneNumber, callSid: data.callSid, conferenceName: data.callSid};
        $scope.currentCall = new OutboundCall(callParams);
        $scope.callTasks.push($scope.currentCall);
        $scope.stopWorkingCounter();
        $scope.startWorkingCounter();

      });


      $scope.$on('AddCallTask', function (event, data) {
        $log.log('AddCallTask: ' + data);
        $scope.currentCall = data;
        $scope.callTasks.push($scope.currentCall);
        $scope.stopWorkingCounter();
        $scope.startWorkingCounter();
      });

      $scope.$on('NewExtensionCall', function (event, data) {
        $log.log('call: ' + data.phoneNumber);

        var callParams = {fromNumber: data.phoneNumber, type: 'outbound', callSid: data.callSid, callerName: data.recipientName, conferenceName: data.conferenceName};
        $scope.currentCall = new ExtensionCall(callParams);
        $scope.callTasks.push($scope.currentCall);
        $scope.stopWorkingCounter();
        $scope.startWorkingCounter();

      });

      $scope.acceptInboundCall = function () {
        $scope.stopExtensionCounter();
        $scope.currentCall = angular.copy($scope.extensionCallTask);
        $scope.extensionCallTask = null;
        setTimeout(function(){
          $scope.callTasks.push($scope.currentCall);
          CallService.getActiveConnSid(function(ActiveConnSid) {
            if ($scope.currentCall) {
              $http.get(apiUrl + '/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $scope.currentCall.conferenceName, {withCredentials: true});
              // subscribe to updated events
              $rootScope.syncClient.document('c' + $scope.currentCall.callSid )
                .then(function(doc) {
                  doc.on('updated', function(data) {
                    $log.log(data);
                    $rootScope.$broadcast('callStatusChanged', {callSid: data.callSid, callEvent: data});

                  }, function onError(response) {
                  });
                });
            }
          });

          $scope.stopWorkingCounter();
          $scope.startWorkingCounter();
        }, 1000);

      };

      $scope.declineInboundCall = function () {
        CallService.hangup($scope.extensionCallTask.callSid)
          .then(function (response) {
            $scope.extensionCallTask = null;
            $scope.stopExtensionCounter();
          })
      };

      $scope.$on('endAllOutCalls', function (event) {
        $log.log('end all outbounding calls');
        if ($scope.currentCall && $scope.currentCall.isOutGoingCall()) {
          $scope.stopWorkingCounter();
          $scope.currentCall = null;

        }
        $scope.callTasks = $scope.callTasks.filter(function (callItem) {
          return callItem.type != 'outbound';
        });

        if ($scope.callTasks.length == 0) {
          $rootScope.$broadcast('DisconnectSoftware');
        }
        else if ($scope.currentCall == null) {
          $scope.currentCall = $scope.callTasks[0];
          CallService.getActiveConnSid(function(ActiveConnSid) {
            $http.get(apiUrl + '/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $scope.currentCall.conferenceName, {withCredentials: true});
            $scope.startWorkingCounter();
          });
        }
      });

      $scope.changeCurrentCall = function (selectedTask) {
        if ($scope.currentCall == selectedTask) {
          return;
        }
        $scope.currentCall = selectedTask;
        if ($scope.currentCall.isCompleted()) {
          $scope.stopWorkingCounter();
          if (Twilio.Device.activeConnection() != undefined) {
            $http.get(apiUrl + '/agents/agentToSilence?caller_sid=' + Twilio.Device.activeConnection().parameters.CallSid, {withCredentials: true});
          }
        }
        else {
          CallService.getActiveConnSid(function(ActiveConnSid) {
            $http.get(apiUrl + '/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $scope.currentCall.conferenceName, {withCredentials: true});
            $scope.stopWorkingCounter();
            $scope.startWorkingCounter();
          });
        }
      };

      $scope.$on('callStatusChanged', function (event, data) {

        $scope.callTasks.filter(function (callItem) {
          if (callItem.callSid == data.callSid && !$scope.currentCall.isCompleted()) {
            if (callItem.isExtensionCall() && data.callEvent.callStatus == 'Completed') {
              callItem.callStatus = 'completed';
            }
            else {
              callItem.callStatus = (typeof data.callEvent.callStatus != 'undefined') ? data.callEvent.callStatus : data.callEvent.conferenceStatusCallbackEvent;
            }
            $log.log('call status changed:' + data.callSid + ' to ' + callItem.callStatus);
          }
        });

      });

      $scope.isActive = function (task) {
        return ($scope.currentCall == task);
      };

      $scope.$watch('currentCall.callStatus', function (newVal, oldVal) {
        if (newVal == 'completed') {
          $scope.stopWorkingCounter();
          if (Twilio.Device.activeConnection() != undefined) {
            $http.get(apiUrl + '/agents/toCallEnded?caller_sid=' + Twilio.Device.activeConnection().parameters.CallSid, {withCredentials: true});
          }

        }
      });

      $scope.closeTab = function () {
        var index = $scope.callTasks.indexOf($scope.currentCall);
        $scope.callTasks.splice(index, 1);
        if (index == $scope.callTasks.length && index != 0) {
          $scope.currentCall = $scope.callTasks[0];
        }
        else if ($scope.callTasks.length > 0) {
          $scope.currentCall = $scope.callTasks[index];
        }
        else {
          $scope.currentCall = null;
          $rootScope.$broadcast('DisconnectSoftware');
        }
        if ($scope.currentCall && !$scope.currentCall.isCompleted()) {
          CallService.getActiveConnSid(function(ActiveConnSid) {
            $http.get(apiUrl + '/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $scope.currentCall.conferenceName, {withCredentials: true});
            $scope.startWorkingCounter();
          });
        }

      };

      $scope.logout = function () {
        $scope.stopWorkingCounter();

        $http.post('/api/agents/logout')

          .then(function onSuccess(response) {
            window.location.replace('/access/login');

          }, function onError(response) {

            $log.error(response);

          });

      };

      $scope.startReservationCounter = function () {

        $log.log('start reservation counter');
        $scope.reservationCounter = $scope.reservation.task.age;

        $scope.reservationInterval = $interval(function () {
          $scope.reservationCounter++;
        }, 1000);

      };

      $scope.stopReservationCounter = function () {

        if (angular.isDefined($scope.reservationInterval)) {
          $interval.cancel($scope.reservationInterval);
          $scope.reservationInterval = undefined;
        }

      };

      $scope.startExtensionCounter = function () {

        $log.log('start working counter');
        $scope.extensionInterval = $interval(function () {
          $scope.extensionCallTask.duration++;
        }, 1000);

      };

      $scope.stopExtensionCounter = function () {
        $log.log('stop working counter');
        if (angular.isDefined($scope.extensionInterval)) {
          $interval.cancel($scope.extensionInterval);
          $scope.extensionInterval = undefined;
        }

      };

      $scope.startWorkingCounter = function () {

        $log.log('start working counter');
        $scope.workingInterval = $interval(function () {
          $scope.currentCall.duration++;
        }, 1000);

      };

      $scope.stopWorkingCounter = function () {
        $log.log('stop working counter');
        if (angular.isDefined($scope.workingInterval)) {
          $interval.cancel($scope.workingInterval);
          $scope.workingInterval = undefined;
        }

      };
      // ChatController
      $scope.channel;
      $scope.messages = [];
      $scope.session = {
        token: null,
        identity: null,
        isInitialized: false,
        isLoading: false,
        expired: false
      };

      $scope.$on('DestroyChat', function (event) {

        $log.log('DestroyChat event received');

        $scope.channel.leave().then(function () {
          $log.log('channel left');
          $scope.channel = null;
        });

        $scope.messages = [];
        $scope.session.isInitialized = false;
        $scope.session.channelSid = null;

      });

      $rootScope.$on('InitializeChat', function (event, data) {

        $log.log('InitializeChat event received');
        $log.log(data);

        /* clean up  */
        $scope.channel = null;
        $scope.messages = [];
        $scope.session = {
          token: null,
          identity: null,
          isInitialized: false,
          isLoading: false,
          expired: false
        };

        $scope.session.token = data.token;
        $scope.session.identity = data.identity;

      });

      $scope.$on('ActivateChat', function (event, data) {

        $log.log('ActivateChat event received');
        $log.log(data);

        $scope.session.channelSid = data.channelSid;

        $scope.session.isLoading = true;
        $scope.setupClient($scope.session.channelSid);

      });

      $scope.setupClient = function (channelSid) {

        $log.log('setup channel: ' + channelSid);
        var accessManager = new Twilio.AccessManager($scope.session.token);

        /**
         * you'll want to be sure to listen to the tokenExpired event either update
         * the token via accessManager.updateToken(<token>) or let your page tell the user
         * the chat is not active anymore
         **/
        accessManager.on('tokenExpired', function () {
          $log.error('live chat token expired');
        });

        accessManager.on('error', function () {
          $log.error('An error occurred');
        });

        var messagingClient = new Twilio.IPMessaging.Client(accessManager);

        var promise = messagingClient.getChannelBySid(channelSid);

        promise.then(function (channel) {
          $log.log('channel is: ' + channel.uniqueName);
          $scope.setupChannel(channel);
        }, function (reason) {
          /* client could not access the channel */
          $log.error(reason);
        });

      };

      $scope.setupChannel = function (channel) {

        channel.join().then(function (member) {

          /* first we read the history of this channel, afterwards we join */
          channel.getMessages().then(function (messages) {
            for (var i = 0; i < messages.length; i++) {
              var message = messages[i];
              $scope.addMessage(message);
            }
            $log.log('Total Messages in Channel:' + messages.length);

            $scope.messages.push({
              body: 'You are now connected to the customer',
              author: 'System'
            });

            /* use now joined the channel, display canvas */
            $scope.session.isInitialized = true;
            $scope.session.isLoading = false;

            $scope.$apply();

          });

        });

        channel.on('messageAdded', function (message) {
          $scope.addMessage(message);
        });

        channel.on('memberJoined', function (member) {
          $scope.messages.push({
            body: member.identity + ' has joined the channel.',
            author: 'System'
          });
          $scope.$apply();

        });

        channel.on('memberLeft', function (member) {
          $scope.messages.push({
            body: member.identity + ' has left the channel.',
            author: 'System'
          });
          $scope.$apply();
        });

        channel.on('typingStarted', function (member) {
          $log.log(member.identity + ' started typing');
          $scope.typingNotification = member.identity + ' is typing ...';
          $scope.$apply();
        });

        channel.on('typingEnded', function (member) {
          $log.log(member.identity + ' stopped typing');
          $scope.typingNotification = '';
          $scope.$apply();
        });

        $scope.channel = channel;

      };

      /* if the message input changes the user is typing */
      $scope.$watch('vm.message', function (newValue, oldValue) {
        if ($scope.channel) {
          $log.log('send typing notification to channel');
          $scope.channel.typing();
        }
      });

      $scope.send = function () {
        $scope.channel.sendMessage(vm.message);
        vm.message = '';
      };

      $scope.callInlineNumber = function (phone) {
        $log.log('call inline number ' + phone);
        $rootScope.$broadcast('CallPhoneNumber', {phoneNumber: phone});
      };

      $scope.addMessage = function (message) {

        var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

        var m = message.body;
        var template = '<p>$1<span class="chat-inline-number" ng-click="callInlineNumber(\'$2\')">$2</span>$3</p>';

        if (pattern.test(message.body) == true) {
          m = message.body.replace(pattern, template);
        }

        $scope.messages.push({body: m, author: message.author, timestamp: message.timestamp});
        $scope.$apply();

      };

      $scope.mockCalls = function(number) {
        for (var n=0; n<number; n++){
          var callParams = {fromNumber: 12345, duration: 0, callSid: 'CA12345', conferenceName: 'ConferenceTest'};
          $scope.currentCall = new OutboundCall(callParams);
          $scope.callTasks.push($scope.currentCall);
          $scope.stopWorkingCounter();
          $scope.startWorkingCounter();
        }
      }

      $scope.$on('SetActivitySid', function(event, activitySid) {
        var selectedActivitySid = eval ('$scope.configuration.twilio.' + activitySid);
        $scope.workerJS.update('ActivitySid', selectedActivitySid, function (err, worker) {
          if (err) {
            $log.error(err);
            return;
          }
          $scope.$apply();
        });
      });

    }



})();
