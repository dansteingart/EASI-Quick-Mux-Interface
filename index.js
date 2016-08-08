//Imports
var express = require('express'); // Web Interface Stuff
var bodyParser = require('body-parser')
var cors = require('cors')
var sleep = require('sleep'); // Sleep for Pulser. If Interface is slow this is likely why
var request = require('urllib-sync').request; // For talking to forwarder
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var async = require("async");

var mkdirp = require('mkdirp');
var jsonfile = require('jsonfile')
var mongojs = require('mongojs')
var fs = require("fs")


args = process.argv;

pulser_site = ""
mux_site = ""
source = ""

for (a in args)
{
    setting = args[a].split("=")
    if (setting[0] == "pulser_site")       pulser_site = setting.slice(-1)[0]
    else if (setting[0] == "mux_site")     mux_site = setting.slice(-1)[0]
    else if (setting[0] == "source")       source = setting.slice(-1)[0]
}

if (pulser_site == "" | mux_site == "" | source=="") {console.log("need to set the source, mux_site, and pulser_site");process.exit()}

collection= source


mongo = "192.81.219.77"
db = mongojs(mongo + "/test_db")

function srequest(ssite)
{
    try{return request(ssite)}
    catch(e){queuer_on =false;queue_state['error']=e}
}

//Define Functions
function write_mux(msg) {
    wsite = mux_site + "/write/" + msg
    var res = srequest(wsite);
    sleep.usleep(50000);

    return res['data'].toString()
}

function write_pulser(msg) {
    wsite = pulser_site + "/writecf/" + msg
    var res = srequest(wsite);
    sleep.usleep(50000);
    return res['data'].toString()
}

function read_pulser() {
    rsite = pulser_site + "/read/"
    var res = srequest(rsite);
    //get last datapoimt
    return res['data'].toString().split("\r\n").slice(-3, -2)[0];
}

function check_pulser_ok() {
    rsite = pulser_site + "/read/"
    var res = srequest(rsite);
    foo = res['data'].toString().slice(-4)
    return foo == "OK\r\n";
}

function read_mux() {
    rsite = mux_site + "/read/"
    var res = srequest(rsite);
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


function mux_commander(msg) {
    out = ""
    write_mux(out)

    if (msg['TransmissionMode'].toLocaleLowerCase == "pe") out = msg['Channel1']
    else if (msg['TransmissionMode'].toLocaleLowerCase == "tr") out = msg['Channel1'] + "," + msg['Channel2']

    write_mux(out)
    sleep.usleep(100000)
}

//The async nightmare begins

//Start the shot
function start_shot(msg) {
    fire_queue_status()
    mux_queue_ready = false
    msg['source'] = source
    if (msg['Run?'].toLowerCase() == 'y') {
        mux_commander(msg);
        msg['_id'] = parseInt(Date.now() / 1000)
        msg = epoch_commander(msg);

    }
    //pass on
    else mux_queue_ready = true

}

//send data to the epoch commander
function epoch_commander(msg) {
    keys = []
    for (k in msg) keys.push(k)

    //sorry about this
    if (msg['TransmissionMode'].toLowerCase() == "pe") msg['TransmissionMode'] = 0
    else if (msg['TransmissionMode'].toLowerCase() == "tr") msg['TransmissionMode'] = 2

    available = "Freq,Range,TransmissionMode,BaseGain,FilterStandard,Delay"

    for (k in keys) {
        kk = keys[k]
        if (available.search(kk) > 0) {
            write_pulser("param_" + kk + "=" + msg[kk]);
        }
    }

    msg['dtus'] = msg['Range'] / 495

    //again, so sorry
    if (msg['TransmissionMode'] == 0) msg['TransmissionMode'] = "PE"
    else if (msg['TransmissionMode'] == 2) msg['TransmissionMode'] = "TR"
    get_waveform(msg);
    //    msg['amp'] = get_waveform()[0];
    //    return msg;

}

//then wait for the wave form.  can take up to 10 seconds so we make this a whilst and chek
function get_waveform(msg) {
    write_pulser("param_WaveForm?");
    watchdog = 0
    output = false
    sleep.usleep(100000)
    async.whilst(
        function testCondition() {
            return !output && watchdog < 20;
        },
        function increaseCounter(callback) {
            watchdog++;
            output = check_pulser_ok()
                //console.log("watchdog: "+watchdog);
                //callback must be called once this function has completed, it takes an optional error argument
            setTimeout(callback, 200);
        },
        function callback(err) {
            if (err) {
                console.log(err);
                return;
            }
            msg['amp'] = process_waveform(read_pulser())[0]
            end_shot(msg)
        }
    );

}

//when the above is done send off for final processing and fire to where it needs to go
function end_shot(msg) {
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
            db.collection(collection).insert(msg)
        } catch (e) {
            console.log(e)
        }
    }
    delete queue_state['single_shot']
    delete queue_state['current_run']

    io.emit("singleshot", msg)
    mux_queue_ready = true;
}

function save_table(msg) {
    fn = "settings_table.json"
    jsonfile.writeFileSync(fn,msg)
    msg['success'] = true
    return msg
}

function load_table() {
    fn = "settings_table.json"
    msg = jsonfile.readFileSync(fn)
    console.log(pulser_site)
    if (pulser_site.search(":") == -1)  pulser_site = "http://localhost:" + pulser_site
    if (mux_site.search(":") == -1)     mux_site = "http://localhost:" + mux_site


    return msg
}

function fire_update(msg) {
    msg['socket'] = "firefire";
    io.emit("update", msg)
}

//sending queue status
function fire_queue_status() {
    io.emit("queuestatus", queue_state)
};




//Web Portion
app.use(cors());
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
app.use('/static', express.static('static'));
app.use('/fonts', express.static('fonts'));

app.post("/singleshot/", function (req, res) {
    queuer_on = false;
    mm = req.body
    mm['singleshot'] = true
    queue_state["single_shot"] = "yes"
    queue_state['current_run'] = mm['run']

    res.send({
        'status': 'working on it'
    })
    foo = start_shot(mm)

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
    qq = req.body;
    msg_queue = qq;
    res.send(save_table(qq));
});

app.get('/table_load/', function (req, res) {
    res.send(load_table());
});

app.post('/queue_state/', function (req, res) {
    state = req.body
    msg_queue = load_table() //reload table for fun and profit
    //da fuq JSON?  No sending booleans?

    if (state['querer_on'] == 'false') queuer_on = false
    if (state['querer_on'] == 'true') queuer_on = true
});


server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

//Web Socket Stuff//

//this listens to _all_ connections and acts accordingly
io.on('connection', function (socket) {
    socket.on('frombrowbrow', function (data) {
        console.log(data)
    })
});


//QUEUE SON

msg_queue = load_table()

function start_over()
{
    queuer_on=false;
    mux_queue_ready=true;
    queue_state['current_run'] = undefined;
    queue_position=0;
}

var queuer_on = false
var mux_queue_ready = true
var queue_state = {}
queue_state['queuer_on'] = queuer_on
queue_position = 0;

setInterval(
    function () {
        queue_state['queuer_on'] = queuer_on
        if (queuer_on && mux_queue_ready) {
            queue_state['status'] = undefined
            //recall message here == increment if need be
            total_rows = msg_queue['data'].length
            if (queue_position >= total_rows) queue_position = 0;
            msg = msg_queue['data'][queue_position]
            queue_position++;
            queue_state['current_run'] = msg['run']
            try{start_shot(msg)}
            catch(e){
                console.log(e);
                start_over();
                error = e+" (excellent chance one of the hardware connections is bad)"
                console.log(error)
                queue_state['status'] = error
            }
        }
        fire_queue_status()
    }, 500)

//this sends a broadcast every 500 ms
//setInterval(function(){io.emit("news","ping")},500)
