//Make Header (just edit to change structure of table, nothing else needs to be changed in this file)
var allhead = "Name(unique to the cell),TransmissionMode(TR/PE),Channel1(PE Channel),Channel2(TR Channel),BaseGain(dB),Delay(us),Range(us),Freq(MHz),Notes,CyclerCode,FilterStandard,LastWaveform,Run?(Y/N)"


//Collect Elements to Play with Later
var $TABLE = $('#table');
var $BTN = $('#export-btn');
var $EXPORT = $('#export');
//Add code here to make table

//Just the headers
fields = allhead.split(",")
for (f in fields) fields[f] = fields[f].replace(/\s+/g, "").replace(/\(.*?\)/g,"")
fields.push("")
fields.push("")
fields.push("")

//Unique Row ID Header
var URIDH = fields.slice(0,8)

//Now just the tooltips
tips =  allhead.split(",")
for (t in tips)
{
    try {tips[t] = tips[t].match(/\(.*?\)/g)[0]}
    catch(e) {tips[t] = ""}
}
tips.push("(Single Shot)")
tips.push("(Delete Row)")
tips.push("(Move Row)")

header = ""
for (f in fields) header += "<th title='"+tips[f]+"'>" + fields[f] + "</th>"
$("#header").html(header)


//Make Clone Basis
//This is a hack but so far it doesn't break.  The idea is that we create an empty hidden row that's read to go when we hit "add".  This has been modified to scale appropriately to the size of the header and autofill the table on load
//glyph's, icons from jquery-ui -> may want to change at some point

upbut = '<span class="table-up glyphicon glyphicon-arrow-up">'
updownbut = '<span class="table-up glyphicon glyphicon-arrow-up"></span> <span class="table-down glyphicon glyphicon-arrow-down"></span>'
removebut = "<span class='table-remove glyphicon glyphicon-remove'></span>"
playbut = "<span class='single-shot glyphicon glyphicon-play'></span>"


//make the clone structure the size of the fields
clone_arr = []
for (var i = 0; i < fields.length; i++) clone_arr.push("")
clone_arr[clone_arr.length - 3] = playbut //add play button
clone_arr[clone_arr.length - 2] = removebut //add remove button
clone_arr[clone_arr.length - 1] = updownbut // add updown button
    //Turn the array into HTML
cloner = ""
for (c in clone_arr) {
    var ce = "false"
    if (clone_arr[c] == "") ce = "true"
    cloner += "<td kind='"+fields[c]+"' contenteditable='" + ce + "' title='"+tips[c]+"'>" + clone_arr[c] + "</td>"
}
$("#cloner").html(cloner)

//Load the data
loadsettings()

//Ye Olde code (from https://codepen.io/anon/pen/PzEgLN)
$('.table-add').click(function () {
    var $clone = $TABLE.find('tr.hide').clone(true).removeClass('hide table-line');
    $TABLE.find('table').append($clone);
});

$('.table-remove').click(function () {
    console.log(this)
    $(this).parents('tr').detach();
});

$('.table-up').click(function () {
    var $row = $(this).parents('tr');
    if ($row.index() === 1) return; // Don't go above the header
    $row.prev().before($row.get(0));
});

$('.table-down').click(function () {
    var $row = $(this).parents('tr');
    $row.next().after($row.get(0));
});

$('.single-shot').click(function () {getsingleshot(this)});

// A few jQuery helpers for exporting only
jQuery.fn.pop = [].pop;
jQuery.fn.shift = [].shift;
//export button
$BTN.click(function () {
    var $rows = $TABLE.find('tr:not(:hidden)');
    var headers = [];
    var data = [];
    // Get the headers (add special header logic here)
    $($rows.shift()).find('th:not(:empty)').each(function () {
        headers.push($(this).text());
    });
    // Turn all existing rows into a loopable array
    $rows.each(function () {
        var $td = $(this).find('td');
        var h = {};
        // Use the headers from earlier to name our hash keys
        headers.forEach(function (header, i) {
            h[header] = $td.eq(i).text();
        });
        h['run'] = $(this)[0].getAttribute('run')
        data.push(h);
        console.log($td)
    });

    console.log(data)
    sendsettings(data) //DS Addition
});
//ye new code to make it rain

//Basic data read library
function loadsettings() {
    $.get("/table_load", function (data) {
        out = data // JSON.parse(data)
            //Attempt to fill ports based on JSON data
        ports = $('input[id$="_port"]')
        for (p = 0; p < ports.length; p++) {
            $('#' + ports[p].id).val(out[ports[p].id])
        }
        data = out['data']
        for (d in data) {
            makerow(data[d])
        }
    })
}

//define row
function makerow(p) {
    console.log(p)
    //get the structure of the row
    var $clone = $TABLE.find('tr.hide').clone(true).removeClass('hide table-line');
    //fill in the row with values
    for (var i = 0; i < fields.length - 3; i++) $clone[0].cells[i].innerHTML = p[fields[i]]
        //append the row to the table
    $clone[0].setAttribute('run', p['run'])
    $TABLE.find('table').append($clone);
}

//function to add data from rows to ports, make a JSON object, send off
function sendsettings(setobj) {
    out = {} //define the output JSON
        //Gets all ids matching "port" and fills JSON accordling
    ports = $('input[id$="_port"]')
    for (p = 0; p < ports.length; p++) {
        out[ports[p].id] = $('#' + ports[p].id).val()
    }
    out['data'] = setobj
        // Output the result
        //json_str = JSON.stringify(out)
    $.post("/table_save", out, function (data) {
        console.log(data)
        $("#updates").text("table save status: "+data['success'])
    })
}

function getlastwave() {
    $.get(URLHERE, function (data) {
        //int
    })
}


function makeid(ll){
   parent = ll.target.parentElement
   alltds = parent.children
   run = ""
   URIDH.forEach(function(U,i){
       part = alltds[i].innerText.replace(/\n/g,"").trim()
       if (part == "") part = "0"
       run+=part+"_"
   }
                )
   run = run.slice(0,-1)
   $("#updates").text("setting run ID to "+run)
   oof = run
   parent.setAttribute("run",run)
}

//Make Sure ID is consistent with settings
$TABLE.keyup(function(data){makeid(data)})

old_html = ""
setInterval(
function()
    {
        if (old_html == $("#updates").text() & old_html != "" ){
            $("#updates").fadeOut(500, function(){$("#updates").text("")})
            $("#updates").fadeIn(1)

        }
        old_html = $("#updates").text()
    }
,1000)


function getsingleshot(tis)
{
    var $rows = $TABLE.find('tr:not(:hidden)');
    $rows.css('background','none') //clear background
    var $row = $(tis).parents('tr');
    var $td = $row.find('td');


    $row[0].style["background"] = 'pink'

    var h = {};
    headers = []
    $($rows.shift()).find('th:not(:empty)').each(function () {
        headers.push($(this).text());
    });

    // Use the headers from earlier to name our hash keys
    headers.forEach(function (header, i) {
        console.log(header)
        h[header] = $td.eq(i).text();
    });

    h['run'] =  $row[0].getAttribute('run')
    $("#status").html("Waiting for single shot to finish for run "+h['run'])

    console.log(h)
    $.post("/singleshot/",h,
        function(data,$row){
        ins = "<div style='text-align:right; vertical-align:middle;'><span class='inlinespark'></span></div>"
        //$("#status").html(ins)
        $("tr[run='"+h['run']+"'] td[kind='LastWaveform']").html(ins)
        $("tr[run='"+h['run']+"'] td[kind='LastWaveform']").sparkline(data['amp'], {
            type: 'line'
            , width: '100'
            , height: '50'
            , fillColor: false
            , lineColor: "black"
            , lineWidth: 1.5
            , spotRadius: 2
            , chartRangeMin: 0
            , chartRangeMax: 255
        });
        $('[run="'+h['run']+'"]')[0].style["background"] = 'lightgreen'

    })
}
