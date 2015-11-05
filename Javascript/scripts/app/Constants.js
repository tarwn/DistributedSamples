define([],
function(){

return {
	DEFAULTS: {
		TRANSMIT_TIME:			  750,
		TRANSMIT_HUMAN_READ_TIME: 0
	},
	MESSAGE_TYPES: {
		'Write': 'Write',
		'Read':	 'Read'
	},
	NETWORK_STYLE: {
		'Any': 'Any',
		'NetworkSelectedHead': 'NetworkSelectedHead'
	},
	NODE_STATUS: {
		'Online': 'Online',
		'Offline': 'Offline'
	}
}

});