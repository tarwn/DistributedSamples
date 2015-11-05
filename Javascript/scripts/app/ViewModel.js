define(['knockout', 
		'jquery',
		'bluebird',
		'app/Constants',
		'app/Network',
		'app/Node'],
function(ko, 
		 $,
		 Promise,
		 CONST,
		 Network,
		 Node ){

	function ViewModel(numberOfStartingNodes, networkDeliveryStyle){
		var self = this;
		
		self.isRunning = ko.observable(true);
		self.pause = function(){
			self.isRunning(false);
		};

		self.logContents = ko.observableArray([]);
		self.log = function(logMessage){
			self.logContents.unshift(logMessage);
		};
		
		self.network = new Network(networkDeliveryStyle, self.log);

		for(var i = 0; i < numberOfStartingNodes; i++){
			self.network.nodes.push(new Node(String.fromCharCode(65 + i)));
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
			var numPoints = self.network.nodes().length;
			var step = (Math.PI * 2) / numPoints

			// now position them equidistantly around the circle
			for(var i = 0; i < self.network.nodes().length; i++){
				var node = self.network.nodes()[i];
				node.display.x( centerX + radius * Math.sin(step * i) );
				node.display.y( centerY + radius * Math.cos(step * i) + verticalScreenOffset );
			}		
		};
		self.refreshNodeLayout();
	}

	return ViewModel;

});