/**
 * CarouselCtrl Module
 *
 * Description
 */
angular.module('CarouselCtrl', []).controller('CarouselCtrl', ['$scope',
    function($scope) {

        $scope.slides = [{
            text: 'Slide 1',
            color: '#C00'
        }, {
            text: 'Slide 2',
            color: '#0C0'
        }, {
            text: 'Slide 3',
            color: '#00C'
        }, {
            text: 'Slide 4',
            color: '#CC0'
        }, {
            text: 'Slide 5',
            color: '#0CC'
        }, {
            text: 'Slide 6',
            color: '#C0C'
        }, {
            text: 'Slide 7',
            color: '#CCC'
        }];

        $scope.onChangeSlide = function(i) {
            console.log('Slide ', i);
        };

    }
]);

/**
 *  CarouselApp Module
 *
 * Description
 */
angular.module('CarouselApp', ['angular-carousel', 'CarouselCtrl']).config(function() {});
