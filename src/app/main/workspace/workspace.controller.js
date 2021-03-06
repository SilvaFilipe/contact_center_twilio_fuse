(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication')
        .controller('WorkflowController', WorkflowController);

    /** @ngInject */
    function WorkflowController($scope, $rootScope, $http, $interval, $log, $timeout, $mdSidenav, $mdDialog, $document, $window, msNavigationService, CallService, UserService, QueueService, ExtensionCall, InboundCall, OutboundCall, ConferenceCall, EnvironmentConfig) {
      var vm = this;
      var apiUrl = $rootScope.apiBaseUrl;
      var isStartRecording = EnvironmentConfig.CallRecordingDefault;
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

              // create new chat task
              var newChatTask = reservation.task;
              newChatTask.channel = null;
              newChatTask.messages = [];
              newChatTask.sendMessage = null;

              newChatTask.session = {
                token: $rootScope.session.token,
                identity: $rootScope.session.identity,
                isInitialized: false,
                isLoading: true,
                expired: false,
                channelSid: reservation.task.attributes.channelSid
              };

              $rootScope.chatTasks.push(newChatTask);

              $scope.setupClient(newChatTask);

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
              var callParams = {fromNumber: reservation.task.attributes.from, duration: reservation.task.age, callSid: reservation.task.attributes.call_sid, conferenceName: reservation.sid, recording: isStartRecording};
              $rootScope.currentCall = new InboundCall(callParams);
              $rootScope.callTasks.push($rootScope.currentCall);
              CallService.getActiveConnSid(function(ActiveConnSid) {
                if ($rootScope.currentCall) {
                  $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $rootScope.currentCall.conferenceName, {withCredentials: true});
                }
              });
              QueueService.getQueueFromSid(reservation.task.taskQueueSid).then(function (taskQueue) {
                $rootScope.currentCall.taskQueue = taskQueue;

              }, function (err) {
                console.log(err);
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
          })
      };

      $scope.toVoicemail = function () {
        CallService.toVoicemail($rootScope.currentCall.callSid)
          .then(function (response) {
            $rootScope.currentCall.callStatus = 'completed';
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

      $scope.showKeypad = function (ev) {
        $mdDialog.show({
          controller: 'KeypadDialogController',
          controllerAs: 'vm',
          templateUrl: 'app/main/workspace/dialogs/keypad.html',
          parent: angular.element($document.body),
          targetEvent: ev,
          clickOutsideToClose: true
        });
      };

      $scope.complete = function (task) {
        if (task.isInGoingCall()) {
          if (angular.isDefined(task.disposition) && task.disposition) {
            CallService.updateCall(task).then(function (res) {
              console.log('call disposition updated!');
            }, function (err) {
              console.log(err);
            });
          }
          $rootScope.closeTab();
        }

        if (angular.isDefined(task.attributes) && task.attributes.channel === 'chat') {
          $scope.$broadcast('DestroyChat', {chatTask: task});
          var index = $rootScope.chatTasks.indexOf(task);
          $rootScope.chatTasks.splice(index, 1);
        }


        // TODO not sure whether to include inboundCalls. task.complete() is needed?
        if (!$rootScope.chatTasks.length && !$rootScope.reservations.length) {
          $rootScope.workerJS.update('ActivitySid', $rootScope.configuration.twilio.workerIdleActivitySid, function (err, worker) {

            if (err) {
              $log.error(err);
              return;
            }

            $scope.$apply();

          });
        }


      };



      $scope.acceptInboundCall = function (task) {
        $rootScope.currentCall = task;
        var index = $rootScope.extensionCallTasks.indexOf(task);
        $rootScope.extensionCallTasks.splice(index, 1);
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
        }, 800);

      };

      $scope.declineInboundCall = function (task) {
        CallService.toVoicemail(task.callSid)
          .then(function (response) {
            task.stopCallTimer();
            var index = $rootScope.extensionCallTasks.indexOf(task);
            $rootScope.extensionCallTasks.splice(index, 1);
          })
      };


      $scope.changeCurrentCall = function (selectedTask) {
        if ($rootScope.currentCall === selectedTask) {
          return;
        }
        $rootScope.currentCall = selectedTask;
        if ($rootScope.currentCall.isCompleted()) {
          if (Twilio.Device.activeConnection()) {
            $http.get(apiUrl + 'api/agents/agentToSilence?caller_sid=' + Twilio.Device.activeConnection().parameters.CallSid, {withCredentials: true});
          }
        }
        else {
          CallService.getActiveConnSid(function(ActiveConnSid) {
            $http.get(apiUrl + 'api/agents/agentToConference?caller_sid=' + ActiveConnSid + '&roomName=' + $rootScope.currentCall.conferenceName, {withCredentials: true});
          });
        }
      };

      $scope.isActive = function (task) {
        return ($rootScope.currentCall === task);
      };


      $rootScope.closeTab = function () {
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
          });
        }

      };

      $scope.logout = function () {
        $http.post(apiUrl + 'api/agents/logout')

          .then(function onSuccess(response) {
            window.location.replace('/access/login');

          }, function onError(response) {

            $log.error(response);

          });

      };

      // ChatController

      $scope.$on('DestroyChat', function (event, data) {

        $log.log('DestroyChat event received');

        data.chatTask.channel.leave().then(function () {
          $log.log('channel left');
          data.chatTask.channel = null;
        });

        data.chatTask.messages = [];
        data.chatTask.session.isInitialized = false;
        data.chatTask.session.channelSid = null;

      });

      $scope.setupClient = function (newChatTask) {

        $log.log('setup channel: ' + newChatTask.session.channelSid);

        if (!angular.isDefined($rootScope.accessManager)) {
          $rootScope.accessManager = new Twilio.AccessManager($rootScope.session.token);
        }

        if (!angular.isDefined($rootScope.messagingClient)) {
          $rootScope.messagingClient = new Twilio.Chat.Client($rootScope.session.token, { logLevel: 'debug' });
        }

        /**
         * you'll want to be sure to listen to the tokenExpired event either update
         * the token via accessManager.updateToken(<token>) or let your page tell the user
         * the chat is not active anymore
         **/
        $rootScope.accessManager.on('tokenExpired', function () {
          $log.error('live chat token expired');
        });

        $rootScope.accessManager.on('error', function () {
          $log.error('An error occurred');
        });


        var promise = $rootScope.messagingClient.getChannelBySid(newChatTask.session.channelSid);

        promise.then(function (channel) {
          $log.log('channel is: ' + channel.uniqueName);
          $scope.setupChannel(channel, newChatTask);
        }, function (reason) {
          /* client could not access the channel */
          $log.error(reason);
        });

      };

      $scope.setupChannel = function (channel, newChatTask) {

        channel.join().then(function (member) {

          /* first we read the history of this channel, afterwards we join */
          channel.getMessages(3).then(function(page) {
            page.items.forEach(function (message) {
              $scope.addMessage(message, newChatTask);
            });

            $log.log('Total Messages in Channel:' + channel.getMessagesCount());

            newChatTask.messages.push({
              body: 'You are now connected to the customer',
              author: 'System'
            });

            /* use now joined the channel, display canvas */
            newChatTask.session.isInitialized = true;
            newChatTask.session.isLoading = false;

            $scope.$apply();

          });

        });

        channel.on('messageAdded', function (message) {
          $scope.addMessage(message, newChatTask);
        });

        channel.on('memberJoined', function (member) {
          newChatTask.messages.push({
            body: member.identity + ' has joined the channel.',
            author: 'System'
          });
          $scope.$apply();

        });

        channel.on('memberLeft', function (member) {
          newChatTask.messages.push({
            body: member.identity + ' has left the channel.',
            author: 'System'
          });
          $scope.$apply();
        });

        channel.on('typingStarted', function (member) {
          $log.log(member.identity + ' started typing');
          newChatTask.typingNotification = member.identity + ' is typing ...';
          $scope.$apply();
        });

        channel.on('typingEnded', function (member) {
          $log.log(member.identity + ' stopped typing');
          newChatTask.typingNotification = '';
          $scope.$apply();
        });

        newChatTask.channel = channel;

      };

      /* if the message input changes the user is typing */
      // $scope.$watch('task.sendMessage', function (newValue, oldValue) {
      //   console.log('I am typing');
      //   console.log(newValue);
      //   if (task.channel) {
      //     $log.log('send typing notification to channel');
      //     task.channel.typing();
      //   }
      // });

      $scope.send = function (index) {
        var task = $rootScope.chatTasks[index];
        if (task.sendMessage) {
          task.channel.sendMessage(task.sendMessage);
          task.sendMessage = '';
        }
      };

      $scope.callInlineNumber = function (phone) {
        $log.log('call inline number ' + phone);
        $rootScope.$broadcast('CallPhoneNumber', {phoneNumber: phone});
      };

      $scope.addMessage = function (message, newChatTask) {

        var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

        var m = message.body;
        var template = '<p>$1<span class="chat-inline-number" ng-click="callInlineNumber(\'$2\')">$2</span>$3</p>';

        if (pattern.test(message.body) === true) {
          m = message.body.replace(pattern, template);
        }

        newChatTask.messages.push({body: m, author: message.author, timestamp: message.timestamp});
        $scope.$apply();

      };

      $scope.mockCalls = function(number) {
        for (var n=0; n<number; n++){
          var callParams = {fromNumber: 12345, duration: 0, callSid: 'CA12345', conferenceName: 'ConferenceTest'};
          $rootScope.currentCall = new OutboundCall(callParams);
          $rootScope.callTasks.push($rootScope.currentCall);
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
