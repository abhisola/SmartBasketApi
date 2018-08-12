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
var uploadDir = 'public/uploads';
app.get('/images', (req, res) => {
  let images = getImagesFromDir(path.join(__dirname, 'public/uploads'));
  res.render('index', {
    title: 'Camera Trap Image Server',
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
app.post('/smartbasket/api/:_storeId/:_basketId', function (req, res) {
  var d = new Date()
  var filename = dateFormat(new Date(), "mm-dd-yyyy_HH_MM_ss") + ".jpg";
  filename = path.join(__dirname, uploadDir + '/' + filename);
  var f = fs.createWriteStream(filename);
  req.on('data', function (chunk) {
    f.write(chunk);
  }).on('end', function () {
    f.end();

    // rotate image 180 degrees because camera is mounted upside-down
    /*jimp.read(filename, function (err, image) {
      image.rotate(180)
        .write(filename);
    }).catch(function (err) {
      console.log("error: " + err);
    });*/

    console.log("saved " + filename);
    res.status(200).end("OK");
  });

});

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
