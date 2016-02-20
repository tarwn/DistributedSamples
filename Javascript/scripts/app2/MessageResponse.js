define(['knockout',
		'app/Constants' ],
function(ko,
		 CONST ){

	function MessageResponse(simulationSettings, originalMessage, statusCode, statusMessage, payload){
		var self = this;

		self.type = originalMessage.type;

		self.originalMessage = originalMessage;
		self.statusCode = statusCode;
		self.statusMessage = statusMessage;
		self.payload = payload;

		self.sender = originalMessage.receiver;
		self.receiver = originalMessage.sender;

		self.display = {
			startX: ko.observable(self.sender.display.x() - 120),
			startY: ko.observable(self.sender.display.y() + 20),
			endX: ko.observable(self.receiver.display.x() + 50),
			endY: ko.observable(self.receiver.display.y()),
			time: ko.observable(0),
			isGood: ko.observable(statusCode < 300),
			statusDescription: statusCode + ' ' + statusMessage,
			delivered: function(){}
		};
		self.display.description = ko.computed(function(){
			if(self.payload != null)
				return "[" + self.originalMessage.name + "] " + self.display.statusDescription + " " + payload;
			else
				return "[" + self.originalMessage.name + "] " + self.display.statusDescription;
		});
	}

	return MessageResponse;

});