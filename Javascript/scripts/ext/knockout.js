define(['knockout-base', 'jquery'],
function(ko, $){

	ko.bindingHandlers.deliverMessage = {
		init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
			if(valueAccessor().display.startX() != null){
				$(element).css({ 'left': valueAccessor().display.startX() + 'px' });
			}

			if(valueAccessor().display.startY() != null){
				$(element).css({ 'top': valueAccessor().display.startY() + 'px' });
			}

			$(element).stop();
			var animation = { left: valueAccessor().display.x() + 'px', top: valueAccessor().display.y() + 'px' }
			$(element).animate(animation, valueAccessor().display.time(), null, valueAccessor().display.delivered);
	   }
	};

	ko.bindingHandlers.deliverMessage2 = {
		init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
			if(valueAccessor().display.startX() != null){
				$(element).css({ 'left': valueAccessor().display.startX() + 'px' });
			}

			if(valueAccessor().display.startY() != null){
				$(element).css({ 'top': valueAccessor().display.startY() + 'px' });
			}

			$(element).stop();
			var animation = { left: valueAccessor().display.endX() + 'px', top: valueAccessor().display.endY() + 'px' }
			$(element).animate(animation, valueAccessor().display.time(), null, valueAccessor().display.delivered);
	   }
	};

	return ko;
});