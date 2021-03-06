define(['knockout', 
		'bluebird',
		'app/Constants',
		'app/MessageResponse',
		'app/NetworkBase' ],
function(ko, 
		 Promise,
		 CONST,
		 MessageResponse,
		 NetworkBase ){

	function Network(simulationSettings, logFunction){
		NetworkBase.call(this, simulationSettings, logFunction);

		var self = this;
		console.log('here');
		self.headNode = ko.observable();

		var monitorTime = simulationSettings.networkMonitoringTime / 1000;
		self.isMonitoring = ko.observable(false);
		self.monitoringCountDown = ko.observable(monitorTime);

		function monitorForOutages(){
			if(simulationSettings.networkElectionStyle == CONST.NetworkElectionStyle.Polled){
				self.monitoringCountDown(self.monitoringCountDown() - 1);

				if(self.monitoringCountDown() <= 0){
					self.isMonitoring(true);

					setTimeout(function(){
						if(self.headNode() == null || self.headNode().status() != CONST.NodeStatus.Online){
							self._assignHeadNode();
						}
						self.isMonitoring(false);
						self.monitoringCountDown(monitorTime);

						setTimeout(monitorForOutages, 1000);
					}, 500);
				}
				else{
					setTimeout(monitorForOutages, 1000);
				}
			}
		}

		self.initialize = function(){
			return new Promise(function(resolve){
				if(simulationSettings.networkCommunications == CONST.NetworkCommunications.GatewaySendsToPrimary){
					self._assignHeadNode();
				}
				monitorForOutages();
				resolve();
			});
		};

		self._assignHeadNode = function(){
			var newHeadNode = self.selectRandomOnlineNode();
			var oldHeadNode = self.headNode();
			
			self.headNode(newHeadNode);
			self.nodes().forEach(function(node){
				if(node == newHeadNode){
					node.specialStatus("PRIMARY");
				}
				else{
					node.specialStatus("secondary");
				}
			});
		}

		self.getMyNeighbors = function(requestor){
			return self.nodes().filter(function(node){
				return node.name != requestor.name;
			});
		};

		self.deliverExternalMessage = function(message){
			var targetNode = null;
			if(simulationSettings.networkCommunications == CONST.NetworkCommunications.Any){
				targetNode = self.selectRandomOnlineNode();
			}
			else{
				if(self.headNode() == null){
					self._assignHeadNode();
				}
				else if(self.headNode().status() != CONST.NodeStatus.Online){
					if(simulationSettings.networkElectionStyle == CONST.NetworkElectionStyle.Immediate)
						self._assignHeadNode();
				}

				targetNode = self.headNode();
			}

			if(targetNode == null || targetNode.status() != CONST.NodeStatus.Online){
				return self.deliverMessageResponse(self._getUnreachableResponse(message), self._getUnreachableNode());
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
				message.display.time(self._generateMessageDeliveryTime());
				message.display.delivered = resolve;
				// begin delivery animation
				self.messages.push(message);
			})
			.delay(simulationSettings.messageAtNodeDelay)
			.then(function(){
				self.messages.remove(message);
				if(node.status() != CONST.NodeStatus.Offline){
					return node.processNewMessage(message);
				}
				else{
					return self._getUnreachableResponse(message);
				}
			})
			.delay(simulationSettings.messageAtNodeDelay)
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

	Network.prototype = Object.create(NetworkBase.prototype);

	return Network;

});