app.controller('PhoneController', function ($scope, $rootScope, $http, $timeout, $log) {

  $scope.status = null;
  $scope.isActive = false;
  $scope.phoneNumber = '';

  $scope.connection;

  $scope.$on('InitializePhone', function(event, data) {

    $log.log('InitializePhone event received');

    Twilio.Device.setup(data.token, {debug: true});

    Twilio.Device.ready(function (device) {
      $scope.status = 'Ready';
    });

    Twilio.Device.error(function (error) {
      $scope.status = 'error: ' + error.code + ' - ' + error.message;
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
      $scope.phoneNumber = conn.parameters.From;

    });

  });

  $scope.hangup = function (reservation) {

    $timeout(function(){
      Twilio.Device.disconnectAll();
    });

  };

  $scope.call = function (phoneNumber) {

    $scope.$broadcast('CallPhoneNumber', { phoneNumber: phoneNumber});

  };

  $scope.addDigit = function(digit){

    $log.log('send digit: ' + digit);
    $scope.phoneNumber = $scope.phoneNumber + digit;

    if($scope.connection){
      $scope.connection.sendDigits(digit);
    }

  };

  $scope.$on('CallPhoneNumber', function(event, data) {

    $log.log('call: ' + data.phoneNumber);
    $scope.phoneNumber = data.phoneNumber;

    Twilio.Device.connect({'phone': data.phoneNumber});

    $scope.state = 'isActive';

  });



  function bindVolumeIndicators(connection) {
    var inputVolumeBar = document.getElementById('input-volume');
    var volumeIndicators = document.getElementById('volume-indicators');

    connection.volume(function(inputVolume, outputVolume) {
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

});
