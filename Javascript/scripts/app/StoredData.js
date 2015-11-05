define(['knockout'],
function(ko){

	function StoredData(key, value){
		var self = this;
		self.key = key;
		self.value = ko.observable(value);

		this.display = {
			description: ko.computed(function(){
				return self.key + ":" + self.value();
			})
		};
	}

	return StoredData;

});