define(['knockout',
		'bluebird',
		'app/azureSql/Constants',
		'app/azureSql/InternalMessage',
		'app/azureSql/Transaction',
		'app/Constants',
		'app/Message',
		'app/MessageResponse',
		'app/NodeBase',
		'app/StoredData' ],
function(ko,
		 Promise,
		 AZURECONST,
		 InternalMessage,
		 Transaction,
		 CONST,
		 Message,
		 MessageResponse,
		 NodeBase,
		 StoredData ){

	function Node(simulationSettings, name, network, startingStatus){
		NodeBase.call(this, simulationSettings, name, network, startingStatus);

		var self = this;

		var latestCSN = null;
		self.outstandingTransactions = ko.observableArray([]);
		self.transactionLog = ko.observableArray([]);

		self.setOffline = function(){
			self.status(CONST.NodeStatus.Offline);
			self.outstandingTransactions.removeAll();
		};

		self.setOnline = function(){
			if(self.status() != CONST.NodeStatus.Offline)
				return;

			self.status(CONST.NodeStatus.Restoring);
			self.display.incomingValueAction('Restoring');
			self.outstandingTransactions.removeAll();

			// TODO - implement algorithm for finding out neighbors
			var neighbors = network.getMyNeighbors(self);

			// ask for a log restore
			var restoreRequests = neighbors.map(function(neighbor){
				var restoreMessage = generateRestoreMessage();
				return network.deliverMessage(restoreMessage, neighbor);
			});

			return Promise.all(restoreRequests).then(function(responses){
				var latestRestore = null;

				// identify latest response (csn)
				responses.forEach(function(response){
					if(response.statusCode != 200)
						return;

					if(latestRestore == null || response.payload.csn > latestRestore.csn){
						latestRestore = response.payload;
					}
				});

				if(latestRestore != null && latestRestore.canApplyTransactions){
					// apply provided log restore
					return new Promise(function(resolve){
						latestRestore.updatesLog.forEach(function(transaction){
							beginTransaction(transaction);
							commitTransaction(transaction);
						});
						self.display.incomingValueAction('Restored ' + latestRestore.updatesLog.length + ' trans');
						resolve();
					});
				}
				else{
					// request and apply full backup instead
					return performFullBackup().then(function(){
						self.display.incomingValueAction('Restored full backup');					
					});
				}
				return latestRestore;
			}).then(function(){
				// apply outstanding updates while restore was occurring
				while(self.outstandingTransactions().length > 0){
					var transaction = self.outstandingTransactions.shift();
					commitTransaction(transaction);
				}

				self.status(CONST.NodeStatus.Online);
			});
		};

		function getRestoringResponse(message){
			return new MessageResponse(simulationSettings, message, 204, "Restoring");
		}

		function performFullBackup(){
			// TODO - implement algorithm for finding out neighbors
			var neighbors = network.getMyNeighbors(self);

			// need to find a way to only ask one server for full restore
			var fullRestoreRequests = neighbors.map(function(neighbor){
				var fullRestoreMessage = generateFullRestoreMessage();
				return network.deliverMessage(fullRestoreMessage, neighbor).then(function(response){
					if(response.statusCode < 200 || response.statusCode >= 300)
						throw new Error("Cannot restore: " + response.statusCode + ' ' + response.statusMessage);
					else
						return response;
				});
			});

			return Promise.any(fullRestoreRequests).then(function(response){
				self.storage.removeAll();
				var backup = response.payload.backup;
				// apply
				if(backup != null){
					backup.forEach(function(storedItem){
						self.storeData(storedItem);
					});
				}
				latestCSN = response.payload.csn;
				self.transactionLog.removeAll();
			}).catch(Promise.AggregateError, function(err) {
				self.display.incomingValueAction('No restores, start dirty');
			});
		}

		self.processNewMessage = function(message){
			try{
				var messageType = message.type;
				if(messageType == CONST.MessageTypes.Internal)
					messageType = message.internalType;

				switch(messageType){
					case CONST.MessageTypes.Write:
						if(self.status() == CONST.NodeStatus.Online){
							return performWrite(message);
						}
					case CONST.MessageTypes.Read:
						return performRead(message);
					case AZURECONST.InternalMessageTypes.Replicate:
						if(self.status() == CONST.NodeStatus.Online){
							return performRedoWrite(message, message.payload);
						}
						else if(self.status() == CONST.NodeStatus.Restoring){
							return performDelayedRedoWrite(message, message.payload);
						}
					case AZURECONST.InternalMessageTypes.RestorePlease:
						return performRestoreResponse(message);
					case AZURECONST.InternalMessageTypes.FullRestorePlease:
						return performFullRestoreResponse(message);
					default:
						return performError(message);
				}
			}
			catch(e){
				return performError(message);
			}
		};

		function generateNextCSN(message){
			// we're going to keep this simple, how the CSN is generated doesn't have
			//	much relevant on this simulaton. I may come back later and replace it 
			//	with a combination of epochs and local counter values
			var messageId = message.name;
			var CSN = message.name.replace('M','');
			return CSN;
		}

		function performWrite(message){
			return new Promise(function(resolve){
				self.display.incomingValueAction(message.type + ' ' + message.payload);

				var csn = generateNextCSN(message);
				var dataToStore = self.parseData(message.payload);
				var outstandingTransaction = new Transaction(csn, dataToStore);
				beginTransaction(outstandingTransaction);

				if((simulationSettings.replicateWrites || simulationSettings.writeQuorum > 1) && !message.isForQuorum){
					self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': pending...');

					// TODO - implement algorithm for finding out neighbors
					var neighbors = network.getMyNeighbors(self);

					// replicate writes as oustanding transaction
					var replicationWrites = neighbors.map(function(neighbor){
						var replicationWriteMessage = generateRedoWriteMessage(outstandingTransaction);
						return network.deliverMessage(replicationWriteMessage, neighbor).then(function(response){
							// treat bad responses as errors so they won't be considered as part of the fulfilled count for quorum
							// theoretically we could receive an ABORT at this point too, but I haven't been able to find an explanation for this
							if(response.statusCode != 200){
								throw new Error("Bad response");
							}
							else{
								return response;
							}
						});
					});

					// after a quorum of acks, commit the data and send out the commits
					Promise.some(replicationWrites, simulationSettings.writeQuorum - 1).then(function(responses){
						// commit the write, clear the outstanding transaction, update current status
						commitTransaction(outstandingTransaction);
						self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': 200 OK');
						resolve(new MessageResponse(simulationSettings, message, 200, "OK"));
					}).catch(Promise.AggregateError, function(err) {
						abortTransaction(outstandingTransaction);
						self.display.incomingValueAction(message.type + ' ' + dataToStore.key + ': 507 ERR');
						resolve(new MessageResponse(simulationSettings, message, 507, "ABORT Write Quorum Not Reached"));
					});
				}
				else{
					commitTransaction(outstandingTransaction);
					self.display.incomingValueAction(message.type + ' ' + outstandingTransaction.data.key + ': 200 OK');
					resolve(new MessageResponse(simulationSettings, message, 200, "OK"));
				}
			});
		}

		function performRedoWrite(message, transaction){
			// todo: refactor this and above method for common logic
			return new Promise(function(resolve){
				beginTransaction(transaction);
				commitTransaction(transaction);
				self.display.incomingValueAction(message.internalType + ' ' + transaction.data.key + ': 200 OK');
				resolve(new MessageResponse(simulationSettings, message, 200, "OK"));
			});
		}

		function performDelayedRedoWrite(message, transaction){
			return new Promise(function(resolve){
				beginTransaction(transaction);
				resolve(getRestoringResponse(message));
			});
		}

		function beginTransaction(transaction){
			self.outstandingTransactions.push(transaction);
		}

		function commitTransaction(transaction){
			self.storeData(transaction.data);
			self.outstandingTransactions.remove(transaction);
			self.transactionLog.push(transaction);
			truncateTransactionLogIfNecessary();
			latestCSN = transaction.csn;
		}

		function abortTransaction(transaction){
			self.outstandingTransactions.remove(transaction);
		}

		function truncateTransactionLogIfNecessary(){
			while(self.transactionLog().length > simulationSettings.recoveryTransactionLogLength){
				self.transactionLog.shift();
			}
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

		function generateRestoreMessage(){
			var message = new InternalMessage(simulationSettings, self.name, AZURECONST.InternalMessageTypes.RestorePlease, latestCSN);
			message.display.startX(self.display.x());
			message.display.startY(self.display.y());
			return message;
		}

		function generateFullRestoreMessage(){
			var message = new InternalMessage(simulationSettings, self.name, AZURECONST.InternalMessageTypes.FullRestorePlease, latestCSN);
			message.display.startX(self.display.x());
			message.display.startY(self.display.y());
			return message;
		}

		function generateRedoWriteMessage(transaction){
			var message = new InternalMessage(simulationSettings, self.name, AZURECONST.InternalMessageTypes.Replicate, transaction);
			message.display.startX(self.display.x());
			message.display.startY(self.display.y());
			return message;
		}

		function performRestoreResponse(message){
			var targetCSN = message.payload;

			return new Promise(function(resolve){
				if(self.status() == CONST.NodeStatus.Restoring){
					resolve(new MessageResponse(simulationSettings, message, 409, "I'm Restoring"));
					return;
				}
				
				var transactions = self.transactionLog().filter(function(transaction){
					return transaction.csn >= targetCSN;
				});

				if(transactions.length > 0 && transactions[0].csn == targetCSN){
					var latestCSN = transactions[transactions.length - 1].csn;
					transactions.shift();	// remove the matching transaction
					resolve(new MessageResponse(simulationSettings, message, 200, "OK", new RestoreLog(latestCSN, true, transactions)));
				}
				else{
					resolve(new MessageResponse(simulationSettings, message, 204, "Not Enough Log", new RestoreLog(targetCSN, false, null)));
				}				
			});
		}

		function performFullRestoreResponse(message){
			return new Promise(function(resolve){
				if(self.status() == CONST.NodeStatus.Restoring){
					resolve(new MessageResponse(simulationSettings, message, 409, "I'm Restoring"));
					return;
				}
				
				resolve(new MessageResponse(simulationSettings, message, 200, "OK", new RestoreFull(latestCSN, self.storage())));
			});
		}

		function performError(message){
			return new Promise(function(resolve){
				self.display.incomingValueAction(message.type + ': 500 ERROR');
				resolve(new MessageResponse(simulationSettings, message, 500, "ERROR"));
			});
		}
	}

	function RestoreLog(csn, canApplyTransactions, updatesLog){
		this.csn = csn;
		this.canApplyTransactions = canApplyTransactions;
		this.updatesLog = updatesLog;
	}

	RestoreLog.prototype.toString = function(){
		if(this.updatesLog == null)
			return "";
		else
			return "(LogRestore to CSN " + this.csn + ": " + this.updatesLog.length + " trans)";
	};

	function RestoreFull(csn, backup){
		this.csn = csn;
		this.backup = backup;
	}

	RestoreFull.prototype.toString = function(){
		return "(FullRestore to CSN " + this.csn + ")";
	};

	Node.prototype = Object.create(NodeBase.prototype);

	return Node;

});