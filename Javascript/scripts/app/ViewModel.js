define(['knockout', 
		'jquery',
		'bluebird',
		'app/Constants',
		'app/Network',
		'app/Node',
		'app/Message'],
function(ko, 
		 $,
		 Promise,
		 CONST,
		 Network,
		 Node,
		 Message ){

	function ViewModel(numberOfStartingNodes, networkDeliveryStyle){
		var self = this;
		
		self.logContents = ko.observableArray([]);
		self.log = function(logMessage){
			self.logContents.unshift(logMessage);
		};
		
		self.initialize = function(){
			for(var i = 0; i < numberOfStartingNodes; i++){
				self.network.nodes.push(new Node(String.fromCharCode(65 + i)));
			}
			self.refreshNodeLayout();
		};

		// -- network and nodes

		self.network = new Network(networkDeliveryStyle, self.log);

		self.refreshNodeLayout = function(){
			var verticalScreenOffset = -50;	// bump everything up 50px

			var height = $(window).height();
			var width = $(window).width();

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
				node.display.x( centerX + radius * Math.sin(step * i) );
				node.display.y( centerY + radius * Math.cos(step * i) + verticalScreenOffset );
			}		
		};

		// -- Simulation

		self.isRunning = ko.observable(true);
		self.pause = function(){
			self.isRunning(false);
		};
		self.externalResults = ko.observableArray();

		self.potentialDataValues = [];

		self.startExternalMessageGeneration = function(potentialDataValues){
			self.potentialDataValues = potentialDataValues;
			generateMessage();
		};

		var msgCount = 0;

		function generateMessage() {
			if(!self.isRunning())
				return;

			var randomDataKeyIndex = Math.floor(Math.random() * Object.keys(self.potentialDataValues).length);
			var randomDataKey = Object.keys(self.potentialDataValues)[randomDataKeyIndex];
			var operationType = (Math.random() < .5) ? CONST.MESSAGE_TYPES.Read : CONST.MESSAGE_TYPES.Write;
			
			if(operationType == CONST.MESSAGE_TYPES.Write){
				var newValue = "" + Math.floor(Math.random() * 500);
				self.potentialDataValues[randomDataKey].unshift(newValue);

				var message = new Message("M" + msgCount, CONST.MESSAGE_TYPES.Write, randomDataKey + ":" + newValue);
				self.network.deliverExternalMessage(message).then(function(response){
					var result = evaluateWriteResponse(randomDataKey, response);
					self.externalResults.push(result);
					console.log(self.externalResults());
					setTimeout(generateMessage, 500);	
				});
			}
			else{
				// if no value has been stored anywhere yet, try another random message/target
				if(self.potentialDataValues[randomDataKey].length == 0){
					generateMessage();
					return;
				}

				var message = new Message("M" + msgCount, CONST.MESSAGE_TYPES.Read, randomDataKey);
				self.network.deliverExternalMessage(message).then(function(response){
					var result = evaluateReadResponse(randomDataKey, response);
					self.externalResults.push(result);
					console.log(self.externalResults());
					setTimeout(generateMessage, 500);	
				});			
			}
		}

		function evaluateWriteResponse(dataKey, response){
			return {
				meetsExpectations: 'Good',
				text: "Write " + response.message.payload + " -> " + response.status
			};
		}

		function evaluateReadResponse(dataKey, response){
			if(response.status == "200 OK"){
				var historyNumber = self.potentialDataValues[dataKey].indexOf(response.payload);
				if(historyNumber == -1){
					return {
						meetsExpectations: 'Error',
						text: "Read " + response.message.payload + " -> " + response.status + " :: Received Invalid Value => " + response.payload
					};
				}
				else if(historyNumber == 0) {
					return {
						meetsExpectations: 'Good',
						text: "Read " + response.message.payload + " -> " + response.status + " :: Received Current => " + response.payload
					};
				}
				else {
					return {
						meetsExpectations: 'Stale',
						text: "Read " + response.message.payload + " -> " + response.status + " :: Received " + historyNumber + " Out Of Date => " + response.payload
					};
				}
			}
			else{
				return {
					meetsExpectations: 'Bad',
					text: "Read " + response.message.payload + " -> " + response.status
				};
			}
		}

		self.initialize();
	}

	return ViewModel;

});