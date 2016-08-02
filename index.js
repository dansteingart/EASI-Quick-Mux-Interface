var express = require('express');
var request = require('urllib-sync').request;
var app = express();

pulser_site = "http://25.133.238.121:9003"
mux_site    = "http://25.133.238.121:9002"

function write_mux(msg)
{
    wsite = mux_site+"/writecf/"+msg 
    var res = request(wsite);
    return res['data'].toString()
}

function write_pulser(msg)
{
    wsite = pulser_site+"/writecf/"+msg 
    var res = request(wsite);
    return res['data'].toString()
}

function read_pulser()
{
    rsite = pulser_site+"/read/" 
    var res = request(rsite);
    //get last element
    return res['data'].toString().split("\n").slice(-3,-2)[0];
}

function read_mux()
{
    rsite = mux_site+"/read/" 
    var res = request(rsite);
    //get last element
    return res['data'].toString().split("\n").slice(-3,-2)[0];
}

app.get("/",function(req,res){
          res.send("What you want is elsewhere!");    
})

app.get("/last_from_pulser/",function(req,res){res.send(read_pulser());})

app.get("/last_from_mux/",function(req,res){res.send(read_pulser());})
 
app.get('/write_to_pulser/*', function (req, res) {  console.log(req); res.send(write_pulser(req['originalUrl'].split("/").slice(-1)) ) });

app.get('/write_to_mux/*', function (req, res) {res.send(write_mux(req['params'][0])) });

app.listen(3000, function () {console.log('Example app listening on port 3000!');});



