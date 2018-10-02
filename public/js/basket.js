var sliderConfig = {
      dots: true,
      infinite: true,
      lazyLoad: 'ondemand',
      speed: 300,
      slidesToShow: 4,
      slidesToScroll: 1,

}
function ini() {
    $("#start").datepicker();
    $("#end").datepicker();

    $("#start").datepicker("option", "dateFormat", "dd-mm-yy");
    $("#end").datepicker("option", "dateFormat", "dd-mm-yy");

    $("#end").datepicker("setDate", new Date());
    $("#start").datepicker("setDate", new Date());
}

$('#submit').on('click',function (event) {
    fetchData(event)
})
$(function () {
    ini();

});
function getURL() {
    return used_host + "/smartbasket/api/images/range/" + storenum;
}
function fetchData(event) {
    event.preventDefault();
    var start_date = $("#start").datepicker("getDate");
    var end_date = $("#end").datepicker("getDate");
    console.log(start_date)
    console.log(end_date)
    var start_lux = luxon.DateTime.fromISO(new Date(start_date).toISOString());
    var end_lux = luxon.DateTime.fromISO(new Date(end_date).toISOString());
    var start = start_lux.year + "-" + (start_lux.month < 10 ? '0' + start_lux.month : start_lux.month) + "-" + (start_lux.day < 10 ? '0' + start_lux.day : start_lux.day)+"T00:00:00";
    var end = end_lux.year + "-" + (end_lux.month < 10 ? '0' + end_lux.month : end_lux.month) + "-" + (end_lux.day < 10 ? '0' + end_lux.day : end_lux.day) +"T23:59:00";
    var arr = {
        startDate: start,
        endDate: end
    };
    $.ajax({
        cache: false,
        type: 'POST',
        url: getURL(),
        dataType: "json",
        data: JSON.stringify(arr),
        contentType: 'application/json',
        xhrFields: {
            // The 'xhrFields' property sets additional fields on the XMLHttpRequest.
            // This can be used to set the 'withCredentials' property.
            // Set the value to 'true' if you'd like to pass cookies to the server.
            // If this is enabled, your server must respond with the header
            // 'Access-Control-Allow-Credentials: true'.
            withCredentials: false
        },
        headers: {
            "accept": "application/json",
        },
        success: function (data) {
            console.log(JSON.stringify(data));
            if (data.err) console.log('Serverside Error');
            else updateBaskets(data.data);
        },
        error: function (data) {
            console.log("Error");
            console.log(data);
        }
    });
    return false;
}
function updateBaskets(data_images) {

    var basket_keys = Object.keys(data_images);
    for (j = 0; j < basket_keys.length; j++) {
        var html = ""
        var basket_num = basket_keys[j];
        var basket = data_images[basket_num];
        
        for (i = 0; i < basket.length; i++) {
            var sanatizedDate = basket[i].date_recorded.replace(' ','T');
            var date = luxon.DateTime.fromISO(sanatizedDate).toFormat('LLL dd, hh:mma');
            html += "<div> <img src='" + basket[i].url + "' width='350' height='300'> <h3 class='img-date'> " + date + "</h3></div>"
        }
        if ($('#slider' + basket_num).hasClass('slick-initialized')){
            $('#slider' + basket_num).slick('unslick');
        }
        //$('#slider' + basket_num).slick('unslick');
        $("#slider" + basket_num).html(html);
        $('#slider' + basket_num).slick(sliderConfig);
    }   
}
