define(['app/Constants'],
function(CONST){

	function Settings(rawValues){
		// simulation settings
		this.messageDeliveryTime = rawValues.messageDeliveryTime;
		this.messageDeliveryJitter = rawValues.messageDeliveryJitter;
		this.messageAtNodeDelay = rawValues.messageAtNodeDelay;

		// network settings
		this.networkElectionStyle = rawValues.networkElectionStyle

		// node settings
		this.writeQuorum = rawValues.writeQuorum;
		this.readQuorum = rawValues.readQuorum;

		// network operations + monitoring
		this.networkMonitoringTime = rawValues.networkMonitoringTime;
		this.timeUntilOfflineNodeIsRemoved = rawValues.timeUntilOfflineNodeIsRemoved;	// never remove bad nodes

		// monkey settings
		this.maximumOfflineNodeRepairTime = rawValues.maximumOfflineNodeRepairTime;
		this.minimumTimeBetweenOutages = rawValues.minimumTimeBetweenOutages;


		// display
		this.display = {
			description: 'Network: [' + CONST.NetworkCommunications.GatewaySendsToPrimary + ', ' + this.networkElectionStyle + '], ' + 
						 'Quorum: ' + 'W' + this.writeQuorum + 'R' + this.readQuorum
		};
	}

	return Settings;

});