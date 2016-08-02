var express = require('express');
var sleep = require('sleep');

var request = require('urllib-sync').request;
var app = express();

pulser_site = "http://25.133.238.121:9003"
mux_site    = "http://25.133.238.121:9002"

function write_mux(msg)
{
    wsite = mux_site+"/writecf/"+msg 
    var res = request(wsite);
    sleep.usleep(50000);
    return res['data'].toString()
}

function write_pulser(msg)
{
    wsite = pulser_site+"/writecf/"+msg 
    var res = request(wsite);
    sleep.usleep(50000);
    return res['data'].toString()
}

function read_pulser()
{
    rsite = pulser_site+"/read/" 
    var res = request(rsite);
    //get last datapoimt
    return res['data'].toString().split("\r\n").slice(-3,-2)[0];
}

function check_pulser_ok()
{
    rsite = pulser_site+"/read/"
    var res = request(rsite);
    foo = res['data'].toString().slice(-4)
    return foo == "OK\r\n";
}

function read_mux()
{
    rsite = mux_site+"/read/" 
    var res = request(rsite);
    //get last element
    return res['data'].toString().split("\n").slice(-3,-2)[0];
}

function process_waveform(wave)
{
    first = []
    second = []
    wave = wave.split(")(")
    pairs = []
    for (w in wave) {pairs.push(wave[w].replace(/(\(|\))/g,"").split(","))}
    for (p in pairs){first.push(parseInt(pairs[p][0],16));second.push(parseInt(pairs[p][1],16))};
    return [first,second]
}

function get_waveform()
{
    write_pulser("param_WaveForm?");
    watchdog = 0
    sleep.usleep(100000)
    while ((check_pulser_ok() == false ) & (watchdog < 20) )
    {
        sleep.usleep(200000)
        watchdog = watchdog + 1;
    }

    if (watchdog < 20) return process_waveform(read_pulser())
    else return "pusler timed out"
}



app.get("/",function(req,res){res.send(get_waveform());})

app.get("/last_from_pulser/",function(req,res){res.send(read_pulser());})

app.get("/last_from_mux/",function(req,res){res.send(read_pulser());})
 
app.get('/write_to_pulser/*', function (req, res) {res.send(write_pulser(req['originalUrl'].split("/").slice(-1)) ) });

app.get('/write_to_mux/*', function (req, res) {res.send(write_mux(req['originalUrl'].split("/").slice(-1)) ) });


app.listen(3000, function () {console.log('Example app listening on port 3000!');});



