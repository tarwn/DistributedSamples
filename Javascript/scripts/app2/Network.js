define(['knockout', 
		'bluebird',
		'app2/Constants',
		'app2/MessageResponse' ],
function(ko, 
		 Promise,
		 CONST,
		 MessageResponse ){

	function Network(simulationSettings, displaySettings, logFunction){
		var self = this;
		
		self.nodes = ko.observableArray([]);
		self.messages = ko.observableArray([]);

		self.isInitialized = ko.observable(false);
		self.initialize = function(){
			return Promise.resolve()
			.then(function(){
				return simulationSettings.networkInitializeProcessor();
			})
			.then(function(){
				self.isInitialized(true);
			});
		};

		self._getUnreachableResponse = function(message){
			return new MessageResponse(simulationSettings, message, 503, "Unreachable");
		};

		self._generateMessageDeliveryTime = function(){
			return simulationSettings.timeMultiplier() * (simulationSettings.messageDeliveryTime() + (Math.random() - .5) * simulationSettings.messageDeliveryJitter());
		};

		self.deliverMessage = function(message){
			logFunction(message.display.description() + ' sent to node ' + message.receiver.name);
			var node = message.receiver;

			return new Promise(function(resolve){
				// time for network communication
				message.display.time(self._generateMessageDeliveryTime());
				// arrival callback
				message.display.delivered = resolve;
				// begin delivery
				self.messages.push(message);
			})
			.delay(simulationSettings.messageAtNodeDelay())
			.then(function(){
				// delivered, remove from messages to be delivered
				self.messages.remove(message);
				// wait for a response from online nodes, generate an unreachable response for offline nodes
				if(node.status() != CONST.NodeStatus.Offline){
					return node.receiveMessage(message);
				}
				else{
					return self._getUnreachableResponse(message);
				}
			})
			.delay(simulationSettings.messageAtNodeDelay())
			.then(function(messageResponse){
				// deliver response to original sender
				return self.deliverMessageResponse(messageResponse);
			});
		};

		self.deliverMessageResponse = function(response, node){
			return new Promise(function(resolve){
				// time for network communication
				response.display.time(self._generateMessageDeliveryTime());
				// arrival callback
				response.display.delivered = resolve;
				// begin delivery
				self.messages.push(response);
			})
			.then(function(){
				if(response.payload != null){
					logFunction(response.originalMessage.display.description() + ' response from node ' + response.sender.name + ': ' + response.display.statusDescription + ' [' + response.payload + ']');
				}
				else{
					logFunction(response.originalMessage.display.description() + ' response from node ' + response.sender.name + ': ' + response.display.statusDescription);
				}
				// delivered, remove from messages to be delivered
				self.messages.remove(response);
				return response;
			});
		};

		self.whenLoaded = self.initialize();
	}

	return Network;

});