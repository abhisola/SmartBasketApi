var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var path = require('path');
const aws = require('aws-sdk');
var fs = require('fs');
var dateFormat = require('dateformat');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var smartBasketRouter = require('./routes/smartbasket');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/smartbasket', smartBasketRouter);
var uploadDir = 'public/images';

app.get('/smartbasket/api/images/:_storenum', (req, res) => {
    var storenum = req.params['_storenum'];
    let images = getImagesFromDir(path.join(__dirname, uploadDir));
    res.render('index', {
        title: 'Smart Basket Image Server',
        images: images
    })
});
/*
app.post('/smartbasket/api/:_storenum/:_basketnum', function (req, res, next) {
  var d = new Date()
  var basketnum = req.params['_basketnum'];
  var storenum = req.params['_storenum'];
  var filename = basketnum + "-" + dateFormat(new Date(), "HH_MM") + ".jpg";
  filename = path.join(__dirname, uploadDir + '/' + filename);
  var f = fs.createWriteStream(filename);
  req.on('data', function (chunk) {
    f.write(chunk);
  }).on('end', function () {
    f.end();
    console.log("saved " + filename);
    res.status(200).end("OK");
  });
});
*/
function getImagesFromDir(dirPath) {
    let allImages = [];

    let files = fs.readdirSync(dirPath);

    for (file of files) {
        let fileLocation = path.join(dirPath, file);
        var stat = fs.statSync(fileLocation);
        if (stat && stat.isDirectory()) {
            getImagesFromDir(fileLocation); // process sub directories
        } else if (stat && stat.isFile() && ['.jpg', '.png'].indexOf(path.extname(fileLocation)) != -1) {
            allImages.push('/images/' + file);
        }
    }
    return allImages;
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    console.log('Error');
    console.log(err);
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
