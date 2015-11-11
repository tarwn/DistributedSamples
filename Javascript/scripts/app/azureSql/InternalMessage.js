define(['knockout',
		'app/azureSql/Constants',
		'app/Constants',
		'app/Message' ],
function(ko,
		AZURECONST,
		CONST,
		Message){

	function InternalMessage(simulationSettings, nodeName, internalMessageType, payload){
		Message.call(this, simulationSettings, 'I-' + nodeName, CONST.MessageTypes.Internal, payload);

		var self = this;

		self.internalType = internalMessageType;

		self.display.description = ko.computed(function(){
			if(self.payload != null)
				return "[" + self.name + '] ' + self.internalType + ' ' + payload;
			else
				return "[" + self.name + '] ' + self.internalType;
		});
	}

	InternalMessage.prototype = Object.create(Message.prototype);

	return InternalMessage;

});