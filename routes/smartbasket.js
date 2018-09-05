//taskkill /F /IM node.exe
var express = require('express');
var router = express.Router();
var path = require('path');
const aws = require('aws-sdk');
var fs = require('fs');
var dateFormat = require('dateformat');
var s3 = new aws.S3();
var myBucket = require('../settings').s3.bucket;
var s3_url = require('../settings').s3.url;
var { DateTime } = require('luxon');
var { Pool, Client } = require('pg');

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
    var todaysDate = getDateTime();
    var iso = todaysDate.replace(' ', 'T');
    const pool = new Pool(settings.database.postgres);
    var year = 2018;
    var month = 09;
    var day = 03;
    var min = 25;
    var hour = 23;

    var filename = dateFormat(new Date(), "mm-dd-yyyy_HH_MM_ss") + ".jpg";
    filename = path.join(__dirname, uploadDir + '/' + filename);
    var f = fs.createWriteStream(filename);
    req.on('data', function (chunk) {
        f.write(chunk);
    }).on('end', function () {
        f.end();
        var name = basketId + "-" + hour + "" + min + ".jpg";
        var path = storeId + "/" + year + "/" + month + "/" + day + "/" + name;
        savetos3(filename, path);

        var url = s3_url + path;
        var insert_basket_stock = "INSERT INTO basket_stock (url, bid) VALUES($1, $2)"
        var get_store = "SELECT * from store WHERE sid=$1 LIMIT 1"
      (async () => {
          const dbResponse = await pool.query(get_store, [store_id]);
          console.log(dbResponse.rows);
          if (dbResponse.rowCount > 0) {
              var zone = dbResponse.rows[0].zone;
              var minus = zone < 0 ? true : false;
              var str = zone + '';
              var has_minutes = str.indexOf('.') != -1? true : false ;
              min = 0;
              if(has_minutes) min = str.substr(str.indexOf('.'), str.length)
              res.json({
                  success: true,
                  msg: 'Found data',
                  data: output
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
        console.log("saved " + filename +" -> "+ path);
        res.status(200).end("OK");
    });

});


function savetos3(localpath, s3path) {
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
                console.log("Successfully uploaded data to ");
            }
        });
    });
}

function getDateTime() {
    var today = new Date();
    var hour = today.getHours();
    hour = (hour < 10 ? "0" : '') + hour;

    var min = today.getMinutes();
    min = (min < 10 ? "0" : '') + min;

    var sec = today.getSeconds();
    sec = (sec < 10 ? "0" : '') + sec;

    var year = today.getFullYear();

    var month = today.getMonth() + 1;
    month = (month < 10 ? "0" : '') + month;

    var day = today.getDate();
    day = (day < 10 ? "0" : '') + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec
}

module.exports = router;