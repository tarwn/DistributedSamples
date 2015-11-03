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

	function Node(name){
		var self = this;
		self.name = name;
		self.status = ko.observable();

		self.storage = ko.observableArray([]);

		self.display = {
			x: ko.observable(),
			y: ko.observable(),
			incomingValueAction: ko.observable()
		};
		self.display.description = ko.computed(function(){
			return self.name; // + ' (' + Math.round(self.display.x()) + ',' + Math.round(self.display.y()) + ')';
		});

		self.processNewMessage = function(message){
			return new Promise(function(resolve){
				self.display.incomingValueAction(message.type + ' ' + message.payload);
				if(message.type == CONST.MESSAGE_TYPES.Write){
					var storedData = self.storeData(message.payload);
					self.display.incomingValueAction(message.type + ' ' + storedData.key + ': 200 OK');
					resolve(new MessageResponse(message, "200 OK"));
				}
				else if(message.type == CONST.MESSAGE_TYPES.Read){
					var storedData = self.getFromStorage(message.payload);
					if(storedData == null){
						self.display.incomingValueAction(message.type + ' ' + message.payload + ': 404 Not Found');
						resolve(new MessageResponse(message, "404 Not Found"));
					}
					else{
						self.display.incomingValueAction(message.type + ' ' + message.payload + ': 200 OK');
						resolve(new MessageResponse(message, "200 OK", storedData.value));
					}
				}
				else{
					self.display.incomingValueAction(message.type + ': 500 ERROR');
					resolve(new MessageResponse(message, "500 ERROR"));
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
			var storedData = new StoredData(key, value);
			self.storage.push(storedData);
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