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

	function Node(simulationSettings, name, network){
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
			switch(message.type){
				case CONST.MessageTypes.Write:
					return performWrite(message);
				case CONST.MessageTypes.Read:
					return performRead(message);
				default:
					return performError(message);
			}
		};

		function performWrite(message){
			return new Promise(function(resolve){
				self.display.incomingValueAction(message.type + ' ' + message.payload);

				var dataToStore = self.parseData(message.payload);

				if((simulationSettings.replicateWrites || simulationSettings.writeQuorum > 1) && !message.isForQuorum){
					self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': pending...');

					// TODO - implement algorithm for finding out neighbors
					var neighbors = network.getMyNeighbors(self);
					var quorumWrites = neighbors.map(function(neighbor){
						var quorumWriteMessage = message.cloneForQuorumOperation(123);	// add a transaction number later
						return network.deliverMessage(quorumWriteMessage, neighbor).then(function(response){
							// treat bad responses as errors so they won't be considered as part of the fulfilled count for quorum
							if(response.status != "200 OK"){
								throw new Error("Bad response");
							}
							else{
								return response;
							}
						});
					});

					Promise.some(quorumWrites, simulationSettings.writeQuorum - 1).then(function(responses){
						// commit the write and return
						self.storeData(dataToStore);
						self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': 200 OK');
						resolve(new MessageResponse(simulationSettings, message, "200 OK"));
					}).catch(Promise.AggregateError, function(err) {
						self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': 507 ERR');
						resolve(new MessageResponse(simulationSettings, message, "507 Write Quorum Not Reached"));
					});
				}
				else{
					self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': 200 OK');
					self.storeData(dataToStore);
					resolve(new MessageResponse(simulationSettings, message, "200 OK"));
				}
			});
		}

		function performRead(message){
			return new Promise(function(resolve){
				var storedData = self.getFromStorage(message.payload);
				if(storedData == null){
					self.display.incomingValueAction(message.type + ' ' + message.payload + ': 404 Not Found');
					resolve(new MessageResponse(simulationSettings, message, "404 Not Found"));
				}
				else{
					self.display.incomingValueAction(message.type + ' ' + message.payload + ': 200 OK');
					resolve(new MessageResponse(simulationSettings, message, "200 OK", storedData.value()));
				}
			});
		}

		function performError(message){
			return new Promise(function(resolve){
				self.display.incomingValueAction(message.type + ': 500 ERROR');
				resolve(new MessageResponse(simulationSettings, message, "500 ERROR"));
			});
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

	return Node;

});