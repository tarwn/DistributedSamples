define(['knockout',
		'app/Constants' ],
function(ko,
		 CONST ){

	function MessageResponse(message, status, payload){
		var self = this;

		self.message = message;
		self.status = status;
		self.payload = payload;

		self.display = {
			startX: ko.observable(0),
			startY: ko.observable(0),
			x: ko.observable(200),
			y: ko.observable(0),
			time: ko.observable(CONST.DEFAULTS.TRANSMIT_TIME),
			delivered: function(){}
		};
		self.display.description = ko.computed(function(){
			if(self.payload != null)
				return self.message.name + "(" + status + ") " + payload;
			else
				return self.message.name + "(" + status + ")";
		});
	}

	return MessageResponse;

});