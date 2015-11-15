define(['knockout',
		'app/Constants'],
function(ko,
		CONST){

	function Settings(rawValues){
		var self = this;

		self.timeMultiplier = ko.observable(1);

		// simulation settings
		self.messageDeliveryTime = ko.computed(function(){ return self.timeMultiplier() * rawValues.messageDeliveryTime; });
		self.messageDeliveryJitter = ko.computed(function(){ return self.timeMultiplier() * rawValues.messageDeliveryJitter; });
		self.messageAtNodeDelay = ko.computed(function(){ return self.timeMultiplier() * rawValues.messageAtNodeDelay; });

		// network settings
		self.networkElectionStyle = rawValues.networkElectionStyle

		// node settings
		self.writeQuorum = rawValues.writeQuorum;
		self.readQuorum = rawValues.readQuorum;
		self.recoveryTransactionLogLength = rawValues.recoveryTransactionLogLength;

		// network operations + monitoring
		self.networkMonitoringTime = ko.computed(function(){ return self.timeMultiplier() * rawValues.networkMonitoringTime; });
		self.timeUntilOfflineNodeIsRemoved = ko.computed(function(){ return self.timeMultiplier() * rawValues.timeUntilOfflineNodeIsRemoved; }); // never remove bad nodes

		// monkey settings
		self.maximumOfflineNodeRepairTime = ko.computed(function(){ return self.timeMultiplier() * rawValues.maximumOfflineNodeRepairTime; });
		self.minimumTimeBetweenOutages = ko.computed(function(){ return self.timeMultiplier() * rawValues.minimumTimeBetweenOutages; });
		self.maximumTimeBetweenOutages = ko.computed(function(){ return self.timeMultiplier() * rawValues.maximumTimeBetweenOutages; });

		// display
		self.display = {
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