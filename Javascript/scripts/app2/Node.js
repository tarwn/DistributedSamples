define(['knockout',
		'bluebird',
		'app2/Constants',
		'app2/MessageResponse' ],
function(ko,
		 Promise,
		 CONST,
		 MessageResponse ){

	function Node(simulationSettings, displaySettings, name, startingStatus, sendMessage){
		var self = this;
		
		self.name = name;
		self.status = ko.observable(startingStatus);
		self.specialNodeStatus = ko.observable();

		self.isInitialized = ko.observable(false);
		self.initialize = function(){
			return Promise.resolve()
			.then(function(){
				return simulationSettings.nodeInitialize(self);
			})
			.then(function(){
				self.isInitialized(true);
			});
		};

		// --- display properties

		self.display = {
			x: ko.observable(),
			y: ko.observable()
		};

		self.display.description = ko.computed(function(){
			return self.name;
		});

		// --- execution

		self.setOnline = function(){
			return Promise.resolve()
			.then(function(){
				self.status(CONST.NodeStatus.Restoring);
			})
			.then(function(){
				return simulationSettings.nodeGoOnlineProcessor(self, sendMessage);
			})
			.then(function(){
				self.status(CONST.NodeStatus.Online);
			});
		};

		self.setOffline = function(){
			return Promise.resolve()
			.then(function(){
				return simulationSettings.nodeGoOfflineProcessor(self, sendMessage);
			})
			.then(function(){
				self.status(CONST.NodeStatus.Offline);
			});
		};

		self.receiveMessage = function(message){
			// expects a message response (or promise for message response), which will be returned to 
			// network for delivery
			return Promise.resolve()
			.then(function(){
				return simulationSettings.nodeMessageProcessor(self, message, sendMessage);
			})
			.then(function(response){
				if(response == null){
					response = new MessageResponse(simulationSettings, message, 501, 'Server Error');
				}
				return response;
			});
		};

		self.whenLoaded = self.initialize();
	}

	return Node;

});