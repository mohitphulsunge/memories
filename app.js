var express = require('express');
var app = express();
app.set("view engine", "ejs");
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var methodOverride = require('method-override');
var Memory = require('./models/memory.js');
var Comment = require('./models/comment.js');
var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var User = require('./models/User.js');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

app.use(flash());
mongoose.connect(process.env.MONGO_DB_URL);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

//Pasport conifguration
app.use(require('express-session')({
	secret: "I wen to modern school",
	resave: false,
	saveUninitialize: false
	
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});


cloudinary.config({
cloud_name: process.env.CLOUD_NAME,
api_key: process.env.API_KEY_CLOUDINARY,
api_secret: process.env.SECRET_KEY_CLOUDINARY
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'memories',
    format: async (req, file) => 'png', // supports promises as well
    public_id: (req, file) => 'memory'+(new Date()).getTime(),
  },
});

const parser = multer({ storage: storage });

var loginMessages = [
	"Heyy! Please login to continue..",
	"Can you just take out 3 seconds to login??",
	"Do let me know if you are facing any troubles logging in ;)",
	"Please authorize youself by logging in.."
];

var logoutMessages = [
	"See you soon, good day!!",
	"Hope you have hundreds of memories next time you visit us!!",
	"Don't worry about your memories. We are safeguarding it for you.",
	"Hope you enjoyed Memories!"
];

var memorySavedMessages = [
	"Thanks for uploading a memory, promise to save it forever!!",
	"Wohoooo!! Just updates your memories!!",
	"Memorized! Don't stop posting your memories!!"
];

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

//routes
app.get("/", (request, response) => {
	response.render("login");
}
);

//INDEX -- Show all Memories
app.get("/memories", isLoggedIn,(request, response) => {
	//Get Memories
	Memory.find({}, function(err, posts) {
		if (err) {
			console.log(err);
		}
		else {
			
			response.render("index", { posts: posts, currentUser: request.user });
		}


	});


});

//NEW -- Add new memory
app.post("/memories", isLoggedIn, parser.single("image"), (request, response) => {
	//get data and redirect to memories page
 
	var title = request.body.title;
	var image = request.file.path;
	var description = request.body.description;
	var dateTime = new Date();
	console.log(dateTime);
	dateTime.toLocaleTimeString
	var author = {
		id: request.user._id,
		username: request.user.username
	};
	var newMemory = { title: title, image: image, description: description, author: author, dateTime: dateTime };
	Memory.create(newMemory,function(err, memory){
		if(err){
			console.log(err);
		}
		else{
			console.log(memory);
		}
	})
	
	request.flash("success", memorySavedMessages[randomIntFromInterval(0,memorySavedMessages.length - 1)]);
	response.redirect("/memories");
})

//NEW -- Option to add new Memory
app.get("/memories/new", isLoggedIn,(request, response) => {
	response.render("newMemory");
});

//Show -- Show information about a particular memory
app.get("/memories/:id", isLoggedIn,function(req, res){
	Memory.findById(req.params.id).populate("comment").exec( function(err, foundPost){
		if(err){
			console.log(err);
		}
		else{
			res.render("show", {post: foundPost});
		}
		
	});
	
});

app.get("/memories/:id/comments/new",isLoggedIn, function(req, res){
	Memory.findById(req.params.id, function(err, post){
		if(err){
			console.log(err);
		}
		else{
			res.render("newComment", {post: post});
		}
		
		
	});
	
	
});


app.post("/memories/:id/comments", isLoggedIn, function(req, res){
	console.log("In post");
	Memory.findById(req.params.id, function(err, memory){
		if(err){
			console.log(err);
		}
		else{
			
			Comment.create(req.body.comment, function(err, comment){
			console.log(comment);	
				if(err){
			console.log(err);
			}else{
				//add username and id to comment
				comment.author.id = req.user._id;
				comment.author.username = req.user.username;
				comment.save();
				memory.comment.push(comment);
				memory.save();
				res.redirect('/memories/'+memory._id);
			}	
				
				
			});
		}
		
	});
	
	
	
});

//Edit memories
app.get("/memories/:id/edit", isLoggedIn, function(req, res){
	Memory.findById(req.params.id, function(err, foundMemmory){
		if(err){
			console.log(err);
		}
		else{
			res.render("edit", {memory: foundMemmory});
		}
		
	})
	
	
})
//TODO: Check middleware functionlaity
app.put("/memories/:id",checkLoginAndMemoryOwnership,function(req, res){
	Memory.findByIdAndUpdate(req.params.id, req.body.memory, function(err, updatedMemory){
		if(err){
			console.log(err);
		}
		else{
			console.log(updatedMemory);
			res.redirect('/memories/'+req.params.id);
		}
	});
});


app.delete("/memories/:id",checkLoginAndMemoryOwnership, function(req, res){
	
	if(typeof Memory.findById(req.params.id).comment._id !== 'undefined'){
	console.log("checkoint");
	Comment.findByIdAndRemove(Memory.findById(req.params.id).comment._id, function(err){
		if(err){
			console.log(err);
		}
		else{
			console.log("deleted comment");
		}
		
	});
	}
	Memory.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
		}
		else{
			res.redirect('/memories/');
		}
	});
});


//Auth Routes
app.get("/register", function(req, res){
	res.render("register");
	
});

app.post("/register", function(req, res){
	if(req.body.password === "thisIsARandomPasswordForSecurity987612345"){
	var newUser = new User({username: req.body.username});
	User.register(newUser, req.body.password, function(err, user){
		if(err){
			console.log(err);
			req.flash("error", err.message);
			return res.render("register");
		}
		passport.authenticate("local")(req, res, function(){
			res.redirect("/memories");
		});
		
	});
	
}else{
	res.redirect("/register");
}
});

app.get("/login", function(req, res){
	res.render("login");
	
});

app.post("/login", passport.authenticate("local",{
	successRedirect: "/memories",
	failureRedirect: "/login"
}), function(req, res){});


//logout route
app.get("/logout", function(req, res){
	req.logout();
	req.flash("success", logoutMessages[randomIntFromInterval(0,logoutMessages.length - 1)]);
	res.redirect("/login");
});



function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", loginMessages[randomIntFromInterval(0,loginMessages.length - 1)]);
	res.redirect("/login");
	
}

function checkLoginAndMemoryOwnership(req, res, next){
	if(req.isAuthenticated()) {
	Memory.findById(req.params.id, function(err, foundMemory){
		if(err){
			req.flash("error", loginMessages[randomIntFromInterval(0,loginMessages.length - 1)]);
			res.redirect("back");
		}
		else{
			console.log(foundMemory.author.id);
			console.log(req.user._id);
			if(foundMemory.author.id.equals(req.user._id)){
				return next();
			}
			else{
				req.flash("error", loginMessages[randomIntFromInterval(0,loginMessages.length - 1)]);
				res.redirect("back");
			}
		}
		
		
	});
	
	
}

}




app.listen(process.env.PORT || 80, () => {
	console.log("Server started");
});