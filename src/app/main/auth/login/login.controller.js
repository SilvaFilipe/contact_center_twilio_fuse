(function ()
{
    'use strict';

    angular
        .module('app.auth')
        .controller('LoginController', LoginController);

    /** @ngInject */
    function LoginController($http, $state, $scope, $rootScope, authService, EnvironmentConfig) {
      var vm = this;
      vm.form = {};
      vm.logoUrl = EnvironmentConfig.LogoUrl;
      vm.submitting = false;
      vm.login = function() {
        if(vm.submitting) return;
        vm.submitting = true;
        authService.login(vm.form.email, vm.form.password).then(
          function(data){
            console.log(data);
            $state.go('app.workspace');
          },
          function(data) {
            console.log(data);
            $("#login .title").html("Incorrect username or password.").addClass("error").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
          })
          .finally(function(){
            vm.submitting = false;
          });
      };
    }
})();
