define(['app/Constants'],
function(CONST){

	function Settings(rawValues){
		var self = this;

		self.timeMultiplier = ko.observable(1);

		// simulation settings
		self.messageDeliveryTime = ko.computed(function(){ return self.timeMultiplier() * rawValues.messageDeliveryTime; });
		self.messageDeliveryJitter = ko.computed(function(){ return self.timeMultiplier() * rawValues.messageDeliveryJitter; });
		self.messageAtNodeDelay = ko.computed(function(){ return self.timeMultiplier() * rawValues.messageAtNodeDelay; });

		// network settings
		self.networkCommunications = rawValues.networkCommunications;
		self.networkElectionStyle = rawValues.networkElectionStyle

		// node settings
		self.nodeElectionStyle = rawValues.nodeElectionStyle;
		self.nodeAdditionStyle = rawValues.nodeAdditionStyle; // how does it sync to come online?
		self.replicateWrites = rawValues.replicateWrites;		// used independently from writeQuorum, wq>1 or this will cause replication
		self.writeQuorum = rawValues.writeQuorum;
		self.readQuorum = rawValues.readQuorum;

		// network operations + monitoring
		self.networkMonitoringTime = ko.computed(function(){ return self.timeMultiplier() * rawValues.networkMonitoringTime; });
		self.timeUntilOfflineNodeIsRemoved = ko.computed(function(){ return self.timeMultiplier() * rawValues.timeUntilOfflineNodeIsRemoved; }); // never remove bad nodes

		// monkey settings
		self.maximumOfflineNodeRepairTime = ko.computed(function(){ return self.timeMultiplier() * rawValues.maximumOfflineNodeRepairTime; });
		self.minimumTimeBetweenOutages = ko.computed(function(){ return self.timeMultiplier() * rawValues.minimumTimeBetweenOutages; });

		// display
		this.display = {
			description: ko.computed(function(){
				var multiplier = (self.timeMultiplier() != 1 ? '1/' + self.timeMultiplier() : "1");
				return 'Network: [' + CONST.NetworkCommunications.GatewaySendsToPrimary + ', ' + self.networkElectionStyle + '], ' + 
					   'Quorum: ' + 'W' + self.writeQuorum + 'R' + self.readQuorum + ', ' +
					   'Time: ' + multiplier + "x";
			})
		};
	}

	return Settings;

});