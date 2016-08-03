//Imports
var express = require('express'); // Web Interface Stuff
var bodyParser = require('body-parser')
var cors = require('cors')
var sleep = require('sleep'); // Sleep for Pulser. If Interface is slow this is likely why
var request = require('urllib-sync').request; // For talking to forwarder
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var mkdirp = require('mkdirp');
var jsonfile = require('jsonfile')
var mongojs = require('mongojs')
var fs = require("fs")

//Replace Later with ARGV and in browser changes
mongo = "192.81.219.77"
pulser_site = "http://25.133.238.121:9003"
mux_site = "http://25.133.238.121:9002"
source = "mac_mini_129_2"
inid = "mux1"
db = mongojs(mongo + "/test_db")

//Define Functions
function write_mux(msg) {
    wsite = mux_site + "/write/" + msg
    var res = request(wsite);
    sleep.usleep(50000);
    return res['data'].toString()
}

function write_pulser(msg) {
    wsite = pulser_site + "/writecf/" + msg
    var res = request(wsite);
    sleep.usleep(50000);
    return res['data'].toString()
}

function read_pulser() {
    rsite = pulser_site + "/read/"
    var res = request(rsite);
    //get last datapoimt
    return res['data'].toString().split("\r\n").slice(-3, -2)[0];
}

function check_pulser_ok() {
    rsite = pulser_site + "/read/"
    var res = request(rsite);
    foo = res['data'].toString().slice(-4)
    return foo == "OK\r\n";
}

function read_mux() {
    rsite = mux_site + "/read/"
    var res = request(rsite);
    //get last element
    return res['data'].toString().split("\n").slice(-3, -2)[0];
}

function process_waveform(wave) {
    first = []
    second = []
    wave = wave.split(")(")
    pairs = []
    for (w in wave) {
        pairs.push(wave[w].replace(/(\(|\))/g, "").split(","))
    }
    for (p in pairs) {
        first.push(parseInt(pairs[p][0], 16));
        second.push(parseInt(pairs[p][1], 16))
    };
    return [first, second]
}

function get_waveform() {
    write_pulser("param_WaveForm?");
    watchdog = 0
    sleep.usleep(100000)

    while ((check_pulser_ok() == false) & (watchdog < 20)) {
        sleep.usleep(200000)
        watchdog = watchdog + 1;
    }

    if (watchdog < 20) return process_waveform(read_pulser())
    else return "pusler timed out"
}

function mux_commander(msg) {
    out = ""
    write_mux(out)

    if (msg['TransmissionMode'].toLocaleLowerCase == "pe") out = msg['Channel1']
    else if (msg['TransmissionMode'].toLocaleLowerCase == "tr") out = msg['Channel1'] + "," + msg['Channel2']

    write_mux(out)
    sleep.usleep(100000)
}

function epoch_commander(msg) {
    keys = []
    for (k in msg) keys.push(k)

    msgo = msg
    if (msgo['TransmissionMode'].toLowerCase() == "pe") msgo['TransmissionModeNo'] = 0
    else if (msgo['TransmissionMode'].toLowerCase() == "tr") msgo['TransmissionModeNo'] = 2

    available = "Freq,Range,TransmissionModeNo,BaseGain,FilterStandard,Delay"

    for (k in keys) {
        kk = keys[k]
        if (available.search(kk) > 0) write_pulser("param_" + kk + "=" + msgo[kk]);
    }

    msg['dtus'] = msg['Range'] / 495
    msg['amp'] = get_waveform()[0];
    return msg;

}

function shot(msg) {
    msg['source'] = source
    msg['inid'] = inid
    if (msg['Run?'].toLowerCase() == 'y') {
        mux_commander(msg);
        msg = epoch_commander(msg);
        msg['_id'] = parseInt(Date.now() / 1000)
        if (msg['Name'] != undefined) {

            //give it a run name if the table run name failed. shouldn't need this
            if (msg['run'] == undefined) msg['run'] = msg['Name'] + "_" + msg['TransmissionMode']

            //Save local file
            dd = new Date().toISOString().slice(0, 10)
            dd = "data-" + dd
            ddd = "data/" + dd
            mkdirp.sync(ddd)
            fn = ddd + "/" + msg['run'] + "_" + msg['_id'] + ".json"
            jsonfile.writeFileSync(fn, msg)

            //Then push to the db
            try {
                db.collection("acoustic_data").insert(msg)
            } catch (e) {
                console.log(e)
            }

        }

    }
    return msg
}

function save_table(msg) {
    fn = "settings_table.json"
    jsonfile.writeFileSync(fn, msg)
    msg['success'] = true
    return msg
}

function load_table() {
    fn = "settings_table.json"
    msg = jsonfile.readFileSync(fn)
    return msg
}

function fire_update(msg){msg['socket']="firefire";io.emit("update",msg)}

//Web Portion
app.use(cors());
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
app.use('/static',express.static('static'));
app.use('/fonts',express.static('fonts'));

app.post("/singleshot/", function (req, res) {
    //this is blocking for a while, I think
    res.send({'status':'working on it'})
    foo = shot(req.body)
    fire_update(foo)
    //res.send(foo);
    io.emit("singleshot",foo)
})

app.post("/settings/", function (req, res) {
    res.send("temp");
})

app.get("/", function (req, res) {
    res.send("What you talkin' bout Willis?")
})

app.get("/last_from_pulser/", function (req, res) {
    res.send(read_pulser());
})

app.get("/last_from_mux/", function (req, res) {
    res.send(read_mux());
})

app.get('/write_to_pulser/*', function (req, res) {
    res.send(write_pulser(req['originalUrl'].split("/").slice(-1)))
});

app.get('/write_to_mux/*', function (req, res) {
    res.send(write_mux(req['originalUrl'].split("/").slice(-1)))
});

app.post('/table_save/', function (req, res) {
    res.send(save_table(req.body));
});

app.get('/table_load/', function (req, res) {
    res.send(load_table());
});


server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

//Web Socket Stuff//

msq_queue = []
//this listens to _all_ connections and acts accordingly
io.on('connection', function (socket) {
    socket.on('frombrowbrow',function(data){console.log(data)})
});

//this sends a broadcast every 500 ms
//setInterval(function(){io.emit("news","ping")},500)


