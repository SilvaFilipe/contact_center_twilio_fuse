(function ()
{
    'use strict';

    angular
        .module('app.auth')
        .controller('ResetPasswordController', ResetPasswordController);

    /** @ngInject */
    function ResetPasswordController($http, $rootScope, $state, EnvironmentConfig)
    {
      var vm = this;
      vm.form = {};
      var apiUrl = $rootScope.apiBaseUrl;
      vm.logoUrl = EnvironmentConfig.logoUrl;

      vm.resetPassword = function () {
        $http.post(apiUrl + 'api/reset/' + $state.params.token, {password: vm.form.password}, {withCredentials: true})
          .then(function(res) {
            console.log(res);
            $("#forgot-password .title").html(res.data.message).removeClass("error").addClass("success").css("font-size", "15px");
            $state.go('auth.login');
          }, function (err) {
            console.log(err);
            $("#forgot-password .title").html(err.data.message).removeClass("success").addClass("error").css("font-size", "15px").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
          });
      }

    }
})();
