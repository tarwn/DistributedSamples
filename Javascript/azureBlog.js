require(["jquery",
		 "knockout",
		 "app/Constants",
		 "app/ViewModel",
		 "app/azureSql/Settings",
		 "app/azureSql/Network",
		 "app/azureSql/Node"],
function($,
		 ko,
		 CONST,
		 ViewModel,
		 AzureSettings,
		 AzureNetwork,
		 AzureNode){
	
	var settings = new AzureSettings({
		// simulation settings
		messageDeliveryTime:	500,
		messageDeliveryJitter:	250,
		messageAtNodeDelay:		0,

		// network settings
		networkElectionStyle:	CONST.NetworkElectionStyle.Polled,
		
		// node settings
		writeQuorum:			2,
		readQuorum:				1,
		recoveryTransactionLogLength: 4,
		
		// network operations + monitoring
		networkMonitoringTime:	10000,
		timeUntilOfflineNodeIsRemoved: -1,	// never remove bad nodes
		
		// monkey settings
		maximumOfflineNodeRepairTime:	10000,
		minimumTimeBetweenOutages:		10000,
		maximumTimeBetweenOutages:		20000
	});
	
	var width = 800;
	var height = 600;
	var expectedNodeHeight = 220;
	var dataKeys = ["D0","D1","D2","D3","D4"];

	var writesVM = new ViewModel(settings, 3, width, height, expectedNodeHeight, AzureNetwork, AzureNode);
	ko.applyBindings(writesVM, $(".writes-container")[0]);
	writesVM.startExternalMessageScript([
		{ execute: writesVM.speedSlow },
		{ operationType: CONST.MessageTypes.Write, limit: -1 }
	], dataKeys);

	var readsVM = new ViewModel(settings, 3, width, height, expectedNodeHeight, AzureNetwork, AzureNode);
	ko.applyBindings(readsVM, $(".reads-container")[0]);
	readsVM.startExternalMessageScript([
		{ execute: readsVM.speedFast },
		{ operationType: CONST.MessageTypes.Write, limit: 5 },
		{ execute: readsVM.speedSlow },
		{ operationType: CONST.MessageTypes.Read, limit: -1 }
	], dataKeys);

	var restoresVM = new ViewModel(settings, 3, width, height, expectedNodeHeight, AzureNetwork, AzureNode);
	ko.applyBindings(restoresVM, $(".restores-container")[0]);
	restoresVM.startExternalMessageScript([
		{ election: "A" },
		{ execute: readsVM.speedFast },
		{ operationType: CONST.MessageTypes.Write, limit: 2 },
		{ offline: "B" },
		{ operationType: CONST.MessageTypes.Write, limit: 2 },
		{ execute: restoresVM.speedSlow },
		{ online: "B" },
		{ execute: readsVM.speedFast },
		{ operationType: CONST.MessageTypes.Write, limit: 1 },
		{ offline: "B" },
		{ operationType: CONST.MessageTypes.Write, limit: 5 },
		{ execute: restoresVM.speedSlow },
		{ online: "B" },
		{ execute: readsVM.speedFast },
		{ loop: 2 }
	], dataKeys);
});