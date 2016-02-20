define(['knockout', 
		'jquery',
		'bluebird',
		'app2/Constants',
		'app2/Expectation',
		'app2/Message'],
function(ko, 
		 $,
		 Promise,
		 CONST,
		 Expectation,
		 Message ){

	function ViewModel(simulationSettings, displaySettings, Network){
		var self = this;

		// display
		self.display = {
			description: ko.computed(function(){
				return //self.network.onlineNodes().length + 
						//" of " + self.network.nodes().length + " nodes online, " +
						self.network.nodes().length + " nodes, " +
						simulationSettings.display.description();
			})
		};

		var externalNetworkGateway = {
			display: {
				x: ko.observable(0),
				y: ko.observable(0)
			}
		};

		// lower level logging
		self.logContents = ko.observableArray([]);
		self.log = function(logMessage){
			self.logContents.unshift(logMessage);
		};
		
		// initialization
		self.isInitialized = ko.observable(false);
		self.initialize = function(){
			return Promise.resolve()
			.then(function(){
				return simulationSettings.viewModelInitialize(self.network);
			})
			.then(function(){
				return refreshNodeLayout();
			})
			.then(function(){
				return self.network.initialize();
			})
			.then(function(){
				subscribeToNetworkNodeCollectionChanges();
				self.isInitialized(true);
			});
		};

		// network and nodes

		self.network = new Network(simulationSettings, displaySettings, self.log);

		function subscribeToNetworkNodeCollectionChanges(){
			self.network.nodes().forEach(function(node){
				node.status.subscribe(function(newValue){
					if(newValue == CONST.NodeStatus.Offline){
						self.expectations.outages.outageCount(self.expectations.outages.outageCount() + 1);
					}
				});
			});

			self.network.nodes.subscribe(function(changes){
				changes.forEach(function(change){
					if(change.status == 'added'){
						node.status.subscribe(function(newValue){
							if(newValue == CONST.NodeStatus.Offline){
								self.expectations.outages.outageCount(self.expectations.outages.outageCount() + 1);
							}
						});
					}
				});

				refreshNodeLayout();
			});
		}

		function refreshNodeLayout(){
			return new Promise(function(resolve){
				var verticalScreenOffset = -.95 * displaySettings.nodeHeight/2; //expectedNodeHeight/2;
				var horizantalScreenOffset = -75;	// bump everything left

				// center point of circle
				var centerX = displaySettings.width/2;
				var centerY = displaySettings.height/2;

				// radius of circle
				var radius = 0;
				if(displaySettings.width < displaySettings.height){
					radius = displaySettings.width/2 - displaySettings.nodeHeight/2;
				}
				else{
					radius = displaySettings.height/2 - displaySettings.nodeHeight/2;
				}

				// invert radius to flip circle
				radius = -1 * radius;

				// degrees between items
				var numPoints = self.network.nodes().length;
				var step = (Math.PI * 2) / numPoints

				// now position them equidistantly around the circle
				for(var i = 0; i < self.network.nodes().length; i++){
					var node = self.network.nodes()[i];
					node.display.x( centerX + radius * Math.sin(step * i) + horizantalScreenOffset);
					node.display.y( centerY + radius * Math.cos(step * i) + verticalScreenOffset );
				}

				resolve();
			});
		};

		// -- Simulation - needs review/refactor/rewrite

		var msgCount = 0;
		self.isPaused = ko.observable(true);
		self.isRunning = ko.observable(false);
		self.pauseLabel = ko.computed(function(){
			return self.isPaused() ? "run" : "pause";
		});
		self.togglePause = function(){
			self.isPaused(!self.isPaused());
			if(self.isPaused() == false && self.isRunning() == false){
				if(executionScript.length > 0){
					executeScript();
				}
				else{
					generateMessage();
				}
			}
		};

		self.speedFast = function(){
			if(simulationSettings.timeMultiplier() > 1){
				simulationSettings.timeMultiplier(simulationSettings.timeFast);
			}
		};
		self.speedSlow = function(){
			simulationSettings.timeMultiplier(simulationSettings.timeSlow);
		};
		self.toggleSpeed = function(){
			if(simulationSettings.timeMultiplier() > simulationSettings.timeFast){
				self.speedFast();
			}
			else{
				self.speedSlow();
			}
		};

		self.isMonkeyActive = ko.observable(false);
		self.isMonkeyRunning = ko.observable(false);
		self.monkeyLabel = ko.computed(function(){
			return self.isMonkeyActive() ? "cage the monkey" : "unleash the monkey";
		});
		self.toggleMonkey = function(){
			self.isMonkeyActive(!self.isMonkeyActive());
			if(self.isMonkeyActive() && self.isMonkeyRunning() == false){
				startTheMonkey();
			}
		};

		self.externalResults = ko.observableArray();
		self.logExternalResults = function(results){
			self.externalResults.unshift(results);

			if(results.category == 'Read'){
				self.expectations.reads.totalCount(self.expectations.reads.totalCount() + 1);
				switch(results.status){
					case 'Good':
						self.expectations.reads.goodCount(self.expectations.reads.goodCount() + 1);
						break;
					case 'Stale':
						self.expectations.reads.staleCount(self.expectations.reads.staleCount() + 1);
						break;
					case 'InvalidValue':
						self.expectations.reads.invalidCount(self.expectations.reads.invalidCount() + 1);
						break;
					case 'Bad':
						self.expectations.reads.badCount(self.expectations.reads.badCount() + 1);
						break;
					case 'Error':
						self.expectations.reads.errorCount(self.expectations.reads.errorCount() + 1);
						break;
				}
			}
			else if(results.category == 'Write'){
				self.expectations.writes.totalCount(self.expectations.writes.totalCount() + 1);
				switch(results.status){
					case 'Good':
						self.expectations.writes.goodCount(self.expectations.writes.goodCount() + 1);
						break;
					case 'Error':
						self.expectations.writes.errorCount(self.expectations.writes.errorCount() + 1);
						break;
				}
			}
		};
		self.expectations = {};
		self.expectations.reads = {
			totalCount:	ko.observable(0),
			goodCount:	ko.observable(0),
			staleCount: ko.observable(0),
			invalidCount: ko.observable(0),
			badCount: ko.observable(0),
			errorCount: ko.observable(0)
		};
		self.expectations.reads.goodPercent = ko.computed(function(){
			if(self.expectations.reads.totalCount() == 0)
				return "n/a";
			else
				return Math.round(100.0 * self.expectations.reads.goodCount() / self.expectations.reads.totalCount()) + "%";
		});
		self.expectations.writes = {
			totalCount: ko.observable(0),
			goodCount:	ko.observable(0),
			errorCount: ko.observable(0)
		};
		self.expectations.writes.goodPercent = ko.computed(function(){
		if(self.expectations.writes.totalCount() == 0)
				return "n/a";
			else
				return Math.round(100.0 * self.expectations.writes.goodCount() / self.expectations.writes.totalCount()) + "%";
		});
		self.expectations.outages = {
			outageCount: ko.observable(0)
		};

		// -- Keys for messages
		self.potentialDataKeys = {};
	
		self.setAvailableHashKeys = function(dataKeys){
			self.potentialDataKeys = {};
			dataKeys.forEach(function(dataKey){
				self.potentialDataKeys[dataKey] = [];
			});
		};

		// -- Generate random traffic for network
		
		self.startRandomMessageGeneration = function(){
			generateMessage();
		};

		function generateMessage() {
			if(self.isPaused())
				return;

			msgCount++;

			self.isRunning(true);
			var completeRun = function(){
				self.isRunning(false);
				setTimeout(generateMessage, simulationSettings.messageAtNodeDelay);
			};

			var randomDataKeyIndex = Math.floor(Math.random() * Object.keys(self.potentialDataKeys).length);
			var randomDataKey = Object.keys(self.potentialDataKeys)[randomDataKeyIndex];
			var operationType = (Math.random() < .5) ? CONST.MessageTypes.Read : CONST.MessageTypes.Write;

			if(operationType == CONST.MessageTypes.Write){
				var newValue = "" + Math.floor(Math.random() * 500);

				var targetNode = simulationSettings.getIncomingNode(self.network.nodes());
				var message = new Message(simulationSettings, externalNetworkGateway, targetNode, "M" + msgCount, CONST.MessageTypes.Write, randomDataKey + ":" + newValue);
				self.network.deliverMessage(message).then(function(response){
					if(response.statusCode == 200){
						self.potentialDataKeys[randomDataKey].unshift(newValue);
					}

					var result = evaluateWriteResponse(randomDataKey, response);
					self.logExternalResults(result);
					completeRun();
				});
			}
			else{
				// if no value has been stored anywhere yet, try another random message/target
				if(self.potentialDataKeys[randomDataKey].length == 0){
					generateMessage();
					return;
				}

				var targetNode = simulationSettings.getIncomingNode(self.network.nodes());
				var message = new Message(simulationSettings, externalNetworkGateway, targetNode, "M" + msgCount, CONST.MessageTypes.Read, randomDataKey);
				self.network.deliverMessage(message).then(function(response){
					var result = evaluateReadResponse(randomDataKey, response);
					self.logExternalResults(result);
					completeRun();
				});			
			}
		}

		// -- Generate scripted traffic for network
		var executionScript = [];
		var executionScriptStep = 0;
		self.startExternalMessageScript = function(scriptEntries){
			executionScript = scriptEntries;
			executeScript();
		}

		function executeScript(){
			if(self.isPaused())
				return;

			if(executionScript.length == 0)
				return;

			var operation = executionScript[executionScriptStep];

			msgCount++;

			self.isRunning(true);
			var completeRun = function(delayTime){
				if(operation.limit != null && operation.limitCount == null)
					operation.limitCount = operation.limit || 1;	// no 0's

				if(delayTime == null)
					delayTime = simulationSettings.messageAtNodeDelay;

				if(operation.limitCount != null){
					operation.limitCount--;

					if(operation.limitCount == 0){ 
						operation.limitCount = operation.limit;	// reset to limit in case we loop
						executionScriptStep++
					}
				}
				else{
					executionScriptStep++
				}

				self.isRunning(false);
				setTimeout(executeScript, delayTime);
			};

			if(operation.election != null){
				self.network.assignHeadNode(getNode(operation.election));
				completeRun(0);
			}
			else if(operation.offline != null){
				var node = getNode(operation.offline);
				node.setOffline();
				completeRun();
			}
			else if(operation.online != null){
				var node = getNode(operation.online);
				node.setOnline().then(function(){
					completeRun();
				});
			}
			else if(operation.execute != null){
				operation.execute();
				completeRun(0);
			} 
			else if(operation.loop != null){
				executionScriptStep = operation.loop - 1;
				completeRun(0);
			}
			else if(operation.random){
				generateMessage();
				completeRun(0);
			}
			else if(operation.wait){
				completeRun(operation.wait * 1000);
			}
			else if(operation.operationType == CONST.MessageTypes.Write){
				var randomDataKeyIndex = Math.floor(Math.random() * Object.keys(self.potentialDataKeys).length);
				var randomDataKey = Object.keys(self.potentialDataKeys)[randomDataKeyIndex];
				var newValue = "" + Math.floor(Math.random() * 500);

				var targetNode = simulationSettings.getIncomingNode(self.network.nodes());
				var message = new Message(simulationSettings, externalNetworkGateway, targetNode, "M" + msgCount, CONST.MessageTypes.Write, randomDataKey + ":" + newValue);
				self.network.deliverMessage(message).then(function(response){
					if(response.statusCode == 200){
						self.potentialDataValues[randomDataKey].unshift(newValue);
					}

					var result = evaluateWriteResponse(randomDataKey, response);
					self.logExternalResults(result);
					completeRun();
				});
			}
			else{
				var randomDataKeyIndex = Math.floor(Math.random() * Object.keys(self.potentialDataKeys).length);
				var randomDataKey = Object.keys(self.potentialDataKeys)[randomDataKeyIndex];

				// if no value has been stored anywhere yet, try another random message/target
				if(self.potentialDataKeys[randomDataKey].length == 0){
					executeScript();
					return;
				}

				var targetNode = simulationSettings.getIncomingNode(self.network.nodes());
				var message = new Message(simulationSettings, externalNetworkGateway, targetNode, "M" + msgCount, CONST.MessageTypes.Read, randomDataKey);
				self.network.deliverMessage(message).then(function(response){
					var result = evaluateReadResponse(randomDataKey, response);
					self.logExternalResults(result);
					completeRun();
				});			
			}
		}

		function getNode(nodeName){
			var foundNodes = self.network.nodes().filter(function(node){
				return node.name == nodeName;
			});
			if(foundNodes.length == 1){
				return foundNodes[0];
			}
			else{
				throw new Error("Found " + foundNodes.length + " nodes named '" + nodeName + "'");
			}
		}

		function evaluateWriteResponse(dataKey, response){
			if(response.statusCode == 200){
				return new Expectation('Write', 'Good', "Write " + response.originalMessage.payload + " -> " + response.display.statusDescription);
			}
			else{
				return new Expectation('Write', 'Error', "Write " + response.originalMessage.payload + " -> " + response.display.statusDescription);
			}
		}

		function evaluateReadResponse(dataKey, response){
			if(response.statusCode == 200){
				var historyNumber = self.potentialDataValues[dataKey].indexOf(response.payload);
				if(historyNumber == -1){
					return new Expectation('Read', 'InvalidValue', "Read " + response.originalMessage.payload + " -> " + response.display.statusDescription + " :: Received Invalid Value => " + response.payload);
				}
				else if(historyNumber == 0) {
					return new Expectation('Read', 'Good', "Read " + response.originalMessage.payload + " -> " + response.display.statusDescription + " :: Received Current => " + response.payload);
				}
				else {
					return new Expectation('Read', 'Stale', "Read " + response.originalMessage.payload + " -> " + response.display.statusDescription + " :: Received " + historyNumber + " Out Of Date => " + response.payload);
				}
			}
			else if(response.status == 404){
				return new Expectation('Read', 'Bad', "Read " + response.originalMessage.payload + " -> " + response.display.statusDescription);
			}
			else {
				return new Expectation('Read', 'Error', "Read " + response.originalMessage.payload + " -> " + response.display.statusDescription);
			}
		}

		function startTheMonkey(){
			if(!self.isMonkeyActive())
				return;
			self.isMonkeyRunning(true);

			var targetNode = self.network.selectRandomOnlineNode();
			var offlineDiff = simulationSettings.maximumOfflineNodeRepairTime() - 1000;
			var onlineTime = (Math.random() * offlineDiff) + 1000;

			targetNode.setOffline();
			setTimeout(function(){	
				targetNode.setOnline();		
				self.logExternalResults(new Expectation('Network', CONST.NodeStatus.Online, targetNode.name + " is online"));
			}, onlineTime);

			self.logExternalResults(new Expectation('Network', CONST.NodeStatus.Offline, targetNode.name + " is offline"));

			self.isMonkeyRunning(false);
			var betweenOutagesDiff = simulationSettings.maximumTimeBetweenOutages() - simulationSettings.minimumTimeBetweenOutages();
			setTimeout(startTheMonkey, (Math.random() * betweenOutagesDiff) + simulationSettings.minimumTimeBetweenOutages());
		}

		self.whenLoaded = self.initialize();
	}

	return ViewModel;

});