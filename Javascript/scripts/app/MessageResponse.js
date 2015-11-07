define(['knockout',
		'app/Constants' ],
function(ko,
		 CONST ){

	function MessageResponse(simulationSettings, message, status, payload){
		var self = this;

		self.message = message;
		self.status = status;
		self.payload = payload;

		self.display = {
			startX: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_X + 50),
			startY: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_Y),
			x: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_X),
			y: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_Y),
			time: ko.observable(CONST.DEFAULTS.UNDEFINED_DELIVERY_TIME),
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