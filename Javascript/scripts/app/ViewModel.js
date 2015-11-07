define(['knockout', 
		'jquery',
		'bluebird',
		'app/Constants',
		'app/Expectation',
		'app/Message',
		'app/Network',
		'app/Node'],
function(ko, 
		 $,
		 Promise,
		 CONST,
		 Expectation,
		 Message,
		 Network,
		 Node ){

	function ViewModel(simulationSettings, numberOfStartingNodes, width, height){
		var self = this;
		
		self.logContents = ko.observableArray([]);
		self.log = function(logMessage){
			self.logContents.unshift(logMessage);
		};
		
		self.initialize = function(){
			for(var i = 0; i < numberOfStartingNodes; i++){
				self.network.nodes.push(new Node(simulationSettings, String.fromCharCode(65 + i)));
			}
			self.refreshNodeLayout();
			self.network.initialize();
		};

		// -- network and nodes

		self.network = new Network(simulationSettings, self.log);
		self.display = {
			description: ko.computed(function(){
				return self.network.onlineNodes().length + 
						" of " + self.network.nodes().length + " nodes online, " +
						simulationSettings.display.description;
			})
		};

		self.refreshNodeLayout = function(){
			var verticalScreenOffset = -50;	// bump everything up 50px
			var horizantalScreenOffset = -75;	// bump everything left

			// center point of circle
			var centerX = width/2;
			var centerY = height/2;

			// radius of circle
			var radius = 0;
			if(width < height){
				radius = width/2 * .80;
			}
			else{
				radius = height/2 * .80;
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
		};

		// -- Simulation

		var msgCount = 0;
		self.isPaused = ko.observable(true);
		self.isRunning = ko.observable(false);
		self.pauseLabel = ko.computed(function(){
			return self.isPaused() ? "run" : "pause";
		});
		self.togglePause = function(){
			self.isPaused(!self.isPaused());
			if(self.isPaused() == false && self.isRunning() == false){
				generateMessage();
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

		self.potentialDataValues = [];
		self.externalResults = ko.observableArray();
		self.logExternalResults = function(results){
			self.externalResults.unshift(results);
		};
		self.startExternalMessageGeneration = function(potentialDataValues){
			self.potentialDataValues = potentialDataValues;
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

			var randomDataKeyIndex = Math.floor(Math.random() * Object.keys(self.potentialDataValues).length);
			var randomDataKey = Object.keys(self.potentialDataValues)[randomDataKeyIndex];
			var operationType = (Math.random() < .5) ? CONST.MessageTypes.Read : CONST.MessageTypes.Write;
			
			if(operationType == CONST.MessageTypes.Write){
				var newValue = "" + Math.floor(Math.random() * 500);
				self.potentialDataValues[randomDataKey].unshift(newValue);

				var message = new Message(simulationSettings, "M" + msgCount, CONST.MessageTypes.Write, randomDataKey + ":" + newValue);
				self.network.deliverExternalMessage(message).then(function(response){
					var result = evaluateWriteResponse(randomDataKey, response);
					self.logExternalResults(result);
					completeRun();
				});
			}
			else{
				// if no value has been stored anywhere yet, try another random message/target
				if(self.potentialDataValues[randomDataKey].length == 0){
					generateMessage();
					return;
				}

				var message = new Message(simulationSettings, "M" + msgCount, CONST.MessageTypes.Read, randomDataKey);
				self.network.deliverExternalMessage(message).then(function(response){
					var result = evaluateReadResponse(randomDataKey, response);
					self.logExternalResults(result);
					completeRun();
				});			
			}
		}

		function evaluateWriteResponse(dataKey, response){
			if(response.status == "200 OK"){
				return new Expectation('Write', 'Good', "Write " + response.message.payload + " -> " + response.status);
			}
			else{
				return Expectation('Write', 'Bad', "Write " + response.message.payload + " -> " + response.status);
			}
		}

		function evaluateReadResponse(dataKey, response){
			if(response.status == "200 OK"){
				var historyNumber = self.potentialDataValues[dataKey].indexOf(response.payload);
				if(historyNumber == -1){
					return Expectation('Read', 'InvalidValue', "Read " + response.message.payload + " -> " + response.status + " :: Received Invalid Value => " + response.payload);
				}
				else if(historyNumber == 0) {
					return Expectation('Read', 'Good', "Read " + response.message.payload + " -> " + response.status + " :: Received Current => " + response.payload);
				}
				else {
					return Expectation('Read', 'Stale', "Read " + response.message.payload + " -> " + response.status + " :: Received " + historyNumber + " Out Of Date => " + response.payload);
				}
			}
			else{
				return Expectation('Read', 'Bad', "Read " + response.message.payload + " -> " + response.status);
			}
		}

		function startTheMonkey(){
			if(!self.isMonkeyActive())
				return;

			self.isMonkeyRunning(true);

			var targetNode = self.network.selectRandomOnlineNode();
			var onlineTime = Math.random() * simulationSettings.maximumOfflineNodeRepairTime;

			targetNode.status(CONST.NodeStatus.Offline);
			setTimeout(function(){	
				targetNode.status(CONST.NodeStatus.Online);		
				self.logExternalResults(new Expectation('Network', CONST.NodeStatus.Online, targetNode.name + " is online"));
			}, onlineTime);

			self.logExternalResults(new Expectation('Network', CONST.NodeStatus.Offline, targetNode.name + " is offline"));

			self.isMonkeyRunning(false);
			setTimeout(startTheMonkey, Math.random() * simulationSettings.minimumTimeBetweenOutages);
		}

		self.initialize();
	}

	return ViewModel;

});