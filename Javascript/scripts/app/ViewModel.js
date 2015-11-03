define(['knockout', 
		'jquery',
		'bluebird',
		'app/Constants',
		'app/Node'],
function(ko, 
		 $,
		 Promise,
		 CONST,
		 Node ){

	function ViewModel(numberOfStartingNodes){
		var self = this;
		
		self.nodes = ko.observableArray([]);
		self.messages = ko.observableArray([]);
		self.outgoingMessages = ko.observableArray([]);

		self.logContents = ko.observableArray([]);
		self.log = function(logMessage){
			self.logContents.unshift(logMessage);
		};
		
		for(var i = 0; i < numberOfStartingNodes; i++){
			self.nodes.push(new Node(String.fromCharCode(65 + i)));
		}

		self.deliverMessage = function(message, node){
			self.log(message.display.description + ' sent to node ' + node.name);
			
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
					self.log(response.message.display.description + ' response from node ' + node.name + ': ' + response.status + ' [' + response.payload + ']');
				}
				else{
					self.log(response.message.display.description + ' response from node ' + node.name + ': ' + response.status);
				}
				
				self.messages.remove(response);
			});
		}

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
			var numPoints = self.nodes().length;
			var step = (Math.PI * 2) / numPoints

			// now position them equidistantly around the circle
			for(var i = 0; i < self.nodes().length; i++){
				var node = self.nodes()[i];
				node.display.x( centerX + radius * Math.sin(step * i) );
				node.display.y( centerY + radius * Math.cos(step * i) + verticalScreenOffset );
			}		
		};
		self.refreshNodeLayout();
	}

	return ViewModel;

});