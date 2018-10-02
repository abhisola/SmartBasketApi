//taskkill /F /IM node.exe
var express = require('express');
var router = express.Router();
var path = require('path');
const aws = require('aws-sdk');
var fs = require('fs');
var dateFormat = require('dateformat');
var s3 = new aws.S3();
var settings = require('../settings');
var myBucket = require('../settings').s3.bucket;
var s3_url = require('../settings').s3.url;
var { DateTime } = require('luxon');
var rm = require('rimraf');
var { Pool, Client } = require('pg');
var _ = require('lodash');

var uploadDir = '/temp_images';
router.get('/images', (req, res) => {
    let images = getImagesFromDir(path.join(__dirname, 'public/uploads'));
    res.render('index', {
        title: 'Smart Basket Image Server',
        images: images
    })
});

function getImagesFromDir(dirPath) {
    let allImages = [];

    let files = fs.readdirSync(dirPath);

    for (file of files) {
        let fileLocation = path.join(dirPath, file);
        var stat = fs.statSync(fileLocation);
        if (stat && stat.isDirectory()) {
            getImagesFromDir(fileLocation); // process sub directories
        } else if (stat && stat.isFile() && ['.jpg', '.png'].indexOf(path.extname(fileLocation)) != -1) {
            allImages.push('/uploads/' + file);
        }
    }
    return allImages;
}

router.delete('/api/:_storeId/:_basketId', function (req, res) {
    rimraf('.' + uploadDir + '/*', function () {
        console.log('done');
        res.status(200).end("OK");
    });
});

router.post('/api/:_storeId/:_basketId', function (req, res) {
    var store_id = req.params['_storeId'];
    var basket_id = req.params['_basketId'];
    var today = new Date();
    const pool = new Pool(settings.database.postgres);

    var filename = dateFormat(new Date(), "mm-dd-yyyy_HH_MM_ss") + ".jpg";
    filename = path.join(__dirname, uploadDir + '/' + filename);
    var f = fs.createWriteStream(filename);
    req.on('data', function (chunk) {
        f.write(chunk);
    }).on('end', function () {
        f.end();
        var get_store = "SELECT * from store WHERE sid=$1 LIMIT 1";
      (async () => {
          const dbResponse = await pool.query(get_store, [store_id]);
          console.log(dbResponse.rows);
          if (dbResponse.rowCount > 0) {
              var zone = dbResponse.rows[0].zone;
              var minus = Number(zone) < 0 ? true : false;
              var str = zone + '';
              var has_minutes = str.indexOf('.') != -1? true : false ;
              min = 0;
              if(has_minutes) min = str.substr(str.indexOf('.')+1, str.length)
              hour = minus ? str.substr(1, str.indexOf('.')-1) : str.substr(0, str.indexOf('.')-1)
              var lux = minus ? DateTime.local().minus({ hours: hour, minutes: min }) : DateTime.local(today).plus({ hours: hour, minutes: min })
              var name = basket_id + "-" + (lux.hour < 10 ? ('0' + lux.hour) : lux.hour) + "" + (lux.minute < 10 ? ('0' + lux.minute) : lux.minute) + ".jpg";
              var path = store_id + "/" + (lux.year < 10 ? ('0' + lux.year) : lux.year) + "/" + (lux.month < 10 ? ('0' + lux.month) : lux.month) + "/" + (lux.day < 10 ? ('0' + lux.day) : lux.day) + "/" + name;
              console.log(path);
              var db_data = {
                  url : s3_url+path,
                  basketId : basket_id,
                  date_recorded: getDateTime(lux),
                  storeId : store_id
              }
              savetos3(filename, path, db_data, res);
          } else {
              res.json({
                  success: false,
                  msg: 'Nothing Found!',
                  data: []
              });
          }
          pool.end()
          //res.json({success:true,msg:'Restock Response Processed Successfully for '+start, data:[]});
      })().catch(e => setImmediate(() => {
          console.error(e);
      }))
    });

});

router.post('/api/images/range/:_storeId', function (req, res, next) {
    var store_id = req.params['_storeId'];
    var data = req.body;
    console.log(data)
    var start = data.startDate;
    var end = data.endDate;

    var querry = "SELECT url, bid, date_recorded::text FROM basket_stock " +
        "WHERE date_recorded >= '" + start + "' AND  date_recorded <= '" + end + "' " +
        "AND sid = '" + store_id + "' " +
        "ORDER BY date_recorded ASC";
    const pool = new Pool(settings.database.postgres);
    console.log(querry);
    (async () => {
        const dbresRacks = await pool.query(querry)
        if(dbresRacks.rows){
            var output = _.groupBy(dbresRacks.rows, function (b) {
                return b.bid;
            });
            res.json({err:null,data:output});
        } else {
            res.json({err:dbresRacks,data:[]});
        }
        pool.end()
    })().catch(e => setImmediate(() => {
        console.error(e);
    }))
    
}) 

router.post('/api/battery/:_storeId/:_basketId', function (req, res, next) {
    var store_id = req.params['_storeId'];
    var basket_id = req.params['_basketId'];
    var voltage = req.body.voltage;
    var get_store = "SELECT * from store WHERE sid=$1 LIMIT 1";
    const pool = new Pool(settings.database.postgres);
      (async () => {
          const dbResponse = await pool.query(get_store, [store_id]);
          console.log(dbResponse.rows);
          if (dbResponse.rowCount > 0) {
              var zone = dbResponse.rows[0].zone;
              var minus = Number(zone) < 0 ? true : false;
              var str = zone + '';
              var has_minutes = str.indexOf('.') != -1? true : false ;
              min = 0;
              if(has_minutes) min = str.substr(str.indexOf('.')+1, str.length)
              hour = minus ? str.substr(1, str.indexOf('.')-1) : str.substr(0, str.indexOf('.')-1)
              var lux = minus ? DateTime.local().minus({ hours: hour, minutes: min }) : DateTime.local(today).plus({ hours: hour, minutes: min })
              var db_data = {
                  voltage : voltage,
                  basketId : basket_id,
                  date_recorded: getDateTime(lux),
                  storeId : store_id
              }
              saveVoltage(db_data, res);
          } else {
              res.json({
                  success: false,
                  msg: 'Nothing Found!',
                  data: []
              });
          }
          pool.end()
          //res.json({success:true,msg:'Restock Response Processed Successfully for '+start, data:[]});
      })().catch(e => setImmediate(() => {
          console.error(e);
      }))

    
})

function savetos3(localpath, s3path, data_db, res) {
    fs.readFile(localpath, function (err, data) {
        if (err) {
            throw err;
        }
        var params = {
            Bucket: myBucket,
            Key: s3path,
            Body: data
        };
        s3.putObject(params, function (err, data) {
            if (err) {
                console.log(err)
            } else {
                console.log("Successfully uploaded data to S3");
                saveToDb(data_db, res);
                houseCleaning();
            }
        });
    });
}

function houseCleaning(){
   console.log('Emptying temp_images');
    
}
function saveVoltage(data, res) {
    const pool = new Pool(settings.database.postgres);
    var insert_basket_voltage = "INSERT INTO battery_level (voltage, bid, date_recorded, sid) VALUES($1, $2, $3, $4)";
    (async () => {
        const dbResponse = await pool.query(insert_basket_voltage, [data.voltage, data.basketId, data.date_recorded, data.storeId]);
        if (dbResponse.rowCount > 0) {
            console.log('Saved');
            res.json({
                success: false,
                msg: 'Saved',
                data: []
            });
        } else {
            res.json({
                success: false,
                msg: 'Nothing Saved!',
                data: []
            });
        }
        pool.end()
        //res.json({success:true,msg:'Restock Response Processed Successfully for '+start, data:[]});
    })().catch(e => setImmediate(() => {
        console.error(e);
    }))
}
function saveToDb(data, res) {
    const pool = new Pool(settings.database.postgres);
    var insert_basket_stock = "INSERT INTO basket_stock (url, bid, date_recorded, sid) VALUES($1, $2, $3, $4)";
    (async () => {
        const dbResponse = await pool.query(insert_basket_stock, [data.url, data.basketId, data.date_recorded, data.storeId]);
        if (dbResponse.rowCount > 0) {
            console.log('Saved And Done Uploading');
            res.json({
                success: false,
                msg: 'Saved And Done Uploading',
                data: []
            });
        } else {
            res.json({
                success: false,
                msg: 'Nothing Found!',
                data: []
            });
        }
        pool.end()
        //res.json({success:true,msg:'Restock Response Processed Successfully for '+start, data:[]});
    })().catch(e => setImmediate(() => {
        console.error(e);
    }))
}
function getDateTime(lux) {
    var hour = lux.hour;
    hour = (hour < 10 ? "0" : '') + hour;

    var min = lux.minute;
    min = (min < 10 ? "0" : '') + min;

    var sec = lux.second;
    sec = (sec < 10 ? "0" : '') + sec;

    var year = lux.year;

    var month = lux.month;
    month = (month < 10 ? "0" : '') + month;

    var day = lux.day;
    day = (day < 10 ? "0" : '') + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec
}

module.exports = router;