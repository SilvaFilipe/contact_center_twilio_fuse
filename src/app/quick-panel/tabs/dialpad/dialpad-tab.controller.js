(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication')
        .controller('PhoneController', PhoneController);

    /** @ngInject */
    function PhoneController($scope, $rootScope, $http, $timeout, $log, $mdSidenav, $mdToast)
    {
      var vm = this;

      $scope.status = null;
      $scope.isActive = false;
      vm.phoneNumber = '';
      $scope.toggleRight = function() {
        $mdSidenav('right').toggle();
      };
     $scope.connection;


      $rootScope.$on('InitializePhone', function(event, data) {

        $log.log('InitializePhone event received');

        Twilio.Device.setup(data.token, {debug: true});

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

          $timeout(function(){
            $scope.$apply();
          });

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

      $scope.hangup = function () {
        addAnimationToButton(event.target);
        $(".callbtn").removeClass("addCall");
        $(".callbtn").addClass("newCall");
        $timeout(function(){
          Twilio.Device.disconnectAll();
        });

      };

      $scope.call = function (phoneNumber) {
        addAnimationToButton(event.target);
        if (!$scope.isAcitve) {
          $(".callbtn").removeClass("newCall");
          $(".callbtn").addClass("addCall");
        }
        $scope.$broadcast('CallPhoneNumber', { phoneNumber: phoneNumber});
      };

      $scope.addDigit = function(digit){

        vm.phoneNumber = vm.phoneNumber + digit;

        addAnimationToButton(event.target);

        if($scope.connection){
          $scope.connection.sendDigits(digit);
        }
        $('.phoneNumberTxt').focus();

      };

      $scope.$on('CallPhoneNumber', function(event, data) {

        $log.log('call: ' + data.phoneNumber);
        vm.phoneNumber = data.phoneNumber;

        Twilio.Device.connect({'phone': data.phoneNumber});

        $scope.state = 'isActive';

      });

      var addAnimationToButton = function(thisButton){
        //add animation
        $(thisButton).removeClass('clicked');
        var _this = thisButton;
        setTimeout(function(){
          $(_this).addClass('clicked');
        },1);
      };

      $scope.goBack = function (event) {
        addAnimationToButton(event.target);
        vm.phoneNumber = vm.phoneNumber.substring(0, vm.phoneNumber.length - 1);
        $('.phoneNumberTxt').focus();
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

    }

})();
