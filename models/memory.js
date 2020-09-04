var mongoose = require('mongoose');
var memorySchema = new mongoose.Schema({
	title: String,
	image: String,
	description: String,
	author: {
		id:{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}, 
		
		username: String
		
	},
	comment: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	],
	dateTime: Date
});

module.exports = mongoose.model("Memory", memorySchema);