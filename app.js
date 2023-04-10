const express = require("express")
const bodyParser = require('body-parser')
const date = require(__dirname+"/date.js")
const _ = require("lodash")


app = express();
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));

/////////////////////////////////////////////////////////////////////////////////////////////////////////

const mongoose = require("mongoose")

mongoose.set("strictQuery", false);
mongoose.connect('mongodb://127.0.0.1:27017/todolistDB', () => {
  console.log("Connected to MongoDB");
});


const itemSchema = new mongoose.Schema({
    name : String
});
const listSchema = new mongoose.Schema({
    name: String,
    items : [itemSchema]
});

const Item = mongoose.model("item",itemSchema)
const WItem = mongoose.model("workitem",itemSchema)
const List = mongoose.model("list",listSchema)

const item1 = new Item({name:"Welcome to your todolist!"})
const item2 = new Item({name:"Hit the + button to add a new item."})
const item3 = new Item({name:"<-- Hit this, to delete an item."})
const defaulitems = [item1,item2,item3];


///////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/",function(req,res){
    day = date.getDate();
    let items = [];
    ///////////////
    
    Item.find(function(err,elems){
        
        if (elems.length === 0){
            Item.insertMany(defaulitems,function(err){
                if (err){console.log(err)}
                else {console.log("The items added successfully!")}
            })   
            res.redirect("/");
        }else{
            
            
            res.render("list",{listTitle:"Today "+day,listofitems:elems});
        }
        
        
    });
    ///////////////
    

   
})

app.get("/work",function(req,res){
    
    let workitems = [];
    ///////////////
    WItem.find(function(err,elems){
        elems.forEach(function(elem){
            workitems.push(elem);
        })
        res.render("listw",{listTitle:"work list",listofitems:workitems});
               
    });
    ///////////////
    
})

app.get("/aboutme",function(req,res){
    res.render("aboutme");
})

app.get("/:customListName", function(req, res){
    const customListName = _.capitalize(req.params.customListName);
    List.findOne({name:customListName},function(err,foundlist){
        if(!err){
            if(!foundlist){
                
                const list = new List({
                    name: customListName,
                    items : defaulitems
                })
                list.save();
                res.redirect("/"+customListName);
            }else{
                res.render("list",{listTitle:customListName,listofitems:foundlist.items});
            }
        }
    })
    
    
})



app.post("/",function(req,res){
    
    console.log(req.body);
    const item = req.body.newItem;
    const listName = req.body.list;
    
    if (req.body.list ===  "work"){
        const newelem= new WItem({name:item})
        newelem.save();
        
        res.redirect("/work");
    } else if (req.body.list === 'Today'){
        const newelem= new Item({name:item})
        newelem.save();
        res.redirect("/")
    } else {
        const newelem= new Item({name:item})
        List.findOne({name:listName},function(err,foundlist){
            if(!err){
                foundlist.items.push(newelem);
                foundlist.save()
                res.redirect("/"+listName );
            }
        })
    }
    
    
})

app.post("/delete",function(req,res){
    console.log(req.body)
    const listName = req.body.listName.split(" ")[0]
    if (listName === 'Today'){
        Item.deleteMany({_id:req.body.list},function(err){
            if(err){console.log(err)}
            else {
                console.log("item deleted.");
                res.redirect("/");
            }
        }) 
    }
    else {
        List.findOneAndUpdate({name:listName},{$pull : {items: {_id : req.body.list}}},function(err, foundresult){
            if(!err){
                console.log("sucess.")
                res.redirect("/"+listName);
            }
            
        })
    }
    
})

app.post("/deletew",function(req,res){
    WItem.deleteMany({_id:req.body.list},function(err){
        if(err){console.log(err)}
        else {
            console.log("item deleted.");
            res.redirect("/work");
        }
    }) 
})


app.listen(3000, function(){
    console.log("Server is running on port 3000.");
})
