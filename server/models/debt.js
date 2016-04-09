// Definition of the document type and basic operations on debts.
var cozydb = require('cozydb');

var Debt = cozydb.getModel('Debt', {
    /*
        The description is the subject of debt, why do we contract the debt in
        the first place.
    */
    'description': {
        default: '',
        type: String,
    },

    /*
        The amount is how much do we owe.
    */
    'amount': {
        default: 0.0,
        type: Number,
    },

    /*
        The due date is an optional field to allow to set a due date.
    */
    'dueDate': {
        default: null,
        type: Date,
    },

    /*
        The creditor represents who we owe.
    */
    'creditor': {
        default: '',
        type: String,
    },
});


// Make this model available from other files.
module.exports = Debt;
