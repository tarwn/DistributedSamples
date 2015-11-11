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
		
		self.headNode = ko.observable();

		var monitorTime = ko.computed(function(){
			return simulationSettings.networkMonitoringTime() / 1000;
		});
		self.isMonitoring = ko.observable(false);
		self.monitoringCountDown = ko.observable(monitorTime());

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
						self.monitoringCountDown(monitorTime());

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
				self._assignHeadNode();
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
			if(self.headNode() == null){
				self._assignHeadNode();
			}
			else if(self.headNode().status() != CONST.NodeStatus.Online){
				if(simulationSettings.networkElectionStyle == CONST.NetworkElectionStyle.Immediate)
					self._assignHeadNode();
			}

			var targetNode = self.headNode();

			if(targetNode == null || targetNode.status() != CONST.NodeStatus.Online){
				return self.deliverMessageResponse(self._getUnreachableResponse(message), self._getUnreachableNode());
			}
			else{
				return self.deliverMessage(message, targetNode);
			}
		}
	}

	Network.prototype = Object.create(NetworkBase.prototype);

	return Network;

});