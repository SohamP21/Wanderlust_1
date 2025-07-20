const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.send("User root route");
});

router.get("/profile", (req, res) => {
    res.send("User profile route");
});

module.exports = router;
