var app = angular.module('profileApplication', ['ngMessages']);

app.controller('ProfileController', function ($scope, $http, $q) {
    $scope.model = {};
    $scope.updateProfile = updateProfile;

    activate();

    function activate() {
        $http.get('/api/users/me')
            .then(function (response) {
                $scope.model = response.data.user;
            })
    }

    function updateProfile(){
        $http.put('/api/users/' + $scope.model._id, $scope.model)
            .then(
                function (response) {
                    console.log(response);
                },
                function (response){
                    console.log(response);
                }
            )

    }

});
