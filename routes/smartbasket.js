//taskkill /F /IM node.exe
var express = require('express');
var router = express.Router();
var path = require('path');
const aws = require('aws-sdk');
var fs = require('fs');
var dateFormat = require('dateformat');
//const S3_BUCKET = process.env.S3_BUCKET;
const S3_BUCKET = 'smart-basket-itcus';
var uploadDir = 'images';
aws.config.region = 'eu-west-1';
var {
    Pool,
    Client
} = require('pg');
router.get('/', function (req, res, next) {
    res.render('index', {
        title: 'Smart Basket'
    });
});
/*
router.post('/api/:_storenum/:_basketnum', function (req, res, next) {
    var basketnum = req.params['_basketnum'];
    var storenum = req.params['_storenum'];
    console.log('Someone Requested on: '+storenum+" - "+basketnum);
    var d = new Date();
    var filename = basketnum + "-" + dateFormat(new Date(), "HH:MM") + ".jpg";
    filename = path.join(__dirname, uploadDir + '/' + filename);
    var f = fs.createWriteStream(filename);
    var body = [];
    req.on('data', function (chunk) {
        body.push(chunk);
        f.write(chunk);
    }).on('end', function () {
        f.end();
        console.log("saved " + filename);
        res.status(200).end("OK");
        var data = Buffer.from(body);
        uploadImageToS3(filename, data);
    });
})*/

function uploadImageToS3(filename, data){
    // Create name for uploaded object key
    var keyName = 'filename';

    // Create a promise on S3 service object
    var bucketPromise = new aws.S3({
    }).createBucket({
        Bucket: S3_BUCKET
    }).promise();

    // Handle promise fulfilled/rejected states
    bucketPromise.then(
        function (data) {
            // Create params for putObject call
            var objectParams = {
                Bucket: S3_BUCKET,
                Key: keyName,
                Body: data,
                ACL: 'public-read'
            };
            // Create object upload promise
            var uploadPromise = new AWS.S3({
            }).putObject(objectParams).promise();
            uploadPromise.then(
                function (data) {
                    console.log("Successfully uploaded data to " + S3_BUCKET + "/" + keyName);
                });
        }).catch(
        function (err) {
            console.error(err, err.stack);
        });
}

module.exports = router;