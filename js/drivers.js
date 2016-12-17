
//Build the picker and start with last 30 days selected
$(function() {
    $('input[name="daterange"]').daterangepicker(
            {
                locale: {
                  format: 'DD-MM-YYYY'
                },
                "startDate": moment().subtract(7, 'days'),
                "endDate": moment(),
                ranges: {
                   'Today': [moment(), moment()],
                   'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                   'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                   'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                   'This Month': [moment().startOf('month'), moment().endOf('month')],
                   'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
                },
                "alwaysShowCalendars": true/*,
                "dateLimit": {
                    "days": 7
                }*/
            }
        );
});

//Callback for apply button
$('input[name="daterange"]').on('apply.daterangepicker', function(ev, picker) {
     //updateGraphs();
});
    


    
var vehicleSet = getURL('https://www.track.kabzy.com/api/vehicles');
var vehiclesArr = [];
vehicleSet.success(function (data) {
    var vehicles = data;
    vehicles = vehicles.data;

    $.each(vehicles,function(key, value) 
    {
        $('#vehicleSelect').append('<option value=' + value.id + '>' + value.id + ' - ' + value.name + '</option>');
        vehiclesArr.push(value.id);
    });

    //Get data passed via URL
    var id = getQueryVariable("id");
    var to = getQueryVariable("to");
    var from = getQueryVariable("from");
    //If data has been passed by URL populate the inputs and draw the graphs
    if(id && to && from){
        console.log(id);
        console.log(from);
        console.log(to);
        var drp = $('#datePicker').data('daterangepicker');
      
        drp.setStartDate(moment( from ));
        drp.setEndDate(moment( to ));
        document.getElementById('vehicleSelect').value =id+'';;
        updateGraphs();
        
    }   
});
    

    
//get variables passed via URL
function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(null);
}

    
$("#loadSpinner").hide();
var dist = 0;
var distRaw = 0;
var dev_ign = 0;
var dev_idle = 0;
var speeding = 0;
var harshA = 0;
var harshB = 0;
var harshC = 0;
var aggLane = 0;
var speedingPer = 0;
var idlePer = 0;

function updateGraphs(){
    
    $("#loadSpinner").show();
    var drp = $('#datePicker').data('daterangepicker');
    var from = drp.startDate.format('YYYY-MM-DD');
    var to = drp.endDate.format('YYYY-MM-DD');

    var vehicleId = document.getElementById("vehicleSelect").value;
    if (vehicleId != null){
        //console.log('id ' + vehicleId + ' from ' + from + ' to '+to );
        
        //Deprecated url
        //var url = 'https://www.track.kabzy.com/api/vehicle/'+vehicleId+'/counters/deltas?from='+from+'&to='+to;
        
        var url = 'https://www.track.kabzy.com/api/counters?vehicles='+vehicleId+'&from='+from+'&to='+to+'&distance=meter&time=hour&delta=7D';
        
        
        var vehicleData = getURL(url);
        vehicleData.success(function (data) {
            var response_data = data.counters;
            //console.log(data);
            if(data.counters.length > 0){
                distRaw = response_data[0].dev_dist;
                //console.log('Raw dist: '+distRaw);
                dist = Math.ceil(Math.floor(response_data[0].dev_dist)/1000);
                dev_ign = response_data[0].dev_ign/60;
                dev_idle = response_data[0].dev_idle/60;
                var speed = response_data[0].dev_ospeed/60;
                
                /*
                console.log('speed: '+speed);
                console.log('ign: '+dev_ign);
                console.log('idle: '+dev_idle);
                */
            }
            else{
            	distRaw=0;
            	dist=0;
            	dev_ign=0;
            	dev_idle=0;
            	speed = 0;
            }
            speedingPer = Math.floor(speed / dev_ign * 100);
            //console.log('speeding: ' + speedingPer + ' %' );
            if (isNaN(speedingPer)){
                speedingDonutChart.segments[0].value = 0;
                speedingDonutChart.segments[1].value = 100;
            }
            else{
                speedingDonutChart.segments[0].value = speedingPer;
                speedingDonutChart.segments[1].value = 100-speedingPer;
            }
            speedingDonutChart.update();  

            idlePer = Math.floor(dev_idle / dev_ign * 100);
            //console.log('Idle: ' + idlePer + ' %' );
            if (isNaN(idlePer)){
                idleDonutChart.segments[0].value = 0;
                idleDonutChart.segments[1].value = 100;
            }
            else{
                idleDonutChart.segments[0].value = idlePer;
                idleDonutChart.segments[1].value = 100-idlePer;
            }
            idleDonutChart.update();  
            
            //console.log('Distance travelled: ' + dist + ' km' );
            getVehicleCodeData(vehicleId, from, to);

            $('#distance').text(dist+ ' km');

        });
    }// end check for null vehicle id

}

function getVehicleCodeData(vehicleId, from, to){
    /*Batch request for count of the following codes:
        40: harsh acceleration
        39: harsh braking
        47: agg lane change (? - MF supplied code)
        48: harsh cornering (? - MF supplied code)
    */

    //old, individual, url
    //var url = 'https://www.track.kabzy.com/api/rawdata?vids='+ vehicleId +'&genevcodes=39&evfields=lat,lon,event_time,code,ac&from='+from +"T00:00:00"+ '&to='+to+"T23:59:59";

    var url = 'https://www.track.kabzy.com/api/rawdata?vehicles=' + vehicleId + '&fields=$basic,ac,count:1&from=' + from + 'T00:00:00&to=' + to + 'T23:59:59&codes=48,47,40,39&resample=event_time&group_by=vid,code&how=count:sum&freq=31D';

    //var url2 = 'https://www.track.kabzy.com/api/rawdata?async=1&fields=$basic,ac,count:1&from=' + from + 'T00:00:00&to=' + to + 'T23:59:59&codes=48,47,40,39&resample=event_time&group_by=vid,code&how=count:sum&freq=31D';
    
    

    
    var vehicleCodeData = getURL(url);
    vehicleCodeData.success(function (data) {
        
        harshA = 0;
        harshB = 0;
        harshC = 0;
        aggLane = 0;
        $.each(data.events,function(key, value) {
            
            if(value.code == 40){
                harshA += value.count;       
            }
            else if(value.code == 39){
                harshB += value.count;                        
            }
            //Remove harsh cornerning and lane changes - not in the current mobile app
            /*
            else if(value.code == 47){
                aggLane += value.count;                       
            }
            else if(value.code == 48){
                harshC += value.count;
            }*/
        }); 

        //console.log('HA: ' + harshA);
        if (isNaN(harshA*1) || harshA === 0){
            harshADonutChart.segments[0].value = 0.1;
        }
        else{
            harshADonutChart.segments[0].value = harshA;
        }
        harshADonutChart.update(); 
        
        //console.log('HB: ' + harshB);
        if (isNaN(harshB) || harshB === 0){
            harshBDonutChart.segments[0].value = 0.1;
        }
        else{
            harshBDonutChart.segments[0].value = harshB;
        }
        harshBDonutChart.update(); 
    
        //console.log('HC: ' + harshC);
        if (isNaN(harshC) || harshC === 0){
            harshCDonutChart.segments[0].value = 0.1;
        }
        else{
            harshCDonutChart.segments[0].value = harshC;
        }
        harshCDonutChart.update(); 

        //console.log('ALC: ' + aggLane);
        if (isNaN(aggLane) || aggLane === 0){
            aggLaneDonutChart.segments[0].value = 0.1;
        }
        else{
            aggLaneDonutChart.segments[0].value = aggLane;
        }
        aggLaneDonutChart.update(); 

        scores();
       
    });
}

function scores(){
    //AE implementations
    //var eco = 100 - (((((harshA+harshB+harshC+aggLane)*1000000)/distRaw) + speedingPer + idlePer) / 2);
    //eco = Math.round(eco);
    //var safety = 100 - ((((harshA+harshB+harshC+aggLane)*2000000)/distRaw) + (speedingPer * 3) / 2);
    //safety = Math.round(safety);

    
    var firstItem = ((harshA * 1 + harshB * 1) && distRaw * 1 !== 0) ? (harshA * 1 + harshB * 1) * 2000000 / distRaw : 0;
    var secondItem = (isNaN(speedingPer * 3)) ? 0 : speedingPer * 3;
    var resultItem = (isNaN((firstItem + secondItem) / 2)) ? 0 : ((firstItem + secondItem) / 2);
    //console.log(resultItem);
         //100 - ((HA+HB+HC+ALC)x2000)/DISTANCE) + SPx3
    var safety = (100 - resultItem < 40) ? 40 : 100 - resultItem;
    safety = Math.round(safety);
        // 100 - ((HA+HB+HC+ALC)x1000)/DISTANCE) + SP + IP
    var eco_item = (isNaN((firstItem + speedingPer * 1 + idlePer) / 2)) ? 0 : (firstItem + speedingPer * 1 + idlePer) / 2;
    var eco = (100 - eco_item < 40) ? 40 : 100 - eco_item;
    eco = Math.round(eco);
    /*
    console.log('speedingPer' + speedingPer);
    console.log('idlePer' + idlePer);
    console.log('harshA' + harshA);
    console.log('harshB' + harshB);
    console.log('distRaw' + distRaw);
    console.log('speedingPer' + speedingPer);
    */

    //console.log('Eco score: ' + eco);
    if (isNaN(eco)){
        ecoDonutChart.segments[0].value = 0;
        ecoDonutChart.segments[1].value = 100;
    }
    else{
        ecoDonutChart.segments[0].value = eco;
        ecoDonutChart.segments[1].value = 100-eco;
    }
    ecoDonutChart.update();   

    
    //console.log('Safety score: ' + safety);
    if (isNaN(safety)){
        safetyDonutChart.segments[0].value = 0;
        safetyDonutChart.segments[1].value = 100;
    }
    else{
        safetyDonutChart.segments[0].value = safety;
        safetyDonutChart.segments[1].value = 100-safety;
    }
    safetyDonutChart.update();
    $("#loadSpinner").hide();
    
 }

        



 