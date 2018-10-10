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
var _ = require('lodash');

router.get('/', function (req, res, next) {
  res.redirect('/stores')
})
/* GET home page. */
router.get('/stores', function (req, res, next) {
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
.get('/stores/:_storeId', function (req, res, next) {
  var data = {
    crumb: 'Baskets',
    baskets: []
  }
  var store_id = req.params['_storeId'];
  var fetchStores = "SELECT * from basket WHERE sid=" + store_id + " ORDER BY sid ASC";
  const pool = new Pool(settings.database.postgres);
  (async () => {
    const baskets = await pool.query(fetchStores);
    data.storenum = store_id;
    if(baskets.rowCount>0) {
          data.baskets = baskets.rows;
          for (let j = 0; j < data.baskets.length; j++) {
            const basket = data.baskets[j];
            basket.stat = {
              online : 'Offline',
              last_check : "Never Checked In",
              percent : "Unknown"
            };
            var fetchbattery = "SELECT bid, date_recorded::text, voltage from battery_level WHERE bid=" + basket.bid + " ORDER BY date_recorded DESC, batid DESC  limit 1";
            console.log('Battery : '+fetchbattery);
            const battery = await pool.query(fetchbattery);
            if(battery.rowCount) {
              basket.stat.last_check = getSanatizedDate(battery.rows[0].date_recorded);
              basket.stat.online = getOnlineStat(battery.rows[0].date_recorded)?'Online':'Offline';
              basket.stat.percent = getPercent(battery.rows[0].voltage);
              basket.stat.voltage = battery.rows[0].voltage;
            }
          };
    }

    pool.end();
    res.render('store_view', data);
    console.log(data);
  })().catch(e => setImmediate(() => {
    console.log("Error Occured While Fetching Baskets For Store Page");
    res.send("Error Occured While Fetching Baskets For Store Page");
  }))
});

function getSanatizedDate(date) {
  var sanatizedDate = date.replace(' ', 'T');
  return DateTime.fromISO(sanatizedDate).toFormat('LLL dd, hh:mma');
}
function getOnlineStat(date) {
  var sanatizedDate = date.replace(' ', 'T');
  var end = DateTime.fromISO(sanatizedDate);
  var start = DateTime.local();
  var diffdays = start.diff(end, 'days');
  if(diffdays.values.days >= 1) return false;
  else return true;
}
function getPercent(volts) {
  var x = volts
  if(x<3.3) x = 3.3
  if(x>4.2) x = 4.2
  var in_min = 3.3
  var in_max = 4.2
  var out_min = 0
  var out_max = 100
  var percent = (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
  return Math.round(percent);
}
module.exports = router;
