(function ()
{
    'use strict';

    angular
        .module('app.auth')
        .controller('ForgotPasswordController', ForgotPasswordController);

    /** @ngInject */
    function ForgotPasswordController($http, $rootScope)
    {
      var vm = this;
      vm.form = {};
      var apiUrl = $rootScope.apiBaseUrl;
      vm.isSubmitted = false;

      vm.sendRecoverEmail = function () {
        console.log('send password recover email ', vm.form.email);
        $http.post(apiUrl + 'api/reset/forgot', {email: vm.form.email}, {withCredentials: true})
          .then(function(res) {
            console.log(res);
            $("#forgot-password .title").html(res.data.message).removeClass("error").addClass("success").css("font-size", "15px");
            vm.isSubmitted = true;
          }, function (err) {
              console.log(err);
            $("#forgot-password .title").html(err.data.message).removeClass("success").addClass("error").css("font-size", "15px").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
          });

      }
    }
})();
