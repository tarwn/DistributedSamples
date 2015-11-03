define(['knockout', 
		'bluebird',
		'app/Constants' ],
function(ko, 
		 Promise,
		 CONST ){

	function Network(logFunction){
		var self = this;
		
		self.nodes = ko.observableArray([]);
		self.messages = ko.observableArray([]);

		self.deliverMessage = function(message, node){
			logFunction(message.display.description + ' sent to node ' + node.name);
			
			return new Promise(function(resolve){
				message.display.x(node.display.x() - 100); 
				message.display.y(node.display.y()); // add offset for number of outstanding messages to process?
				message.display.time(CONST.DEFAULTS.TRANSMIT_TIME);
				message.display.delivered = resolve;
				// begin delivery animation
				self.messages.push(message);
			})
			.delay(CONST.DEFAULTS.TRANSMIT_HUMAN_READ_TIME)
			.then(function(){
				self.messages.remove(message);
				return node.processNewMessage(message);
			})
			.delay(CONST.DEFAULTS.TRANSMIT_HUMAN_READ_TIME)
			.then(function(messageResponse){
				return self.deliverMessageResponse(messageResponse, node);
			});
		};

		self.deliverMessageResponse = function(response, node){
			return new Promise(function(resolve){
				response.display.startX(node.display.x() - 100); 
				response.display.startY(node.display.y());
				response.display.x(0); 
				response.display.y(0);
				response.display.time(CONST.DEFAULTS.TRANSMIT_TIME);
				response.display.delivered = resolve;
				// begin delivery
				self.messages.push(response);
			})
			.then(function(){
				if(response.payload != null){
					logFunction(response.message.display.description + ' response from node ' + node.name + ': ' + response.status + ' [' + response.payload + ']');
				}
				else{
					logFunction(response.message.display.description + ' response from node ' + node.name + ': ' + response.status);
				}
				
				self.messages.remove(response);
			});
		}

	}

	return Network;

});