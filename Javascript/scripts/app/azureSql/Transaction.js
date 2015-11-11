define([],
function(){

	function Transaction(csn, data){
		this.csn = csn;
		this.data = data;
	}

	Transaction.prototype.toString = function(){
		return "(CSN=" + this.csn + " " + this.data + ")";
	}

	return Transaction;

});