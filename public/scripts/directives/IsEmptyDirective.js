app.directive('isEmpty', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            //console.log(scope, element, attrs)
            var ngModel = element.find('input').controller('ngModel');
            scope.$watch(function () {
                return ngModel.$modelValue
            }, function (newVal) {
                element.toggleClass('is-empty', !(newVal && newVal.length));

            })
        }
    }
});