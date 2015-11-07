define([],
function(){

return {
	DEFAULTS: {
		UNDEFINED_DELIVERY_TIME:	10000,
		GATEWAY_PORT_X:				75,
		GATEWAY_PORT_Y:				75
	},
	MessageTypes: {
		'Write':	'Write',
		'Read':		'Read'
	},
	NetworkCommunications: {
		'Any': 'Any',
		'GatewaySendsToPrimary': 'GatewaySendsToPrimary'
	},
	NetworkElectionStyle: {
		'None': 'None',
		'Immediate': 'Immediate',
		'Polled': 'Polled'
	},
	NodeStatus: {
		'Online': 'Online',
		'Offline': 'Offline'
	}
}

});