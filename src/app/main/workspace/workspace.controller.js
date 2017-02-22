(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication')
        .controller('WorkflowController', WorkflowController)
        .directive('dynamic', dynamic)
        .filter('time', time);

    function time() {
      return function(value) {
        return moment(value).format('HH:mm');
      };
    }

    function dynamic($compile) {
      return {
        restrict: 'A',
        replace: true,
        link: function (scope, ele, attrs) {
          scope.$watch(attrs.dynamic, function(html) {
            ele.html(html);
            $compile(ele.contents())(scope);
          });
        }
      };
    }

    /** @ngInject */
    function WorkflowController($scope, $rootScope, $http, $interval, $log, $timeout, $mdSidenav, CallService)
    {
      var vm = this;

      vm.toggleLeftSidenav = function(sidenavId) {
        $mdSidenav(sidenavId).toggle();
      };

      /* misc configuration data, for instance callerId for outbound calls */
      $scope.configuration;

      /* contains task data pushed by the TaskRouter JavaScript SDK */
      $scope.reservation;
      $scope.tasks;
      $scope.callTasks = [];
      $scope.currentCall = null;

      /* contains worker record received by the Twilio API or the TaskRouter JavaScript SDK */
      $scope.worker;

      /* TaskRouter Worker */
      $scope.workerJS;

      $http.get('/api/users/me')
        .then(function (response) {
          $scope.user = response.data.user;
      });

      /* request configuration data and tokens from the backend */
      $scope.init = function () {

        $http.get('/api/agents/session')

          .then(function onSuccess(response) {

            /* keep a local copy of the configuration and the worker */
            $scope.configuration = response.data.configuration;

            /* initialize Twilio worker js with token received from the backend */
            $scope.initWorker(response.data.tokens.worker);

            /* initialize Twilio client with token received from the backend */
            $rootScope.$broadcast('InitializePhone', { token: response.data.tokens.phone});

            /* initialize Twilio IP Messaging client with token received from the backend */
            $rootScope.$broadcast('InitializeChat', { token: response.data.tokens.chat, identity: response.data.worker.friendlyName});

          }, function onError(response) {

            /* session is not valid anymore */
            if(response.status == 403){
              window.location.replace('/login');
            } else {
              alert(JSON.stringify(response));
            }

          });

      };

      $timeout(function () { $scope.init(); }, 1000);



      $scope.initWorker = function(token) {

        /* create TaskRouter Worker */
        $scope.workerJS = new Twilio.TaskRouter.Worker(token, true, $scope.configuration.twilio.workerIdleActivitySid, $scope.configuration.twilio.workerOfflineActivitySid);

        $scope.workerJS.on('ready', function(worker) {

          $log.log('TaskRouter Worker: ready');

          $scope.worker = worker;

        });


        $scope.workerJS.on('reservation.created', function(reservation) {

          $log.log('TaskRouter Worker: reservation.created');
          $log.log(reservation);

          $scope.reservation = reservation;
          $scope.$apply();

          $scope.startReservationCounter();

        });

        $scope.workerJS.on('reservation.accepted', function(reservation) {

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
          console.log(reservation.task.attributes);
          var caller_sid = reservation.task.attributes.call_sid;
          var agent_sid = reservation.task.attributes.worker_call_sid;
          $scope.$apply();
          //$http.post('/api/taskrouter/moveToConference?task_sid=' + reservation.task.sid + '&caller_sid=' + caller_sid +'&agent_sid=' + agent_sid);

        });

        $scope.workerJS.on('reservation.timeout', function(reservation) {

          $log.log('TaskRouter Worker: reservation.timeout');
          $log.log(reservation);

          /* reset all data */
          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

        });

        $scope.workerJS.on('reservation.rescinded', function(reservation) {

          $log.log('TaskRouter Worker: reservation.rescinded');
          $log.log(reservation);

          /* reset all data */
          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

        });

        $scope.workerJS.on('reservation.canceled', function(reservation) {

          $log.log('TaskRouter Worker: reservation.cancelled');
          $log.log(reservation);

          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

        });

        $scope.workerJS.on('activity.update', function(worker) {

          $log.log('TaskRouter Worker: activity.update');
          $log.log(worker);

          $scope.worker = worker;
          $scope.$apply();

        });

        $scope.workerJS.on('token.expired', function() {

          $log.log('TaskRouter Worker: token.expired');

          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

          /* the worker token expired, the agent shoud log in again, token is generated upon log in */
          window.location.replace('/workspace_login');

        });

      };

      $scope.acceptReservation = function (reservation) {

        $log.log('accept reservation with TaskRouter Worker JavaScript SDK');

        /* depending on the typ of taks that was created we handle the reservation differently */
        if(reservation.task.attributes.channel == 'chat'){

          reservation.accept(

            function(err, reservation) {

              if(err) {
                $log.error(err);
                return;
              }

              $scope.$broadcast('ActivateChat', { channelSid: reservation.task.attributes.channelSid });

            });


        }

        if(reservation.task.attributes.channel == 'phone' && reservation.task.attributes.type == 'inbound_call'){

          $log.log('dequeue reservation with  callerId: ' + $scope.configuration.twilio.callerId);
          //reservation.dequeue($scope.configuration.twilio.callerId);
          //reservation.dequeue($scope.configuration.twilio.callerId, $scope.configuration.twilio.workerIdleActivitySid, 'record-from-answer');
          //reservation.conference($scope.configuration.twilio.callerId, $scope.configuration.twilio.workerIdleActivitySid, 'record-from-answer');

          reservation.accept(
            function(error, reservation) {
              if(error) {
                console.log(error.code);
                console.log(error.message);
                return;
              }
              console.log("reservation accepted");
              console.log(reservation);
              $http.post('/api/taskrouter/agentToConference?task_sid=' + reservation.task.sid + '&agent_uri=' + $scope.worker.attributes.contact_uri + '&caller_number=' + reservation.task.attributes.from + '&reservation_sid=' + reservation.sid);
              if ($scope.currentCall) {
                CallService.holdOn($scope.currentCall.callSid)
                  .then(function (response) {
                    if (response.data === 'OK') {
                      $scope.currentCall.onhold = true;
                      $scope.currentCall = {fromNumber: reservation.task.attributed.from, type: 'inbound', duration: $scope.task.age, callSid: $scope.task.attributes.call_sid,
                        onhold: false, recording: false, muted: false, taskSid: $scope.task.attributes.id, direction: 'inbound', createdAt: new Date(), callStatus: 'active'};
                      $scope.callTasks.push($scope.currentCall);
                      $scope.stopWorkingCounter();
                      $scope.startWorkingCounter();
                      console.log($scope.currentCall);
                    }
                  })
              }
              else {
                $scope.currentCall = {fromNumber: reservation.task.attributes.from, type: 'inbound', duration: reservation.task.age, callSid: reservation.task.attributes.call_sid,
                  onhold: false, recording: false, muted: false, taskSid: reservation.task.attributes.id, direction: 'inbound', createdAt: new Date(), callStatus: 'active'};
                $scope.callTasks.push($scope.currentCall);
                $scope.startWorkingCounter();
                console.log($scope.currentCall);
              }

            }
          );

        }

        /* we accept the reservation and initiate a call to the customer's phone number */
        if(reservation.task.attributes.channel == 'phone' && reservation.task.attributes.type == 'callback_request'){

          reservation.accept(

            function(err, reservation) {

              if(err) {
                $log.error(err);
                return;
              }

              $rootScope.$broadcast('CallPhoneNumber', { phoneNumber: reservation.task.attributes.phone });

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
            console.log('hangup', response);
            $scope.currentCall.callStatus = 'completed';
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
            $scope.callTasks.forEach(function(eachCall) {
              eachCall.muted = true;
            });
          });
      };

      $scope.muteOff = function () {
        CallService.muteOff()
          .then(function () {
            $scope.callTasks.forEach(function(eachCall) {
              eachCall.muted = false;
            });
          });
      };

      $scope.complete = function (reservation) {
        $scope.stopWorkingCounter();

        if($scope.task.attributes.channel == 'chat'){
          $scope.$broadcast('DestroyChat');
        }

        $scope.task.complete();

        $scope.workerJS.update('ActivitySid', $scope.configuration.twilio.workerIdleActivitySid, function(err, worker) {

          if(err) {
            $log.error(err);
            return;
          }

          $scope.reservation = null;
          $scope.task = null;
          $scope.$apply();

        });

      };

      $scope.callPhoneNumber = function(phoneNumber){
        $rootScope.$broadcast('CallPhoneNumber', { phoneNumber: phoneNumber });
      };

      $scope.$on('NewOutBoundingCall', function(event, data) {
        $log.log('call: ' + data.phoneNumber);
        // when new outbounding call is dialed and currently on call, currentCall should be on hold
        if ($scope.currentCall) {
          CallService.holdOn($scope.currentCall.callSid)
            .then(function (response) {
              console.log(response);
              if (response.data === 'OK') {
                $scope.currentCall.onhold = true;
                $scope.currentCall = {fromNumber: data.phoneNumber, type: 'outbound', duration: 0, callSid: data.callSid, onhold: false, recording: false, muted: false, taskSid: null,
                  direction: 'outbound',createdAt: new Date(), callStatus: 'active'};
                $scope.callTasks.push($scope.currentCall);
                console.log($scope.currentCall);
                $scope.stopWorkingCounter();
                $scope.startWorkingCounter();
              }
            })
        }
        else {
          $scope.currentCall = {fromNumber: data.phoneNumber, type: 'outbound', duration: 0, callSid: data.callSid, onhold: false, recording: false, muted: false, taskSid: null,
            direction: 'outbound',createdAt: new Date(), callStatus: 'active'};
          $scope.callTasks.push($scope.currentCall);
          $scope.startWorkingCounter();
        }

      });

      $scope.$on('endAllOutCalls', function(event){
        $log.log('end all outbounding calls');
        $scope.callTasks = $scope.callTasks.filter(function(callItem) {
          return callItem.type != 'outbound';
        });

        if ($scope.callTasks.length == 0) {
          $scope.currentCall = null;
        }
      });

      $scope.changeCurrentCall = function (selectedTask) {
        // hold current call
        CallService.holdOn($scope.currentCall.callSid)
          .then(function (response) {
            if (response.data === 'OK') {
              $scope.currentCall.onhold = true;
              // change currentCall to active tab's call and make it hold off
              $scope.currentCall = selectedTask;
              $scope.holdOff();
              $scope.stopWorkingCounter();
              $scope.startWorkingCounter();
            }
          })
      };

      $scope.$watch('currentCall.callStatus', function(newVal, oldVal){
        if (newVal == 'completed') {
          $scope.stopWorkingCounter();
        }
      });

      $scope.closeTab = function () {
        var index = $scope.callTasks.indexOf($scope.currentCall);
        $scope.callTasks.splice(index, 1);
        if (index == $scope.callTasks.length && index != 0) {
          $scope.currentCall = $scope.callTasks[0];
          $scope.holdOff();
        }
        else if ($scope.callTasks.length > 0) {
          $scope.currentCall = $scope.callTasks[index];
          $scope.holdOff();
        }
        else {
          $scope.currentCall = null;
        }

      };

      $scope.logout = function () {
        $scope.stopWorkingCounter();

        $http.post('/api/agents/logout')

          .then(function onSuccess(response) {

            window.location.replace('/workspace_login');

          }, function onError(response) {

            $log.error(response);

          });

      };

      $scope.startReservationCounter = function() {

        $log.log('start reservation counter');
        $scope.reservationCounter = $scope.reservation.task.age;

        $scope.reservationInterval = $interval(function() {
          $scope.reservationCounter++;
        }, 1000);

      };

      $scope.stopReservationCounter = function() {

        if (angular.isDefined($scope.reservationInterval)) {
          $interval.cancel($scope.reservationInterval);
          $scope.reservationInterval = undefined;
        }

      };

      $scope.startWorkingCounter = function() {

        $log.log('start working counter');
        $scope.workingCounter = $scope.currentCall.duration;
        $scope.workingInterval = $interval(function() {
          $scope.workingCounter ++;
        }, 1000);

      };

      $scope.stopWorkingCounter = function() {
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

      $scope.$on('DestroyChat', function(event) {

        $log.log('DestroyChat event received');

        $scope.channel.leave().then(function() {
          $log.log('channel left');
          $scope.channel = null;
        });

        $scope.messages = [];
        $scope.session.isInitialized = false;
        $scope.session.channelSid = null;

      });

      $rootScope.$on('InitializeChat', function(event, data) {

        $log.log('InitializeChat event received');
        $log.log(data);

        /* clean up  */
        $scope.message = null;
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

      $scope.$on('ActivateChat', function(event, data) {

        $log.log('ActivateChat event received');
        $log.log(data);

        $scope.session.channelSid = data.channelSid;

        $scope.session.isLoading = true;
        $scope.setupClient($scope.session.channelSid);

      });

      $scope.setupClient = function(channelSid){

        $log.log('setup channel: ' + channelSid);
        var accessManager = new Twilio.AccessManager($scope.session.token);

        /**
         * you'll want to be sure to listen to the tokenExpired event either update
         * the token via accessManager.updateToken(<token>) or let your page tell the user
         * the chat is not active anymore
         **/
        accessManager.on('tokenExpired', function(){
          $log.error('live chat token expired');
        });

        accessManager.on('error', function(){
          $log.error('An error occurred');
        });

        var messagingClient = new Twilio.IPMessaging.Client(accessManager);

        var promise = messagingClient.getChannelBySid(channelSid);

        promise.then(function(channel) {
          $log.log('channel is: ' + channel.uniqueName);
          $scope.setupChannel(channel);
        }, function(reason) {
          /* client could not access the channel */
          $log.error(reason);
        });

      };

      $scope.setupChannel = function(channel){

        channel.join().then(function(member) {

          /* first we read the history of this channel, afterwards we join */
          channel.getMessages().then(function(messages) {
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

        channel.on('messageAdded', function(message) {
          $scope.addMessage(message);
        });

        channel.on('memberJoined', function(member) {
          $scope.messages.push({
            body: member.identity + ' has joined the channel.',
            author: 'System'
          });
          $scope.$apply();

        });

        channel.on('memberLeft', function(member) {
          $scope.messages.push({
            body: member.identity + ' has left the channel.',
            author: 'System'
          });
          $scope.$apply();
        });

        channel.on('typingStarted', function(member) {
          $log.log(member.identity + ' started typing');
          $scope.typingNotification = member.identity + ' is typing ...';
          $scope.$apply();
        });

        channel.on('typingEnded', function(member) {
          $log.log(member.identity + ' stopped typing');
          $scope.typingNotification = '';
          $scope.$apply();
        });

        $scope.channel = channel;

      };

      /* if the message input changes the user is typing */
      $scope.$watch('message', function(newValue, oldValue) {
        if($scope.channel){
          $log.log('send typing notification to channel');
          $scope.channel.typing();
        }
      });

      $scope.send = function(){
        $scope.channel.sendMessage($scope.message);
        $scope.message = '';
      };

      $scope.callInlineNumber = function(phone){
        $log.log('call inline number ' + phone);
        $rootScope.$broadcast('CallPhoneNumber', { phoneNumber: phone });
      };

      $scope.addMessage = function(message){

        var pattern = /(.*)(\+[0-9]{8,20})(.*)$/;

        var m = message.body;
        var template = '<p>$1<span class="chat-inline-number" ng-click="callInlineNumber(\'$2\')">$2</span>$3</p>';

        if (pattern.test(message.body) == true) {
          m = message.body.replace(pattern, template);
        }

        $scope.messages.push({body: m, author: message.author, timestamp: message.timestamp});
        $scope.$apply();

      };

    }


})();
