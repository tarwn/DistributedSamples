define(['knockout',
		'bluebird',
		'app/Constants',
		'app/Message',
		'app/MessageResponse',
		'app/StoredData' ],
function(ko,
		 Promise,
		 CONST,
		 Message,
		 MessageResponse,
		 StoredData ){

	function NodeBase(simulationSettings, name, network, startingStatus){
		var self = this;
		self.name = name;
		self.status = ko.observable(startingStatus);
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
			return Promise.reject("processNewImage nor implemented");
		}

		self.parseData = function(rawData){
			var data = rawData.split(':');
			var key = data[0];
			var value = null;
			if(data.length > 1){
				value = data[1];
			}

			return new StoredData(key, value);
		};

		self.storeData = function(dataToStore){
			var storedData = self.getFromStorage(dataToStore.key);
			if(storedData != null){
				storedData.value(dataToStore.value());
			}
			else{
				storedData = new StoredData(dataToStore.key, dataToStore.value());
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

	return NodeBase;

});