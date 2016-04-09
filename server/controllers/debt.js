var express = require('express');
var router = express.Router();
var Debt = require('../models/debt');

// Create a new debt
router.post('/debts', function(req, res, next) {
    res.sendStatus(204);
});


// Fetch an existing debt
router.get('/debts/:id', function(req, res, next) {
    res.sendStatus(204);
});


// Update an existing debt
router.put('/debts/:id', function(req, res, next) {
    res.sendStatus(204);
});


// Remove an existing debt
router.delete('/debts/:id', function(req, res, next) {
    res.sendStatus(204);
});


// List of all debts, for a given creditor
router.get('/debts', function(req, res, next) {
    res.sendStatus(204);
});


// Export the router instance to make it available from other files.
module.exports = router;
