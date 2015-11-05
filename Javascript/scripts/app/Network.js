define(['knockout', 
		'bluebird',
		'app/Constants' ],
function(ko, 
		 Promise,
		 CONST ){

	function Network(networkDeliveryStyle, logFunction){
		var self = this;
		
		self.nodes = ko.observableArray([]);
		self.headNode = ko.observable();	// only used for NetworkSelectedHead style
		self.messages = ko.observableArray([]);

		self.selectRandomNode = function(){
			var randomNodeIndex = Math.floor(Math.random() * self.nodes().length);
			return self.nodes()[randomNodeIndex];
		}

		self.assignHeadNode = function(){
			self.headNode(self.selectRandomNode());
			self.nodes().forEach(function(node){
				if(node == self.headNode()){
					self.headNode().specialStatus("NH");
				}
				else{
					self.headNode().specialStatus();
				}
			});
		}

		self.deliverExternalMessage = function(message){
			var targetNode = null;
			if(networkDeliveryStyle == CONST.NETWORK_STYLE.Any){
				targetNode = self.selectRandomNode();
			}
			else{
				if(self.headNode() == null)
					self.assignHeadNode();
				targetNode = self.headNode();
			}

			return self.deliverMessage(message, targetNode);
		}

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
				return response;
			});
		}

	}

	return Network;

});