define([],
function(){

	function StoredData(key, value){
		this.key = key;
		this.value = value;

		this.display = {
			description: key + ":" + value
		};
	}

	return StoredData;

});