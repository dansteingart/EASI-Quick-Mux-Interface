##The Easiest


### Overview:
A basic interface for the pulser receiver/mux comabination.  Table based format.



### Install/Start
- Download it.
- `node index.js source=HAMACHI_NAME mux_site=MUXPORT pulser_site=PULSERPORT`  
  - if using the cytec add `mux_type=cytec`
  - if no mux say `mux_site=none`
- go to http://localhost:3000/static (or whatever your IP is for external viewing/control)
- chill.

### Remainders
- Remove Hard Coding
 - DB Done
- Interface
 - Move Port Settings from Interface to Command line per https://feasible-io.slack.com/archives/code/p1470346545001642
- Server:
 - Socket.IO - Done
 - async on get_waveform - Done
 - round robin on lines when start / not in single shot - Done

- DB
 - Decimal in `_id`? 

- Interface:
 - Send settings when queue starts - Done
 - Time in sparkline
