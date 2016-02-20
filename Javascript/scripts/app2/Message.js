define(['knockout',
		'app/Constants' ],
function(ko,
		 CONST){

	function Message(simulationSettings, sender, receiver, name, messageType, payload){
		var self = this;
		self.sender = sender;
		self.receiver = receiver;
		self.name = name;
		self.type = messageType;
		self.payload = payload;
		self.isForQuorum = false;
		
		self.display = {
			startX: ko.observable(sender.display.x() + 50),
			startY: ko.observable(sender.display.y()),
			endX: ko.observable(receiver.display.x() - 120),
			endY: ko.observable(receiver.display.y() + 20),
			time: ko.observable(0),
			isGood: ko.observable(true),
			delivered: function(){}
		};
		self.display.description = ko.computed(function(){
			if(payload != null)
				return "[" + self.name + '] ' + self.type + ' ' + payload;
			else
				return "[" + self.name + '] ' + self.type;
		});

		self.cloneForQuorumOperation = function(sender, receiver){
			var clone = new Message(simulationSettings, sender, receiver, 'Q-' + name, messageType, payload);
			clone.isForQuorum = true;
			return clone;
		};
	}

	return Message;

});