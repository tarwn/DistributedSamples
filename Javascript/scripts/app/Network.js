define(['knockout', 
		'bluebird',
		'app/Constants',
		'app/MessageResponse' ],
function(ko, 
		 Promise,
		 CONST,
		 MessageResponse ){

	function Network(networkDeliveryStyle, electionTiming, logFunction){
		var self = this;
		
		self.nodes = ko.observableArray([]);
		self.onlineNodes = ko.computed(function(){
			return self.nodes().filter(function(node){
				return node.status() == CONST.NODE_STATUS.Online;
			});
		});
		self.headNode = ko.observable();	// only used for NetworkSelectedHead style
		self.messages = ko.observableArray([]);


		function ensureHeadServerIsAvailable(){
			if(networkDeliveryStyle == CONST.NETWORK_STYLE.NetworkSelectedHead && electionTiming == CONST.ELECTION_TIMING.Polled){
				if(self.headNode() == null || self.headNode().status() != CONST.NODE_STATUS.Online){
					self.assignHeadNode();
				}

				setTimeout(ensureHeadServerIsAvailable, 10000);
			}
		}

		self.initialize = function(){
			ensureHeadServerIsAvailable();
		};

		self.selectRandomOnlineNode = function(){
			if(self.onlineNodes().length == 0)
				return null;

			var randomNodeIndex = Math.floor(Math.random() * self.onlineNodes().length);
			return self.onlineNodes()[randomNodeIndex];
		}

		self.assignHeadNode = function(){
			var newHeadNode = self.selectRandomOnlineNode();
			self.headNode(newHeadNode);
			self.nodes().forEach(function(node){
				if(node == newHeadNode){
					self.headNode().specialStatus("NH");
				}
				else{
					self.headNode().specialStatus(null);
				}
			});
		}

		function getUnreachableResponse(message){
			return new MessageResponse(message, "503 Unreachable");
		}

		function getUnreachableNode(){
			return {
				name: '(outage)',
				display: {
					description: ko.observable('no available nodes'),
					x: ko.observable(0),
					y: ko.observable(0)
				}
			};
		}

		self.deliverExternalMessage = function(message){
			var targetNode = null;
			if(networkDeliveryStyle == CONST.NETWORK_STYLE.Any){
				targetNode = self.selectRandomOnlineNode();
			}
			else{
				if(self.headNode() == null){
					self.assignHeadNode();
				}
				else if(self.headNode().status() != CONST.NODE_STATUS.Online){
					self.headNode().specialStatus(null);
					self.headNode(null);

					if(electionTiming == CONST.ELECTION_TIMING.Immediate)
						self.assignHeadNode();
				}

				targetNode = self.headNode();
			}

			if(targetNode == null || targetNode.status() != CONST.NODE_STATUS.Online){
				return self.deliverMessageResponse(getUnreachableResponse(message), getUnreachableNode());
			}
			else{
				return self.deliverMessage(message, targetNode);
			}
		}

		self.deliverMessage = function(message, node){
			logFunction(message.display.description() + ' sent to node ' + node.name);
			
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
					logFunction(response.message.display.description() + ' response from node ' + node.name + ': ' + response.status + ' [' + response.payload + ']');
				}
				else{
					logFunction(response.message.display.description() + ' response from node ' + node.name + ': ' + response.status);
				}
				
				self.messages.remove(response);
				return response;
			});
		}
	}

	return Network;

});