(function() {

    'use strict';

    angular.module('angular-carousel-odr', ['ngTouch']);

    angular.module('angular-carousel-odr')
        .directive('ngCarousel', ['$swipe', '$timeout', '$log', '$window', '$document',
            function($swipe, $timeout, $log, $window, $document) {
                return {
                    restrict: 'AC',
                    transclude: true,
                    template: '<div class="carousel-container">' + '<div class="carousel-wrapper">' + '<div class="carousel-slider" ng-transclude></div>' + '</div>' + '</div>',
                    compile: function(_element, _attr, linker) {
                        return function link(scope, element, attr) {

                            var defaults = {
                                onChange: '',
                                speed: 500,
                                clickSpeed: 500,
                                keySpeed: 500,
                                snapThreshold: 0.1,
                                prevClickDisabled: false,
                                autoCycle: false,
                                cycleDelay: false
                            };

                            // Parse the values out of the attr value.
                            var expression = attr.ngCarousel;
                            var match = expression.match(/^\s*(.+)\s+in\s+(.*?)\s*$/);
                            var valueIdentifier, listIdentifier;

                            if (!match) {
                                $log.error('Expected ngCarousel in form of "_item_ in _array_" but got "' + expression + '".');
                            }

                            valueIdentifier = match[1];
                            listIdentifier = match[2];

                            if (attr.ngCarouselOptions !== undefined) {
                                angular.extend(defaults, scope.$eval(attr.ngCarouselOptions));
                            }

                            var transEndEventNames = {
                                'WebkitTransition': 'webkitTransitionEnd', // Saf 6, Android Browser
                                'MozTransition': 'transitionend', // only for FF < 15
                                'transition': 'transitionend' // IE10, Opera, Chrome, FF 15+, Saf 7+
                            };

                            var pfxTransitionEnd = transEndEventNames[Modernizr.prefixed('transition')];
                            var pfxTransitionDuration = Modernizr.prefixed('transitionDuration');

                            if (typeof(scope.carousel) !== 'object') {
                                scope.carousel = {};
                            }

                            scope.carousel.goToPage = function(_page) {
                                pageIndex = _page;

                                setFramesPageId();

                                flip();
                            };
                            scope.carousel.nextPage = function(speed) {
                                if (scope[listIdentifier].length < 2) {
                                    return false;
                                }

                                flipPage('next', speed !== undefined ? speed : defaults.speed);
                            };
                            scope.carousel.prevPage = function(speed) {
                                if (scope[listIdentifier].length < 2) {
                                    return false;
                                }

                                flipPage('prev', speed !== undefined ? speed : defaults.speed);
                            };

                            scope.carousel.pauseCycle = function() {
                                $timeout.cancel(scope.auto_cycle);
                            };

                            scope.carousel.autoCycle = function() {
                                autoCycle();
                            };

                            var container = element.children();
                            var slider = container.children();

                            // Empty out the slider.
                            var templateFrame = slider.children();
                            slider.children().remove();
                            slider.append('<!-- ngCarousel -->');

                            function _linker(frame) {
                                linker(frame.scope, function(clone) {
                                    var frameClone = templateFrame.clone();
                                    frameClone.children().replaceWith(clone);
                                    slider.append(frameClone);
                                    frame.element = frameClone;
                                });
                            }

                            // Holds the 'frames' that are reused.
                            var frames = [];
                            for (var i = 0; i < 5; i++) {
                                var frame = {};
                                frame.scope = scope.$new();
                                frames.push(frame);

                                _linker(frame);

                                angular.element(frame.element).attr('data-index', i);

                                if (i === 2) {
                                    angular.element(frame.element).addClass('current');
                                }
                            }

                            // Now the frames are ready. We need to position them and prepare the first few frames.
                            // The content loading is handled by Angular, when we change the valueIdentifier value on the scope of a frame.

                            var page; // The notional page in the infinite scrolling.
                            var pageIndex = 0; // The index of that page in the array.

                            function init() {
                                repositionFrames();

                                moveSlider(0);

                                setFramesPageId();

                                flip();

                                if (defaults.autoCycle) {
                                    autoCycle();
                                }
                            }

                            // Makes sure the 'left' values of all frames are set correctly.
                            function repositionFrames() {
                                page = 0;

                                frames[0].element.css('left', page * 100 - 200 + '%');
                                frames[1].element.css('left', page * 100 - 100 + '%');
                                frames[2].element.css('left', page * 100 + '%');
                                frames[3].element.css('left', page * 100 + 100 + '%');
                                frames[4].element.css('left', page * 100 + 200 + '%');
                            }

                            function setFramesPageId() {
                                frames[0].pageId = pageIndex === 0 ? scope[listIdentifier].length - 2 : pageIndex === 1 ? scope[listIdentifier].length - 1 : pageIndex - 2;
                                frames[1].pageId = pageIndex === 0 ? scope[listIdentifier].length - 1 : pageIndex - 1;
                                frames[2].pageId = pageIndex;
                                frames[3].pageId = pageIndex === scope[listIdentifier].length - 1 ? 0 : pageIndex + 1;
                                frames[4].pageId = pageIndex === scope[listIdentifier].length - 1 ? 1 : pageIndex === scope[listIdentifier].length - 2 ? 0 : pageIndex + 2;
                            }

                            scope.$watch(listIdentifier, function(n) {
                                if (n !== undefined) {
                                    init();
                                }
                            });

                            var startX, pointX;
                            var sliderX = 0;
                            var viewportWidth, viewportHeight, snapThreshold;

                            var moved = false;
                            var direction;

                            function _resize() {
                                scope.carouselWidth = viewportWidth = container[0].clientWidth;
                                scope.carouselHeight = viewportHeight = container[0].clientHeight;

                                scope.slideWidth = Number(parseFloat(frames[2].element.children().css('width')).toFixed(3));
                                scope.slideHeight = Number(parseFloat(frames[2].element.children().css('height')).toFixed(3));

                                snapThreshold = Math.round(viewportWidth * defaults.snapThreshold);
                            }

                            _resize();

                            function resize() {
                                _resize();

                                if (!scope.$$phase) {
                                    scope.$apply();
                                }

                                slider[0].style[pfxTransitionDuration] = '0s';

                                moveSlider(-page * viewportWidth);
                            }

                            var resetTimeout;

                            // reset left/translate positions (improves resizing performance)
                            function reset() {
                                if (direction !== undefined) {
                                    repositionFrames();
                                    moveSlider(0);
                                }
                            }

                            function moveFrame(from, to) {
                                /*jshint validthis: true */
                                this.splice(to, 0, this.splice(from, 1)[0]);
                            }

                            function moveSlider(x, transDuration) {
                                transDuration = transDuration || 0;
                                sliderX = x;
                                slider[0].style[Modernizr.prefixed('transform')] = 'translate(' + x + 'px, 0)';
                                slider[0].style[pfxTransitionDuration] = transDuration + 'ms';
                            }

                            function flipPage(forceDir, speed) {
                                switch (forceDir) {
                                    case 'next':
                                        direction = -1;
                                        forceDir = true;
                                        break;
                                    case 'prev':
                                        direction = 1;
                                        forceDir = true;
                                        break;
                                    default:
                                        forceDir = false;
                                        break;
                                }

                                speed = speed !== undefined ? speed : defaults.speed;

                                if (direction > 0) {
                                    page = forceDir ? page - 1 : -Math.ceil(sliderX / viewportWidth);

                                    pageIndex = pageIndex === 0 ? scope[listIdentifier].length - 1 : pageIndex - 1;

                                    moveFrame.apply(frames, [frames.length - 1, 0]);

                                    frames[0].element.css('left', page * 100 - 200 + '%');
                                    frames[1].element.css('left', page * 100 - 100 + '%');

                                } else {
                                    page = forceDir ? page + 1 : -Math.floor(sliderX / viewportWidth);

                                    pageIndex = pageIndex === scope[listIdentifier].length - 1 ? 0 : pageIndex + 1;

                                    moveFrame.apply(frames, [0, frames.length - 1]);

                                    frames[3].element.css('left', page * 100 + 100 + '%');
                                    frames[4].element.css('left', page * 100 + 200 + '%');
                                }

                                setFramesPageId();

                                var newX = -page * viewportWidth;

                                var transDuration = forceDir ? speed : Math.floor(speed * Math.abs(sliderX - newX) / viewportWidth);

                                if (sliderX === newX && !forceDir) {
                                    flip(); // If we swiped /exactly/ to the next page.

                                } else {
                                    moveSlider(newX, transDuration);

                                    $timeout.cancel(resetTimeout);
                                    resetTimeout = $timeout(reset, transDuration);

                                    $timeout(flip, transDuration);
                                }
                            }

                            function flip() {
                                for (var i = 0; i < 5; i++) {
                                    frames[i].scope[valueIdentifier] = scope[listIdentifier][frames[i].pageId];

                                    if (!frames[i].scope.$$phase) {
                                        frames[i].scope.$apply();
                                    }

                                    if (i === 2) {
                                        angular.element(frames[i].element).addClass('current');
                                    } else {
                                        angular.element(frames[i].element).removeClass('current');
                                    }
                                }

                                if (!scope.$$phase) {
                                    scope.$apply();
                                }

                                if (defaults.onChange !== '' && typeof(scope[defaults.onChange]) === 'function') {
                                    $timeout(function() {
                                        scope[defaults.onChange](pageIndex);
                                    }, 0);
                                }
                            }

                            $swipe.bind(slider, {
                                start: function(coords) {
                                    if (scope[listIdentifier].length < 2) {
                                        return false;
                                    }

                                    moved = false;
                                    startX = coords.x;
                                    pointX = coords.x;
                                    direction = 0;
                                    slider[0].style[pfxTransitionDuration] = '0ms';
                                },

                                move: function(coords) {
                                    if (scope[listIdentifier].length < 2) {
                                        return false;
                                    }

                                    var deltaX = coords.x - pointX;
                                    var newX = sliderX + deltaX;
                                    var dist = Math.abs(coords.x - startX);

                                    moved = true;
                                    pointX = coords.x;
                                    direction = deltaX > 0 ? 1 : deltaX < 0 ? -1 : 0;

                                    moveSlider(newX);
                                },

                                end: function(coords, e) {
                                    if (scope[listIdentifier].length < 2 || (Modernizr.touch && e.type !== 'touchend')) {
                                        return false;
                                    }

                                    var x = coords && coords.x || pointX;
                                    var dist = Math.abs(x - startX);

                                    if (!moved) {
                                        flipPage(coords.x < viewportWidth * 0.5 && !defaults.prevClickDisabled ? 'prev' : 'next', defaults.clickSpeed);
                                        return false;
                                    }

                                    if (dist < snapThreshold) {
                                        slider[0].style[pfxTransitionDuration] = Math.floor(300 * dist / snapThreshold) + 'ms';
                                        moveSlider(-page * viewportWidth);

                                    } else {
                                        flipPage();
                                    }
                                }
                            });

                            function keyDown(e) {
                                switch (e.keyCode) {
                                    case 37:
                                        scope.carousel.prevPage(defaults.keySpeed);
                                        break;
                                    case 39:
                                        scope.carousel.nextPage(defaults.keySpeed);
                                        break;
                                }
                            }

                            function autoCycle() {
                                var delay = defaults.cycleDelay ? defaults.cycleDelay : defaults.speed;
                                scope.auto_cycle = $timeout(function(){
                                    scope.carousel.nextPage();
                                    autoCycle();
                                },delay);
                            };

                            var resizeEvent = 'onorientationchange' in $window ? 'orientationchange' : 'resize';

                            angular.element($window).on(resizeEvent, resize);
                            $document.on('keydown', keyDown);

                            scope.$on('$destroy', function() {
                                angular.element($window).off(resizeEvent, resize);
                                $document.off('keydown', keyDown);
                            });

                        };
                    }
                };
            }
        ]);
})();
