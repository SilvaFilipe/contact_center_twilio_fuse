var app = angular.module('profileApplication', ['ngMessages']);

app.controller('ProfileController', function ($scope, $http, $q) {
    $scope.model = {};
    $scope.updateProfile = updateProfile;

    activate();

    function activate() {
        $http.get('/api/users/me')
            .then(function (response) {
                $scope.model = response.data;
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

})
.directive('isEmpty', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            //console.log(scope, element, attrs)
            var ngModel = element.find('input').controller('ngModel');
            scope.$watch(function () {
                return ngModel.$modelValue
            }, function (newVal) {
                if(newVal && newVal.length){
                    element.removeClass('is-empty');
                }else{
                    element.addClass('is-empty');
                }
            })
        }
    }
});
