define(['knockout',
		'bluebird',
		'app/Constants',
		'app/MessageResponse',
		'app/StoredData' ],
function(ko,
		 Promise,
		 CONST,
		 MessageResponse,
		 StoredData ){

	function Node(simulationSettings, name){
		var self = this;
		self.name = name;
		self.status = ko.observable(CONST.NodeStatus.Online);
		self.specialStatus = ko.observable();

		self.storage = ko.observableArray([]);

		self.display = {
			x: ko.observable(),
			y: ko.observable(),
			incomingValueAction: ko.observable()
		};
		self.display.description = ko.computed(function(){
			if(self.specialStatus() != null)
				return self.name + " (" + self.specialStatus() + ")"; 
			else
				return self.name;
		});

		self.processNewMessage = function(message){
			return new Promise(function(resolve){
				self.display.incomingValueAction(message.type + ' ' + message.payload);
				if(message.type == CONST.MessageTypes.Write){
					var storedData = self.storeData(message.payload);
					self.display.incomingValueAction(message.type + ' ' + storedData.key + ': 200 OK');
					resolve(new MessageResponse(simulationSettings, message, "200 OK"));
				}
				else if(message.type == CONST.MessageTypes.Read){
					var storedData = self.getFromStorage(message.payload);
					if(storedData == null){
						self.display.incomingValueAction(message.type + ' ' + message.payload + ': 404 Not Found');
						resolve(new MessageResponse(simulationSettings, message, "404 Not Found"));
					}
					else{
						self.display.incomingValueAction(message.type + ' ' + message.payload + ': 200 OK');
						resolve(new MessageResponse(simulationSettings, message, "200 OK", storedData.value()));
					}
				}
				else{
					self.display.incomingValueAction(message.type + ': 500 ERROR');
					resolve(new MessageResponse(simulationSettings, message, "500 ERROR"));
				}
			});
		};

		self.storeData = function(rawData){
			var data = rawData.split(':');
			var key = data[0];
			var value = null;
			if(data.length > 1){
				value = data[1];
			}

			var storedData = self.getFromStorage(key);
			if(storedData != null){
				storedData.value(value);
			}
			else{
				storedData = new StoredData(key, value);
				self.storage.push(storedData);
			}
			return storedData;
		};

		self.getFromStorage = function(key){
			var data = self.storage().filter(function(item){
				return item.key == key;
			});
			if(data.length > 0)
				return data[0];
			else
				return null;
		}
	}

	return Node;

});