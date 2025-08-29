const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;

console.log("Mapbox Token:", mapToken); // Debug: check if token is loaded

const geocodingClient = mbxGeocoding({ accessToken: mapToken });

if (!mapToken) {
  throw new Error("Mapbox access token is missing. Please set the MAP_TOKEN environment variable.");
}


module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let id = req.params.id.trim();

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist found!!");
        return res.redirect("/listings");
    }

    console.log(listing);
    res.render("listings/show", { listing });
};

module.exports.createListing = async (req, res, next) => {
  let response = await geocodingClient
  .forwardGeocode({
    query: req.body.listing.location,
    limit: 1,
})
  .send();

  
    let url = "";
    let filename = "";

    if (req.file) {
        url = req.file.path;
        filename = req.file.filename;
        console.log(url, "..", filename);
    } else {
        console.log("No image file uploaded.");
    }

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    // Add image info if available
    // if (req.file) {
    //     newListing.image = { url, filename };
    // }
    newListing.image = {url , filename};
    newListing.geometry = response.body.features[0].geometry;

    let savedListing=await newListing.save();
    console.log(savedListing);
    req.flash("success", "Listing created successfully!");
    res.redirect("/listings");
};

module.exports.renderEdit = async (req, res) => {
    let id = req.params.id.trim();
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you have edited does not exist!!");
        return res.redirect("/listings");
    }
    let originalImageUrl =listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_300,w_250");
    res.render("listings/edit", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {

    let id = req.params.id.trim();
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    if(typeof req.file !== "undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url , filename };
    await listing.save();
    }
    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let id = req.params.id.trim();
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    res.redirect("/listings");
};
