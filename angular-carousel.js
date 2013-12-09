(function() {

    'use strict';

    angular.module('angular-carousel', ['ngTouch']);

    angular.module('angular-carousel')
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
                                snapThreshold: 0.1
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
                                $.extend(defaults, scope.$eval(attr.ngCarouselOptions));
                            }

                            var transEndEventNames = {
                                'WebkitTransition': 'webkitTransitionEnd', // Saf 6, Android Browser
                                'MozTransition': 'transitionend', // only for FF < 15
                                'transition': 'transitionend' // IE10, Opera, Chrome, FF 15+, Saf 7+
                            };

                            var pfxTransitionEnd = transEndEventNames[Modernizr.prefixed('transition')];
                            var pfxTransitionDuration = Modernizr.prefixed('transitionDuration');

                            var api = {
                                goToPage: function(_page) {
                                    pageIndex = _page;

                                    setFramesPageId();

                                    flip();
                                },
                                nextPage: function(speed) {
                                    if (scope[listIdentifier].length < 2) {
                                        return false;
                                    }

                                    flipPage('next', speed !== undefined ? speed : defaults.speed);
                                },
                                prevPage: function(speed) {
                                    if (scope[listIdentifier].length < 2) {
                                        return false;
                                    }

                                    flipPage('prev', speed !== undefined ? speed : defaults.speed);
                                }
                            };
                            
                            scope.carousel = api;
                            
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

                                $(frame.element).attr('data-index', i);

                                if (i === 2) {
                                    $(frame.element).addClass('current');
                                }
                            }

                            // Now the frames are ready. We need to position them and prepare the first few frames.
                            // The content loading is handled by Angular, when we change the valueIdentifier value on the scope of a frame.

                            var page = 0; // The notional page in the infinite scrolling.
                            var pageIndex = 0; // The index of that page in the array.

                            // Makes sure the 'left' values of all frames are set correctly.
                            function repositionFrames() {
                                frames[0].element.css('left', page * 100 - 200 + '%');
                                frames[1].element.css('left', page * 100 - 100 + '%');
                                frames[2].element.css('left', page * 100 + '%');
                                frames[3].element.css('left', page * 100 + 100 + '%');
                                frames[4].element.css('left', page * 100 + 200 + '%');

                                setFramesPageId();

                                flip();
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
                                    repositionFrames();
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

                                scope.slideWidth = frames[2].element.children().width();
                                scope.slideHeight = frames[2].element.children().height();

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

                            function moveFrame(from, to) {
                                /*jshint validthis: true */
                                this.splice(to, 0, this.splice(from, 1)[0]);
                            }

                            function moveSlider(x) {
                                sliderX = x;
                                slider[0].style[Modernizr.prefixed('transform')] = 'translate(' + x + 'px, 0)';
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

                                    moveFrame.apply(frames, [frames.length-1, 0]);

                                    frames[0].element.css('left', page * 100 - 200 + '%');
                                    frames[1].element.css('left', page * 100 - 100 + '%');

                                } else {
                                    page = forceDir ? page + 1 : -Math.floor(sliderX / viewportWidth);

                                    pageIndex = pageIndex === scope[listIdentifier].length - 1 ? 0 : pageIndex + 1;

                                    moveFrame.apply(frames, [0, frames.length-1]);

                                    frames[3].element.css('left', page * 100 + 100 + '%');
                                    frames[4].element.css('left', page * 100 + 200 + '%');
                                }

                                setFramesPageId();

                                var newX = -page * viewportWidth;

                                var transDuration = forceDir ? speed : Math.floor(speed * Math.abs(sliderX - newX) / viewportWidth);

                                slider[0].style[pfxTransitionDuration] = transDuration + 'ms';

                                if (sliderX === newX && !forceDir) {
                                    flip(); // If we swiped /exactly/ to the next page.

                                } else {
                                    moveSlider(newX);

                                    $timeout(flip, transDuration);
                                }
                            }

                            function flip() {
                                for (var i = 0; i < 5; i++) {
                                    frames[i].scope[valueIdentifier] = scope[listIdentifier][frames[i].pageId];

                                    if (!frames[i].scope.$$phase) {
                                        frames[i].scope.$apply();
                                    }
                                }

                                if (!scope.$$phase) {
                                    scope.$apply();
                                }

                                if (defaults.onChange !== '' && typeof(scope[defaults.onChange]) === 'function') {
                                    $timeout(function(){
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
                                    slider[0].style[pfxTransitionDuration] = '0s';
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
                                        flipPage( coords.x < viewportWidth * 0.5 ? 'prev' : 'next', defaults.clickSpeed);
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
                                        api.prevPage(defaults.keySpeed);
                                    break;
                                    case 39:
                                        api.nextPage(defaults.keySpeed);
                                    break;
                                }
                            }

                            var resizeEvent = 'onorientationchange' in $window ? 'orientationchange' : 'resize';

                            $($window).on(resizeEvent+'.carousel', resize);
                            $document.on('keydown.carousel', keyDown);

                            scope.$on('$destroy', function(){
                                $($window).off(resizeEvent+'.carousel', resize);
                                $document.off('keydown.carousel', keyDown);
                            });

                        };
                    }
                };
            }
        ]);
})();