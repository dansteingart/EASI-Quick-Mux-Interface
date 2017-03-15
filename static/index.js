//Make Header (just edit to change structure of table, nothing else needs to be changed in this file)
var allhead = "Name(unique to the cell),TransmissionMode<PE|TR>,Channel1(PE Channel),Channel2(TR Channel),BaseGain(dB),Delay(us),Range(us),Freq(MHz),Energy(V),FilterStandard,ResponsibleParty(Initials),Notes,CyclerCode,LastWaveform,Run?<N|Y>"

//Need to make arguments, get rid of ports on interface (bad news waiting to happen)

//Collect Elements to Play with Later
var $TABLE = $('#table');
var $BTN = $('#export-btn');
var $EXPORT = $('#export');
//Add code here to make table

//Just the headers
fields = allhead.split(",")
for (f in fields) fields[f] = fields[f].replace(/\s+/g, "").replace(/\(.*?\)/g, "").replace(/\<.*?\>/g, "")
fields.push("")
fields.push("")
fields.push("")

//Unique Row ID Header
var URIDH = fields.slice(0, 9)

//Now just the tooltips
tips = allhead.split(",")
for (t in tips) {
    try {
        tips[t] = tips[t].match(/\(.*?\)/g)[0]
    } catch (e) {
        tips[t] = ""
    }
}
tips.push("(Single Shot)")
tips.push("(Delete Row)")
tips.push("(Move Row)")

//Now just the optionsbox
options = allhead.split(",")
for (o in options) {
    try {
        options[o] = options[o].match(/\<.*?\>/g)[0].replace("<", "").replace(">", "") ///UGH
    } catch (e) {
        options[o] = ""
    }
}
options.push("")
options.push("")
options.push("")

header = ""
for (f in fields) header += "<th title='" + tips[f] + "'>" + fields[f] + "</th>"
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
    filling = clone_arr[c]

    if (options[c].split("|").length > 1) {
        ce = "false"
        opts = options[c].split("|")
        filling = "<select>"
        for (o in opts) {
            selected = ""
            filling += "<option " + selected + " value='" + opts[o] + "'>" + opts[o] + "</option>"
        }
            filling += "</select>"

    }
    cloner += "<td kind='" + fields[c] + "' contenteditable='" + ce + "' title='" + tips[c] + "'>" + filling + "</td>"
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

$('.single-shot').click(function () {
    getsingleshot(this)
});

// A few jQuery helpers for exporting only
jQuery.fn.pop = [].pop;
jQuery.fn.shift = [].shift;
//export button
$BTN.click(function () {
    data = scrape_table()
    sendsettings(data) //DS Addition

});
//ye new code to make it rain

//send table to server
function scrape_table() {
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
            try {
                $select = $td.eq(i).find('select')
                h[header] = $select.val()
            } catch (e) {
                h[header] = $td.eq(i).text();
            }
            if (h[header] == undefined) h[header] = $td.eq(i).text();
        });
        h['run'] = $(this)[0].getAttribute('run')
        data.push(h);
    });

    return data

}

function compare_tables() {
    this_table = scrape_table()
        //for (row in this_table)setbackground(this_table[row]['run'],"none")

    for (row in this_table) {

        a = this_table[row]
        b = table_on_server[row]
        for (k in b) {
            if (a[k] != b[k]) setbackground(a['run'], 'yellow')
        }

    }
    for (j = table_on_server.length; j < this_table.length; j++) {
        console.log("extra row")
    }

    for (j = this_table.length; j < table_on_server.length; j++) {
        console.log("missing rows")
    }


}

table_on_server = undefined

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
        table_on_server = data
    })
}

function updateline(str) {
    $("#updates").html(str)
}

//define row
function makerow(p) {
    //get the structure of the row
    var $clone = $TABLE.find('tr.hide').clone(true).removeClass('hide table-line');
    //fill in the row with values
    for (var i = 0; i < fields.length - 3; i++) {
        filling = p[fields[i]]
        if (options[i].split("|").length > 1) {
            setting = filling
            opts = options[i].split("|")
            filling = "<select>"
            for (o in opts) {
                selected = ""
                if (setting == opts[o]) selected = "selected"
                filling += "<option " + selected + " value='" + opts[o] + "'>" + opts[o] + "</option>"
            }
            filling += "</select>"
        }
        $clone[0].cells[i].innerHTML = filling
    }
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
        $("#updates").text("table save status: " + data['success']);
        table_on_server = scrape_table();
    })
}

//Table Formatting Options
function clearbackgrounds() {
    $TABLE.find('tr:not(:hidden)').css('background', 'none')
}

function setbackground(rowid, color) {
    $('tr[run="' + rowid + '"]').css('background', color)
}

//Get Headers
function getheaders() {
    $rows = $TABLE.find('tr:not(:hidden)')
    headers = []
    $($rows.shift()).find('th:not(:empty)').each(function () {
        headers.push($(this).text());
    });
    return headers
}

function getrowdata(rowid) {
    out = {}
    headers = getheaders()
    tds = $('tr[run="' + rowid + '"]').find("td")
    //for (h in headers) out[headers[h]] = tds.eq(h).text()
    for (h in headers)
    {
        try {
            $select = tds.eq(h).find('select')
            out[headers[h]] = $select.val()
            if (out[headers[h]] == undefined) out[headers[h]] = tds.eq(h).text()

        }
        catch(e){
            out[headers[h]] = tds.eq(h).text()
        }

    }

    out['run'] = rowid

    return out
}

//Not used yet, might remove for socket stuff
function getlastwave() {
    $.get(URLHERE, function (data) {
        //int
    })
}

//function to make row id
get = undefined

function makeid(ll) {
    get = ll
    parent = ll.target.parentElement
    alltds = parent.children
    run = ""
    URIDH.forEach(function (U, i) {
        part = alltds[i].innerText.replace(/\n/g, "").trim()
        if (part == "") {
            try {
                part = alltds[i].children[0].value
            } catch (e) {
                part = "0"
            }
        }
        run += part + "_"
    })
    run = run.slice(0, -1)
    $("#updates").text("setting run ID to " + run)
    oof = run
    parent.setAttribute("run", run)
}

function statusline(str) {
    $("#status").html(str)
}

//Make Sure ID is consistent with settings
$TABLE.keyup(function (data) {
    if ((data.keyCode < 37) || (data.keyCode > 40)) makeid(data)
})

kickout = undefined
function getpos(foo,dir)
{
        kickout = foo
        col = foo.parent().children().index(foo)
        rows = foo.parent().parent()//.childen()//.index(foo.parent())
        test = rows.children()
        row = test.index(foo.parent())+1
        col = col+1
        r = row
        c = col
        //console.log()
        if (dir == 'up') row = row-1
        else if (dir == 'down') row = row+1
        else if (dir == 'left')
        {
            try{if (foo.caret() == 0) col = col-1}
            catch(e){col=col-1}
        }
        else if (dir == 'right')
        {
            try{if (foo.caret() == foo.text().length) col = col+1}
            catch(e){col=col+1}
        }
        newfoo = $("#table tr:nth-of-type("+row+") td:nth-of-type("+col+")")
        newfoo.focus()
        if ((dir == "left") && (c!=col)) newfoo.caret(newfoo.text().length)
        return [col,row]
}

$('td').keydown(function (data) {

    if      (data.keyCode == 37) getpos($(this),'left')
    else if (data.keyCode == 38) getpos($(this),'up')  //up
    else if (data.keyCode == 39) getpos($(this),'right')
    else if (data.keyCode == 40) getpos($(this),'down') //down

})

old_html = ""


//Single Shot Handling Code
function getsingleshot(tis) {
    if (qs['queuer_on'] == true) {
        updateline("stop queue before single shots")
    } else {
        clearbackgrounds()
        rowid = $(tis).parents('tr')[0].getAttribute('run')
        h = getrowdata(rowid)
        h['singleshot'] = true
        h['Run?'] = "Y"
        $.post("/singleshot/", h)
    }
}

//Web Socket Handling code
var socket = io();
socket.on('news', function (data) {
    console.log(data);
});
socket.on('update', function (data) {
    console.log(data);
});
socket.on('singleshot',
    function (data) {
        h = data
        ins = "<div style='text-align:right; vertical-align:middle;'><span class='inlinespark'></span></div>"
            //$("#status").html(ins)
        $("tr[run='" + h['run'] + "'] td[kind='LastWaveform']").html(ins)
        $("tr[run='" + h['run'] + "'] td[kind='LastWaveform']").sparkline(data['amp'], {
            type: 'line',
            width: '100',
            height: '50',
            fillColor: false,
            lineColor: "black",
            lineWidth: 1.5,
            spotRadius: 2,
            chartRangeMin: 0,
            chartRangeMax: 255
        });
    })

var qs = undefined
socket.on('queuestatus',
    function (data) {
        clearbackgrounds()
        qs = data
        action = "skipping"
        for (k in table_on_server) {
            if (table_on_server[k]['Run?'].search("Y") == 0 && table_on_server[k]['run'] == qs['current_run']) action = "running"
        }

        if (data['current_run'] != undefined) statusline("Status: Currently " + action + " " + data['current_run'])
        else statusline("Status: Currently not doing anything")
        if (data['status'] != undefined) statusline("Status: " + data['status'])

        setbackground(data['current_run'], 'pink')

        if (data['queuer_on']) $("#queue-btn").text("Queue Running")
        else $("#queue-btn").text("Queue Off")
    })


$("#queue-btn").click(function () {

    if (qs['queuer_on'] == false) {
        d = scrape_table()
        $.when(sendsettings(d)).done($.post("/queue_state/", {
            'querer_on': true
        }))
    } else {
        $("#queue-btn").html("Queue Stopping")
        $.post("/queue_state/", {
            'querer_on': false
        })
    }

})
