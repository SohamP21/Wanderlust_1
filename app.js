if(process.env.NODE_ENV !== 'production'){
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride= require("method-override");
const ejsMate = require("ejs-mate");
app.use(express.static(path.join(__dirname, "/public")));
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema , reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const {router: listings} = require("./routes/listing.js");
const reviews = require("./routes/review.js");
const user = require("./routes/user.js");



const dbUrl = process.env.ATLASDB_URL;

main()
    .then(()=> {
    console.log("connected to DB");

    })
    .catch(err => {
    console.log("Database connection error:", err);
    });
async function main() {
    await mongoose.connect(dbUrl);
}

// async function main() {
//   await mongoose.connect(dbUrl, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     tls: true,
//     // For debugging SSL issues, you could temporarily allow invalid certs:
//     // tlsAllowInvalidCertificates: true,    // NOT recommended for production
//     serverSelectionTimeoutMS: 30000,
//   });
// }



app.listen (8080, ()=> {
    console.log("server is running on port 8080");
}) ;

app.set("view engine", 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs' , ejsMate);

const store = MongoStore.create({
    mongoUrl : dbUrl,
    crypto : {
        secret : process.env.SECRET,
    },
    touchAfter : 24 * 60 * 60,
});

store.on("error", () => {
    console.log("ERROR IN MONGO SESSION STORE" ,err);
});


const sessionOptions = { 
    store,      
    secret : process.env.SECRET,
    resave : false, 
    saveUninitialized : true,
    cookie : {
        expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60  * 60 * 1000,
        httpOnly : true
    },
};
// app.get("/", (req,res)=> {
//     res.send("Hi, I am root.");
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();

});

// app.get("/demouser" , async(req,res) => {
//     let fakeUser = new User ({
//         email : "student@gmail.com",
//         username : "delta-student"
//     });

//     let registeredUser = await User.register(fakeUser , "helloworld");
//     res.send(registeredUser);

// })




const validateListing = (req,res,next)=> {
    let {error} = listingSchema.validate(req.body);
        if(error){
            let errMsg = error.details.map(el => el.message).join(",");
            throw new ExpressError(400,errMsg);

        }
        else{
            next();
        }
};


app.use("/listings" , listings);
app.use("/listings/:id/reviews" ,reviews);
app.use("/", user);

//Index Route
app.get("/listings", async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index", { allListings });
});

app.get("/listings/new" , async(req,res)=> {
    res.render("listings/new.ejs");
});

//Show Route
app.get("/listings/:id", async (req, res) => {
    let id = req.params.id.trim(); // just remove extra spaces

    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show", { listing });
});

app.post("/listings" ,
     validateListing,
    wrapAsync(async(req,res,next) => {
        
    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect("/listings");
   
})
);

app.get("/listings/:id/edit", async (req, res) => {
    let id = req.params.id.trim(); // Fix: remove extra spaces
    const listing = await Listing.findById(id);
    res.render("listings/edit", { listing });  // You don’t need .ejs here
});

app.put("/listings/:id",
    validateListing,
    wrapAsync(async(req,res)=> {
       
    let id = req.params.id.trim();
    await Listing.findByIdAndUpdate(id , {...req.body.listing});
    res.redirect(`/listings/${id}`);
})
);

app.delete("/listings/:id", async(req,res)=> {
    let id=req.params.id.trim();
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing deleted successfully!!");
    res.redirect("/listings");
});





