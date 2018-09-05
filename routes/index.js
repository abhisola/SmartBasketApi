var express = require('express');
var router = express.Router();
var {
  Pool,
  Client
} = require('pg');
var {
  DateTime
} = require('luxon');
var settings = require('../settings');
/* GET home page. */
router.get('/', function (req, res, next) {
  var data = {
    crumb: 'Stores',
    stores: []
  }
  var fetchRack = "SELECT * from store ORDER BY sid ASC";
  const pool = new Pool(settings.database.postgres);
  (async () => {
    const stores = await pool.query(fetchRack);
    data.stores = stores.rows;
    pool.end();
    res.render('store_list', data);
  })().catch(e => setImmediate(() => {
    console.log("Error Occured While Fetching Stores For Store Page");
    res.send("Error Occured While Fetching Stores For Store Page");
  }))
})
.get('/:_storeId', function (req, res, next) {
  var data = {
    crumb: 'Baskets',
    baskets: []
  }
  var store_id = req.params['_storeId'];
  var fetchRack = "SELECT * from basket WHERE sid=" + store_id + " ORDER BY sid ASC";
  const pool = new Pool(settings.database.postgres);
  (async () => {
    const baskets = await pool.query(fetchRack);
    data.baskets = baskets.rows;
    pool.end();
    res.render('store_view', data);
    console.log(data);
  })().catch(e => setImmediate(() => {
    console.log("Error Occured While Fetching Baskets For Store Page");
    res.send("Error Occured While Fetching Baskets For Store Page");
  }))
})
.get('/basket/:_basketId', function (req, res, next) {
  
});
module.exports = router;
