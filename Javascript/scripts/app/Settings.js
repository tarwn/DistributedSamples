define(['app/Constants'],
function(CONST){

	function Settings(rawValues){
		// simulation settings
		this.messageDeliveryTime = rawValues.messageDeliveryTime;
		this.messageAtNodeDelay = rawValues.messageAtNodeDelay;

		// network settings
		this.networkCommunications = rawValues.networkCommunications;
		this.networkElectionStyle = rawValues.networkElectionStyle

		// node settings
		this.nodeElectionStyle = rawValues.nodeElectionStyle;
		this.nodeAdditionStyle = rawValues.nodeAdditionStyle; // how does it sync to come online?

		// network operations + monitoring
		this.networkMonitoringTime = rawValues.networkMonitoringTime;
		this.timeUntilOfflineNodeIsRemoved = rawValues.timeUntilOfflineNodeIsRemoved;	// never remove bad nodes

		// monkey settings
		this.maximumOfflineNodeRepairTime = rawValues.maximumOfflineNodeRepairTime;
		this.minimumTimeBetweenOutages = rawValues.minimumTimeBetweenOutages;


		// display
		this.display = {
			description: 'Network [' + this.networkCommunications + ', ' + this.networkElectionStyle + ']'
		};
	}

	return Settings;

});