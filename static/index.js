//Make Header (just edit to change structure of table, nothing else needs to be changed in this file)
var fields ="Name,TransmissionMode,Channel1,Channel2,BaseGain,Delay,Range,Freq, Notes,CyclerCode,FilterStandard,Run"
//Collect Elements to Play with Later
var $TABLE = $('#table');
var $BTN = $('#export-btn');
var $EXPORT = $('#export');

//Add code here to make table
fields = fields.split(",")
for (f in fields) fields[f] = fields[f].replace(/\s+/g,"")
fields.push("")
fields.push("")
fields.push("")
header = ""
for (f in fields) header += "<th>"+fields[f]+"</th>"

$("#header").html(header)


//Make Clone Basis
//This is a hack but so far it doesn't break.  The idea is that we create an empty hidden row that's read to go when we hit "add".  This has been modified to scale appropriately to the size of the header and autofill the table on load

//glyph's, icons from jquery-ui -> may want to change at some point
upbut =  '<span class="table-up glyphicon glyphicon-arrow-up">'
updownbut = '<span class="table-up glyphicon glyphicon-arrow-up"></span> <span class="table-down glyphicon glyphicon-arrow-down"></span>'
removebut =   "<span class='table-remove glyphicon glyphicon-remove'></span>"
playbut = "<span class='test-start glyphicon glyphicon-play'></span>"
playstopbut = "<span class='test-start glyphicon glyphicon-play'></span><span class = 'test-stop glyphicon glyphicon-stop'></span>"

//make the clone structure the size of the fields
clone_arr = []
for (var i=0; i < fields.length; i++ ) clone_arr.push("")
clone_arr[clone_arr.length-3] = playstopbut //add play button
clone_arr[clone_arr.length-2] = removebut //add remove button
clone_arr[clone_arr.length-1] = updownbut // add updown button

//Turn the array into HTML
cloner = ""
for (c in clone_arr)
{
    var ce = "false"
    if (clone_arr[c] == "") ce = "true"
    cloner += "<td contenteditable='"+ce+"'>"+clone_arr[c]+"</td>"
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

/*
$('.test-start').click(function () {
  var d = new Date().toString(); //return current y,m,d
  var $row = $(this).parents('tr');
    $tds = $row.find("td:nth-child(1)"); //find startdate
    $tid = $row.find("td:nth-child(2)"); //find testid

    $.each($tds, function() {
        $(this).html(d.slice(4,24));
    });

    current_tid = last_tid + 1;

    $.each($tid, function() {
        $(this).html((current_tid).toString());
    });

    last_tid = current_tid;

    $row[0].setAttribute('run','y')
    console.log($row.attr('run'));

  // alert(d);
  // console.log($row.index());
});

$('.test-stop').click(function () {
  var d = new Date().toString(); //return current y,m,d
  var $row = $(this).parents('tr');
  $row[0].setAttribute('run','n');
  console.log($row.attr('run'));
  // console.log($row.index());
});
*/

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
    h["run(y/n)"] = $(this).attr('run')
    data.push(h);
    console.log($td)
  });


sendsettings(data) //DS Addition
});

//ye new code to make it rain

//Basic data read library
function loadsettings()
{
$.get("/table_load",
    function(data)
    {
        out = data// JSON.parse(data)
        //Attempt to fill ports based on JSON data
        ports = $('input[id$="_port"]')
        for (p = 0; p < ports.length; p++)
        {
            $('#'+ports[p].id).val(out[ports[p].id])
        }

        data = out['data']
        for (d in data)
        {
            makerow(data[d])
        }
    })
}


function makerow(p) {

    //get the structure of the row

    var $clone = $TABLE.find('tr.hide').clone(true).removeClass('hide table-line');

    //fill in the row with values
    for (var i = 0; i < fields.length - 4; i++) $clone[0].cells[i].innerHTML = p[fields[i]]

        //append the row to the table

    $clone[0].setAttribute('rowid',p['testid'])
    $clone[0].setAttribute('run',p['run(y/n)'])

    $TABLE.find('table').append($clone);

}


//function to add data from rows to ports, make a JSON object, send off
function sendsettings(setobj)
{
  out = {} //define the output JSON

  //Gets all ids matching "port" and fills JSON accordling
  ports = $('input[id$="_port"]')
  for (p = 0; p < ports.length; p++){
    out[ports[p].id] = $('#'+ports[p].id).val()
  }
  out['data'] = setobj
  // Output the result

  //json_str = JSON.stringify(out)

  $.post("/table_save",out,
        function(data)
        {
         console.log(data)
         $EXPORT.text(data['status'])
         $EXPORT.fadeTo(200, 1).fadeTo(800, 0);
        })

}


function getlastwave()
{
    $.get(URLHERE,
    function(data)
    {
        //int
    })
}
