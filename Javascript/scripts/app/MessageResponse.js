define(['knockout',
		'app/Constants' ],
function(ko,
		 CONST ){

	function MessageResponse(simulationSettings, message, statusCode, statusMessage, payload){
		var self = this;

		self.type = message.type;

		self.message = message;
		self.statusCode = statusCode;
		self.statusMessage = statusMessage;
		self.payload = payload;

		self.display = {
			startX: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_X + 50),
			startY: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_Y),
			x: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_X),
			y: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_Y),
			time: ko.observable(CONST.DEFAULTS.UNDEFINED_DELIVERY_TIME),
			isGood: ko.observable(statusCode < 300),
			statusDescription: statusCode + ' ' + statusMessage,
			delivered: function(){}
		};
		self.display.description = ko.computed(function(){
			if(self.payload != null)
				return self.message.name + "(" + self.display.statusDescription + ") " + payload;
			else
				return self.message.name + "(" + self.display.statusDescription + ")";
		});
	}

	return MessageResponse;

});