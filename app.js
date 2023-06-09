//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const date = require(__dirname+"/date.js");
const _ = require("lodash")

const port = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret:process.env.SECRET2,
    resave: false,
    saveUninitialized:false

}));

app.use(passport.initialize());
app.use(passport.session());

//////////////////////////////////////////////////////////////////

const mongoose = require("mongoose");


mongoose.set("strictQuery", false);
mongoose.connect('mongodb+srv://nasir123:'+process.env.mongodbpas+'@cluster0.2s0bvae.mongodb.net/ToDouserDB');

const itemSchema = new mongoose.Schema({
    name : String
});
const listSchema = new mongoose.Schema({
    name: String,
    items : [itemSchema]
});
const userSchema = new mongoose.Schema({
    email : String,
    password : String,
    googleId : String,
    gitems: [itemSchema],
    sitems: [listSchema]
});

userSchema.plugin(passportLocalMongoose); 
userSchema.plugin(findOrCreate);

const Item = mongoose.model("item",itemSchema)
const List = mongoose.model("list",listSchema)

const User = new mongoose.model("User",userSchema);

const item1 = new Item({name:"Welcome to your todolist!"})
const item2 = new Item({name:"Hit the + button to add a new item."})
const item3 = new Item({name:"<-- Hit this, to delete an item."})
const defaulitems = [item1,item2,item3];

////////////////////////////////////////////////////////////////

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://infinitytodolist.onrender.com/auth/google/toDoList",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id, username :profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));

////////////////////////////////////////////////////////////////////
let Id = 0;
let name="";

app.get("/",function(req,res){
    res.render("home");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/toDoList', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
    // Successful authentication, redirect home.
    Id =req.user.id ;
    console.log(req.user);
    res.redirect('/home');
});

app.get("/home",function(req,res){
    
    
    if (req.isAuthenticated()){
        Id = req.user.id;
        name = req.user.username;
        console.log(name);
        day = date.getDate();
        
        ///////////////
        
        User.findById(Id,function(err,user){
            if (user.gitems.length === 0){
                user.gitems=defaulitems;
                user.save();
            }
            console.log(user.gitems.length);
            
            res.render("list",{reqname:name,listTitle:"Today "+day,listofitems:user.gitems});
            
            
        });  
    } else {
        res.render("login");
    }
    
});

app.get("/home/:customListName", function(req, res){
    
    if (req.isAuthenticated()){
        Id = req.user.id
        name = req.user.username;
        const customListName = _.capitalize(req.params.customListName);
        
        User.findById(Id,function(err,user){
            let found = false;
            let foundItem;
            user.sitems.forEach(item => {
                if(item.name === customListName){
                    found = true;
                    foundItem = item;
                }
            })
            if (!found){
                const newlist = new List({
                    name: customListName,
                    items : defaulitems
                });
                user.sitems.push(newlist);
                user.save();
                res.redirect("/home/"+customListName);
            }else{
                
                res.render("list",{reqname:name,listTitle:customListName,listofitems:foundItem.items});
            }
            
        })
    
    } else {
        res.render("login");
    }
    
    
})

app.get("/aboutme",function(req,res){
    res.render("aboutme");
})

app.post("/register",(req,res)=>{

    User.register({username: req.body.username},req.body.password, function(err,user){
        if (err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res, function(){
                Id = req.user.id;
                res.redirect("/home");
            })
        }
    })
});

app.post("/login", function(req,res){

    const user = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user, function(err){
        
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req,res,function(){
                Id = req.user.id;
                res.redirect("/home");
            })
        }
    })
})


app.post("/",function(req,res){
    Id = req.user.id
    name = req.user.username;

    const item = req.body.newItem;
    const listName = req.body.list;
    
    if (req.body.list === 'Today'){
        console.log(req.body);
        User.findById(Id,function(err,user){
            const newelem= new Item({name:item});
            user.gitems.push(newelem);
            user.save();
            res.redirect("/home");
        })
    } else {
        
        User.findById(Id,function(err,user){
            const newelem= new Item({name:item});
            
            user.sitems.forEach(item => {
                if(item.name === listName){
                    item.items.push(newelem);
                    user.save();
                    res.redirect("/home/"+listName );
                }
            })

        })
    }    
 
    
});

app.post("/delete",function(req,res){
    Id = req.user.id;
    name = req.user.username;
    const listName = req.body.listName.split(" ")[0]
    if (listName === 'Today'){
        User.findOneAndUpdate({_id:Id},{$pull : {gitems: {_id : req.body.list}}},function(err, foundresult){
            if(!err){
                console.log("sucess.");
                res.redirect("/home");
            }
            
        })
    } else {
        User.findById(Id,function(err,user){
            user.sitems.forEach(item => {
                if(item.name === req.body.listName){
                    item.items = item.items.filter(elem => {
                        return elem._id != req.body.list ;
                    })
                    user.save();
                    res.redirect("/home/"+req.body.listName);
                }
            })
                
        })

    }         
})

app.listen(port, function(){
    console.log("Server is running on port 3000.");
});




