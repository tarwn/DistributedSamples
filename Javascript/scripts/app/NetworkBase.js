define(['knockout', 
		'bluebird',
		'app/Constants',
		'app/MessageResponse' ],
function(ko, 
		 Promise,
		 CONST,
		 MessageResponse ){

	function NetworkBase(simulationSettings, logFunction){
		var self = this;
		
		self.nodes = ko.observableArray([]);
		self.onlineNodes = ko.computed(function(){
			return self.nodes().filter(function(node){
				return node.status() == CONST.NodeStatus.Online;
			});
		});
		self.messages = ko.observableArray([]);

		self.initialize = function(){ };

		self.selectRandomOnlineNode = function(){
			if(self.onlineNodes().length == 0)
				return null;

			var randomNodeIndex = Math.floor(Math.random() * self.onlineNodes().length);
			return self.onlineNodes()[randomNodeIndex];
		}

		self._getUnreachableResponse = function(message){
			return new MessageResponse(simulationSettings, message, 503, "Unreachable");
		}

		self._getUnreachableNode = function(){
			return {
				name: '(outage)',
				display: {
					description: ko.observable('no available nodes'),
					x: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_X),
					y: ko.observable(CONST.DEFAULTS.GATEWAY_PORT_Y)
				}
			};
		}

		self._generateMessageDeliveryTime = function(){
			return simulationSettings.messageDeliveryTime() + ((Math.random() - .5) * simulationSettings.messageDeliveryJitter());
		}

		self.deliverMessage = function(message, node){
			logFunction(message.display.description() + ' sent to node ' + node.name);
			
			return new Promise(function(resolve){
				message.display.x(node.display.x() - 100); 
				message.display.y(node.display.y()); // add offset for number of outstanding messages to process?
				message.display.time(self._generateMessageDeliveryTime());
				message.display.delivered = resolve;
				// begin delivery animation
				self.messages.push(message);
			})
			.delay(simulationSettings.messageAtNodeDelay())
			.then(function(){
				self.messages.remove(message);
				if(node.status() != CONST.NodeStatus.Offline){
					return node.processNewMessage(message);
				}
				else{
					return self._getUnreachableResponse(message);
				}
			})
			.delay(simulationSettings.messageAtNodeDelay())
			.then(function(messageResponse){
				return self.deliverMessageResponse(messageResponse, node);
			});
		};

		self.deliverMessageResponse = function(response, node){
			return new Promise(function(resolve){
				response.display.startX(node.display.x() - 100); 
				response.display.startY(node.display.y());
				response.display.x(response.message.display.startX()); 
				response.display.y(response.message.display.startY());
				response.display.time(self._generateMessageDeliveryTime());
				response.display.delivered = resolve;
				// begin delivery
				self.messages.push(response);
			})
			.then(function(){
				if(response.payload != null){
					logFunction(response.message.display.description() + ' response from node ' + node.name + ': ' + response.display.statusDescription + ' [' + response.payload + ']');
				}
				else{
					logFunction(response.message.display.description() + ' response from node ' + node.name + ': ' + response.display.statusDescription);
				}
				
				self.messages.remove(response);
				return response;
			});
		}
	}

	return NetworkBase;

});