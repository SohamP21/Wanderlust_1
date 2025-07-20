const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.send("Post root route");
});

router.get("/latest", (req, res) => {
    res.send("Latest posts route");
});

module.exports = router;
