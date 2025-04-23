var ip = "m10.cloudmqtt.com";
var port = "37629";
var usessl = true;
var username = '';
var password = '';
var id = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
var message, client;
var connected = false;
var widgetRepository = {}; //property names are datastreams(keys), values are widget objects

function CreateWidget(config) {
    var datastream = config.datastream;
    if (Array.isArray(datastream)) {
        datastream.forEach(function (element) {
            widgetRepository.hasOwnProperty(element) ? console.log("Duplicate Datastream: " + element) : (widgetRepository[element] = config);
        })
    } else if (typeof datastream === 'string' || datastream instanceof String) {
        widgetRepository.hasOwnProperty(datastream) ? console.log("Duplicate Datastream: " + datastream) : (widgetRepository[config.datastream] = config);
    }
}

function connectMQTT() {
    client = new Paho.MQTT.Client(ip, Number(port), id);
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;
    client.connect({
        userName: username,
        password: password,
        useSSL: usessl,
        onSuccess: onConnect,
        onFailure: onFailure,
        reconnect: true
    });
}

function onConnect() {
    console.log("Connected to server");
    resetUsernamePassword();
    $("#mainPage").show();
    var widget = {};
    for (var widgetKey in widgetRepository) {
        widget = widgetRepository[widgetKey];
        if (widget.type == '')
            widget.type = "gauge";

        widget.widgetVar = widget.type + "_" + widget.bindto;
    }

    //each key is a datastream which is subscribed
    Object.keys(widgetRepository).forEach(function (datastream, index) {
        client.subscribe(datastream, {
            qos: 0
        });
    });
}

function onMessageArrived(message) {
    try {
        console.log("Recieved Message from server");
        var value = message.payloadString;
        var datastream = message.destinationName;
        console.log("datastream: " + datastream + ", value: " + value);

        var widget = widgetRepository[datastream];
        updateLabelText(widget, value);
    } catch (e) {
        console.log("exception in onMessageArrived: " + e);
        return false;
    }
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:" + responseObject.errorMessage);
    }
}

function updateLabelText(widget, value) {
    $('#' + widget.bindto).html(value);
}

//Code added for login popup
function setUserCredentails(username, password) {
    this.username = username;
    this.password = password;
}

function resetUsernamePassword() {
    $("#username").val('');
    $("#password").val('');
    username = '';
    password = '';
}

function onFailure(responseObject) {
    if (responseObject.errorCode === 8) {
        console.log("onFailure errorCode/errorMessage: " + responseObject.errorCode + "/" + responseObject.errorMessage);
        $("#validateHeader").text("Invalid Username/Password. Please enter again.");

    } else if (responseObject.errorCode === 7) {
        console.log("onFailure errorCode/errorMessage: " + responseObject.errorCode + "/" + responseObject.errorMessage);
        $("#validateHeader").html("New SSL Certificate added. Import SSL Certificate.");

    } else if (responseObject.errorCode !== 0 && responseObject.errorCode !== 8 && responseObject.errorCode !== 7) {
        console.log("onFailure errorCode/errorMessage: " + responseObject.errorCode + "/" + responseObject.errorMessage);
        $("#validateHeader").text("Contact Administrator.");

    }
    resetUsernamePassword();
    $("#dialog-form").dialog("open");
}

//submit login form on pressing enter key in password field
$('#password').keypress(function (e) {
    if (e.which == 13) {
        $('#credentailsSubmit').click();
        return false;
    }
});

$(function () {
    $("#dialog-form").dialog({
        autoOpen: true,
        closeOnEscape: false,
        open: function (event, ui) {
            $(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
        },
        position: { my: "center", at: "top", of: window }
    });
    $("#credentailsSubmit").on("click", function () {
        const username = $("#username").val(),
            password = $("#password").val();

        if (username != '' && password != '') {
            $("#dialog-form").dialog("close");
            setUserCredentails(username, password);
            connectMQTT();
        } else if (username === '' || password === '') {
            resetUsernamePassword();
            $("#validateHeader").text("Please enter Username and Password.");
            $("#username").focus();
        }
    });
});
