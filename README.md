# Updated

Added functionality:

* Api accessible via `carousel` property of scope
* Now uses 5 slides instead of 3
* `ng-carousel-options` attribute can be used to set `speed`, `onChange` etc
* Cross-browser compatability improved thanks to `Modernizr`


## Installation

`bower install angular-carousel2`


## Demo

http://homerjam.github.io/angular-carousel/


## Example

```
<div ng-carousel="slide in slides" ng-carousel-options="{ onChange: 'onChangeSlide', clickSpeed: 500, keySpeed: 500 }">

	<div class="slide">

		<img src="{{slide.src}}" />

	</div>

</div>
```