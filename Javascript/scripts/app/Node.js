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

	function Node(simulationSettings, name, network, startingStatus){
		var self = this;
		self.name = name;
		self.status = ko.observable(startingStatus);
		self.specialStatus = ko.observable();

		var outstandingUpdates = [];
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

		self.setOffline = function(){
			self.status(CONST.NodeStatus.Offline);
		};

		self.setOnline = function(){
			if(self.status() != CONST.NodeStatus.Offline)
				return;

			self.status(CONST.NodeStatus.Restoring);
			self.display.incomingValueAction('Restoring');
			self.storage.removeAll();

			// TODO - implement algorithm for finding out neighbors
			var neighbors = network.getMyNeighbors(self);

			// ask for a restore
			var restoreMessage = new Message(simulationSettings, 'I-' + self.name, CONST.MessageTypes.Internal, 'RestoreImage');
			restoreMessage.display.startX(self.display.x());
			restoreMessage.display.startY(self.display.y());
			var restoreRequests = neighbors.map(function(neighbor){
				return network.deliverMessage(restoreMessage, neighbor);
			});

			// apply latest restore
			Promise.all(restoreRequests).then(function(responses){
				var latestRestore = null;
				responses.forEach(function(response){
					if(response.statusCode != 200)
						return;

					if(latestRestore == null || response.payload.latestUpdate > latestRestore.latestUpdate)
						latestRestore = response.payload;
				});

				// apply
				if(latestRestore != null){
					latestRestore.updatesLog.forEach(function(storedItem){
						self.storeData(storedItem);
					});
				}

				// apply outstanding updates while restore was occurring
				outstandingUpdates.forEach(function(storedItem){
					self.storeData(storedItem);
				});
				outstandingUpdates = [];

				self.display.incomingValueAction(null);
				self.status(CONST.NodeStatus.Online);
			});
		};

		function getRestoringResponse(message){
			return new MessageResponse(simulationSettings, message, 204, "Restoring");
		}

		self.processNewMessage = function(message){
			switch(message.type){
				case CONST.MessageTypes.Write:
					if(self.status() == CONST.NodeStatus.Restoring){
						return performDelayedWrite(message);
					}
					else{
						return performWrite(message);
					}
				case CONST.MessageTypes.Read:
					return performRead(message);
				case CONST.MessageTypes.Internal:
					if(message.payload == 'RestoreImage')
						return performRestoreImageResponse(message);
					else
						return performError(message);
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
							if(response.statusCode != 200){
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
						resolve(new MessageResponse(simulationSettings, message, 200, "OK"));
					}).catch(Promise.AggregateError, function(err) {
						self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': 507 ERR');
						resolve(new MessageResponse(simulationSettings, message, 507, "Write Quorum Not Reached"));
					});
				}
				else{
					self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': 200 OK');
					self.storeData(dataToStore);
					resolve(new MessageResponse(simulationSettings, message, 200, "OK"));
				}
			});
		}

		function performDelayedWrite(message){
			return new Promise(function(resolve){
				var dataToStore = self.parseData(message.payload);
				outstandingUpdates.push(dataToStore);
				resolve(getRestoringResponse(message));
			});
		}

		function performRead(message){
			return new Promise(function(resolve){
				var storedData = self.getFromStorage(message.payload);
				if(storedData == null){
					self.display.incomingValueAction(message.type + ' ' + message.payload + ': 404 Not Found');
					resolve(new MessageResponse(simulationSettings, message, 404, "Not Found"));
				}
				else{
					self.display.incomingValueAction(message.type + ' ' + message.payload + ': 200 OK');
					resolve(new MessageResponse(simulationSettings, message, 200, "OK", storedData.value()));
				}
			});
		}

		function performRestoreImageResponse(message){
			return new Promise(function(resolve){
				if(self.status() == CONST.NodeStatus.Online){
					var relevantData = self.storage().filter(function(storedItem){
						return true;	// later we will filter based on transaction id
					});
					var restore = new RestoreLog(1, relevantData);
					resolve(new MessageResponse(simulationSettings, message, 200, "OK", restore));
				}
				else{
					resolve(new MessageResponse(simulationSettings, message, 409, "I'm Restoring"));
				}
			});
		}

		function performError(message){
			return new Promise(function(resolve){
				self.display.incomingValueAction(message.type + ': 500 ERROR');
				resolve(new MessageResponse(simulationSettings, message, 500, "ERROR"));
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

	function RestoreLog(latestUpdate, updatesLog){
		this.latestUpdate = latestUpdate;
		this.updatesLog = updatesLog;
	}

	return Node;

});