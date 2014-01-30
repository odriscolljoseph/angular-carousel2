# angular-carousel-odr

A carousel directive for angularjs

* Api accessible via `carousel` property of scope
* `ng-carousel-options` attribute can be used to set `speed`, `onChange` etc
* Cross-browser compatability thanks to `Modernizr`


## Installation

`bower install angular-carousel-odr`


## Demo

http://odriscolljoseph.github.io/angular-carousel-odr/


## Example

```
<div ng-carousel="slide in slides" ng-carousel-options="{ onChange: 'onChangeSlide', clickSpeed: 500, keySpeed: 500 }">

	<div class="slide">

		<img src="{{slide.src}}" />

	</div>

</div>
```