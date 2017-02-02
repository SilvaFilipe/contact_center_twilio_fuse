(function ()
{
    'use strict';

    angular
        .module('app.pages.auth.login')
        .controller('LoginController', LoginController);

    /** @ngInject */
    function LoginController($http, $state, $scope)
    {
      var vm = this;
      vm.form = {};
      vm.login = function() {
        console.log(vm.form);
        $http.post('/auth/sign-in', {email: vm.form.email, password: vm.form.password})
          .then(function onSuccess(response) {
            console.log(response);
            $http.get('/api/users/me')
              .then(function (response) {
                console.log(response.data);
                $scope.worker =  {friendlyName: 'w' + response.data._id};
                $scope.login();
              })

          }, function onError(response) {
            console.log(response);

          });

      }

      $scope.login = function(){

        var endpoint = navigator.userAgent.toLowerCase() + Math.floor((Math.random() * 1000) + 1);

        $http.post('/api/agents/login', { worker: $scope.worker, endpoint: endpoint })

          .then(function onSuccess(response) {
            //window.location.replace('/callcenter/workplace.html');
            $state.go('app.workspace');
          }, function onError(response) {

            if(response.status == 404){
              $scope.loginForm.$setValidity('notFound', false);
            } else {
              $scope.loginForm.$setValidity('serverError', false);
            }

          });

      };
    }
})();
