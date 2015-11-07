define(['knockout',
		'app/Constants' ],
function(ko,
		 CONST){

	function Message(simulationSettings, name, messageType, payload){
		var self = this;
		self.name = name;
		self.type = messageType;
		self.payload = payload;

		self.display = {
			startX: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_X),
			startY: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_Y),
			x: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_X + 50),
			y: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_Y),
			time: ko.observable(CONST.DEFAULTS.UNDEFINED_DELIVERY_TIME),
			delivered: function(){}
		};
		self.display.description = ko.computed(function(){
			if(self.type == CONST.MessageTypes.Write)
				return self.name + ' (' + self.type[0] + ' ' + payload + ')';
			else if(self.type == CONST.MessageTypes.Read)
				return self.name + ' (' + self.type[0] + ' ' + payload + ')';
			else
				return self.name + ' (' + self.type[0] + ')';
		});
	}

	return Message;

});