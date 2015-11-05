define(['knockout',
		'app/Constants' ],
function(ko,
		 CONST){

	function Message(name, messageType, payload){
		var self = this;
		self.name = name;
		self.type = messageType;
		self.payload = payload;

		self.display = {
			startX: ko.observable(200),
			startY: ko.observable(0),
			x: ko.observable(0),
			y: ko.observable(0),
			time: ko.observable(1000),
			delivered: function(){}
		};
		self.display.description = ko.computed(function(){
			if(self.type == CONST.MESSAGE_TYPES.Write)
				return self.name + ' (' + self.type[0] + ' ' + payload + ')';
			else if(self.type == CONST.MESSAGE_TYPES.Read)
				return self.name + ' (' + self.type[0] + ' ' + payload + ')';
			else
				return self.name + ' (' + self.type[0] + ')';
		});
	}

	return Message;

});