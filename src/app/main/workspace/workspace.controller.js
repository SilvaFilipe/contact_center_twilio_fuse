(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication')
        .controller('WorkflowController', WorkflowController);

    /** @ngInject */
    function WorkflowController($scope, $rootScope, $http, $interval, $log, $timeout, $mdSidenav, $mdDialog, $document, $window, msNavigationService, CallService, UserService, ExtensionCall, InboundCall, OutboundCall, ConferenceCall) {
      var vm = this;
      var apiUrl = $rootScope.apiBaseUrl;
      $scope.currentUser = JSON.parse($window.sessionStorage.getItem('currentUser'));

      vm.toggleLeftSidenav = function (sidenavId) {
        $mdSidenav(sidenavId).toggle();
      };

      // reload navigation tabs
      msNavigationService.deleteItem('fuse.workspace');
      msNavigationService.deleteItem('fuse.profile');
      msNavigationService.saveItem('fuse.workspace', {
        title    : 'Workspace',
        icon     : 'icon-phone',
        state    : 'app.workspace',
        weight   : 1
      });
      msNavigationService.saveItem('fuse.profile', {
        title    : 'Profile',
        icon     : 'icon-cog',
        state    : 'app.profile',
        weight   : 2
      });


      $scope.acceptReservation = function (reservation) {

        $log.log('accept reservation with TaskRouter Worker JavaScript SDK');

        /* depending on the typ of taks that was created we handle the reservation differently */
        if (reservation.task.attributes.channel === 'chat') {

          reservation.accept(
            function (err, reservation) {

              if (err) {
                $log.error(err);
                return;
              }

              // TODO  - make a call type to represent chat
              var callParams = {fromNumber: reservation.task.attributes.from, duration: reservation.task.age, callSid: 'CA12345', conferenceName: 'chat'};
              $rootScope.currentCall = new InboundCall(callParams);
              $rootScope.callTasks.push($rootScope.currentCall);
              $scope.$broadcast('ActivateChat', {channelSid: reservation.task.attributes.channelSid});

            });


        }

        if (reservation.task.attributes.channel === 'phone' && reservation.task.attributes.type === 'inbound_call') {

          $log.log('dequeue reservation with  callerId: ' + $rootScope.configuration.twilio.callerId);

          reservation.accept(
            function (error, reservation) {
              if (error) {
                console.log(error.code);
                console.log(error.message);
                return;
              }
              $log.log("reservation accepted");
              var callParams = {fromNumber: reservation.task.attributes.from, duration: reservation.task.age, callSid: reservation.task.attributes.call_sid, conferenceName: reservation.sid};
              $rootScope.currentCall = new InboundCall(callParams);
              $rootScope.callTasks.push($rootScope.currentCall);
              CallService.getActiveConnSid(function(ActiveConnSid) {
                if ($rootScope.currentCall) {
                  $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $rootScope.currentCall.conferenceName, {withCredentials: true});
                  $rootScope.stopWorkingCounter();
                  $rootScope.startWorkingCounter();
                }
              });
            }
          );

        }

        /* we accept the reservation and initiate a call to the customer's phone number */
        if (reservation.task.attributes.channel === 'phone' && reservation.task.attributes.type === 'callback_request') {

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
        CallService.recordOn($rootScope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $rootScope.currentCall.recording = true;
            }
          })
      };

      $scope.recordOff = function () {
        CallService.recordOff($rootScope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $rootScope.currentCall.recording = false;
            }
          })
      };

      $scope.hangup = function () {
        CallService.hangup($rootScope.currentCall.callSid)
          .then(function (response) {
            $rootScope.currentCall.callStatus = 'completed';
            $rootScope.stopWorkingCounter();
          })
      };

      $scope.toVoicemail = function () {
        CallService.toVoicemail($rootScope.currentCall.callSid)
          .then(function (response) {
            $rootScope.currentCall.callStatus = 'completed';
            $rootScope.stopWorkingCounter();
          })
      };

      $scope.holdOn = function () {
        CallService.holdOn($rootScope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $rootScope.currentCall.onhold = true;
            }
          })
      };

      $scope.holdOff = function () {
        CallService.holdOff($rootScope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $rootScope.currentCall.onhold = false;
            }
          })
      };

      $scope.muteOn = function () {
        CallService.muteOn()
          .then(function () {
            $rootScope.callTasks.forEach(function (eachCall) {
              eachCall.muted = true;
            });
          });
      };

      $scope.muteOff = function () {
        CallService.muteOff()
          .then(function () {
            $rootScope.callTasks.forEach(function (eachCall) {
              eachCall.muted = false;
            });
          });
      };

      $scope.hangupConferenceCaller = function (call, conference) {
        CallService.hangup(call.callSid)
          .then(function (response) {
            conference.removeCall(call);
          })
      };

      $scope.detachConferenceCaller = function (call, conference) {
        var callCopy = angular.copy(call);
        $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + callCopy.callSid + '&roomName=' + callCopy.conferenceName, {withCredentials: true});
        CallService.getActiveConnSid(function(ActiveConnSid) {
          $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + callCopy.conferenceName, {withCredentials: true});
        });
        $rootScope.callTasks.push(callCopy);
        $rootScope.currentCall = callCopy ;
        conference.removeCall(call);
      };

      $scope.disconnectAllConference = function (conferenceCall) {
        conferenceCall.getCalls().forEach(function (call) {
          CallService.hangup(call.callSid)
            .then(function (response) {
              conferenceCall.removeCall(call);
            })
        });
        $scope.dropOutOfConference(conferenceCall);
      };

      $scope.dropOutOfConference = function (conferenceCall) {
        CallService.getActiveConnSid(function(ActiveConnSid) {
          $http.get(apiUrl + 'api/agents/agentToSilence?caller_sid=' + ActiveConnSid, {withCredentials: true});
        });
        var index = $rootScope.callTasks.indexOf(conferenceCall);
        $rootScope.callTasks.splice(index, 1);
      };

      $scope.transfer = function (ev) {
        $mdDialog.show({
          controller: 'TransferDialogController',
          controllerAs: 'vm',
          //scope: $scope,
          locals: {
            callTasks: $rootScope.callTasks
          },
          templateUrl: 'app/main/workspace/dialogs/transfer.html',
          parent: angular.element($document.body),
          targetEvent: ev,
          clickOutsideToClose: true
        });
      };

      $scope.complete = function (isChat) {
        if ($rootScope.currentCall && !isChat) {
          if ($rootScope.currentCall.type === 'outbound') {
            $rootScope.stopWorkingCounter();
            $scope.closeTab();
            return;
          }
          if ($rootScope.currentCall.isExtensionCall()) {
            $scope.closeTab();
            return;
          }
          $scope.closeTab();

        }

        if ($rootScope.task.attributes.channel === 'chat') {
          $scope.$broadcast('DestroyChat');
        }

        $rootScope.task.complete();

        $rootScope.workerJS.update('ActivitySid', $rootScope.configuration.twilio.workerIdleActivitySid, function (err, worker) {

          if (err) {
            $log.error(err);
            return;
          }

          $rootScope.reservation = null;
          $rootScope.task = null;
          $scope.$apply();

        });

      };



      $scope.acceptInboundCall = function () {
        $rootScope.stopExtensionCounter();
        $rootScope.currentCall = angular.copy($rootScope.extensionCallTask);
        $rootScope.extensionCallTask = null;
        setTimeout(function(){
          $rootScope.callTasks.push($rootScope.currentCall);
          CallService.getActiveConnSid(function(ActiveConnSid) {
            if ($rootScope.currentCall) {
              $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $rootScope.currentCall.conferenceName, {withCredentials: true});
              $http.get(apiUrl + 'api/callControl/hangupSipLeg?caller_sid=' + $rootScope.currentCall.callSid, {withCredentials: true});
              // subscribe to updated events
              $rootScope.syncClient.document('c' + $rootScope.currentCall.callSid )
                .then(function(doc) {
                  doc.on('updated', function(data) {
                    $log.log(data);
                    $rootScope.$broadcast('callStatusChanged', {callSid: data.callSid, callEvent: data});

                  }, function onError(response) {
                  });
                });
            }
          });

          $rootScope.stopWorkingCounter();
          $rootScope.startWorkingCounter();
        }, 500);

      };

      $scope.declineInboundCall = function () {
        CallService.toVoicemail($rootScope.extensionCallTask.callSid)
          .then(function (response) {
            $rootScope.extensionCallTask = null;
            $rootScope.stopExtensionCounter();
          })
      };


      $scope.changeCurrentCall = function (selectedTask) {
        if ($rootScope.currentCall === selectedTask) {
          return;
        }
        $rootScope.currentCall = selectedTask;
        if ($rootScope.currentCall.isCompleted()) {
          $rootScope.stopWorkingCounter();
          if (Twilio.Device.activeConnection() !== undefined) {
            $http.get(apiUrl + 'api/agents/agentToSilence?caller_sid=' + Twilio.Device.activeConnection().parameters.CallSid, {withCredentials: true});
          }
        }
        else {
          CallService.getActiveConnSid(function(ActiveConnSid) {
            $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $rootScope.currentCall.conferenceName, {withCredentials: true});
            $rootScope.stopWorkingCounter();
            $rootScope.startWorkingCounter();
          });
        }
      };

      $scope.isActive = function (task) {
        return ($rootScope.currentCall === task);
      };


      $scope.closeTab = function () {
        var index = $rootScope.callTasks.indexOf($rootScope.currentCall);
        $rootScope.callTasks.splice(index, 1);
        if (index === $rootScope.callTasks.length && index !== 0) {
          $rootScope.currentCall = $rootScope.callTasks[0];
        }
        else if ($rootScope.callTasks.length > 0) {
          $rootScope.currentCall = $rootScope.callTasks[index];
        }
        else {
          $rootScope.currentCall = null;
          $rootScope.$broadcast('DisconnectSoftware');
        }
        if ($rootScope.currentCall && !$rootScope.currentCall.isCompleted()) {
          CallService.getActiveConnSid(function(ActiveConnSid) {
            $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $rootScope.currentCall.conferenceName, {withCredentials: true});
            $rootScope.startWorkingCounter();
          });
        }

      };

      $scope.logout = function () {
        $rootScope.stopWorkingCounter();

        $http.post(apiUrl + 'api/agents/logout')

          .then(function onSuccess(response) {
            window.location.replace('/access/login');

          }, function onError(response) {

            $log.error(response);

          });

      };

      // ChatController
      $scope.channel = null;
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

        if (pattern.test(message.body) === true) {
          m = message.body.replace(pattern, template);
        }

        $scope.messages.push({body: m, author: message.author, timestamp: message.timestamp});
        $scope.$apply();

      };

      $scope.mockCalls = function(number) {
        for (var n=0; n<number; n++){
          var callParams = {fromNumber: 12345, duration: 0, callSid: 'CA12345', conferenceName: 'ConferenceTest'};
          $rootScope.currentCall = new OutboundCall(callParams);
          $rootScope.callTasks.push($rootScope.currentCall);
          $rootScope.stopWorkingCounter();
          $rootScope.startWorkingCounter();
        }
      };

      $scope.$on('SetActivitySid', function(event, activitySid) {
        console.log('SetActivitySid: ', activitySid);
        var selectedActivitySid = eval ('$rootScope.configuration.twilio.' + activitySid);
        $rootScope.workerJS.update('ActivitySid', selectedActivitySid, function (err, worker) {
          if (err) {
            $log.error(err);
            return;
          }
          $scope.$apply();
        });
      });

    }

})();
