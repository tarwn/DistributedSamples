define(['knockout',
		'bluebird',
		'app/Constants',
		'app/Message',
		'app/MessageResponse',
		'app/NodeBase',
		'app/StoredData' ],
function(ko,
		 Promise,
		 CONST,
		 Message,
		 MessageResponse,
		 NodeBase,
		 StoredData ){

	function Node(simulationSettings, name, network, startingStatus){
		NodeBase.call(this, simulationSettings, name, network, startingStatus);

		var self = this;

		var outstandingUpdates = [];

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
	}

	function RestoreLog(latestUpdate, updatesLog){
		this.latestUpdate = latestUpdate;
		this.updatesLog = updatesLog;
	}

	Node.prototype = Object.create(NodeBase.prototype);

	return Node;

});