
var graph;
$(document).ready(function(){
    $("#loadSpinner").hide();
});
  

    
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
var allVehicles = {};
vehicleSet.success(function (data) {
    var vehicles = data;
    vehicles = vehicles.data;
    
    var vehicleIDs = vehicles.map(function(vehicles) {
        return vehicles['id'];
    });
    

    $.each(vehicles,function(key, value) 
    {
        $('#vehicleSelect').append('<option value=' + value.id + '>' + value.id + ' - ' + value.name + '</option>');
        allVehicles[value.id] = value.name;
        
    });
    $('#vehicleSelect').selectpicker('refresh')
        
});
    

   
        
function updateGraphs(){
    $("#loadSpinner").show();
    
    
    var drp = $('#datePicker').data('daterangepicker');
    var from = drp.startDate.format('YYYY-MM-DD');
    var to = drp.endDate.format('YYYY-MM-DD');

    var vehicleIDs = $('.selectpicker').val();
    
    
    var url = 'https://www.track.kabzy.com/api/counters?vehicles='+vehicleIDs+'&from='+from+'&to='+to+'&distance=meter&time=hour&async=1&delta=7D';
    var url2 = 'https://www.track.kabzy.com/api/rawdata?vehicles='+vehicleIDs+'&fields=$basic,ac,count:1&from=' + from + 'T00:00:00&to=' + to + 'T23:59:59&codes=48,47,40,39&resample=event_time&group_by=vid,code&how=count:sum&freq=31D&async=1';
    
    var vehicleData = getURL(url);
    
    vehicleData.success(function (data) { 
        jobRequest(data.job_id); 
    });

    var vehicleInfo = {};
    function jobRequest(job_id){

        var job = getURL('https://www.track.kabzy.com/api/jobs/'+job_id);
        job.success(function (data) {
            //console.log(data.progress.step + '/' + data.progress.steps );
            var jobData = data;
            if(jobData.state == "done"){
                //console.log('job done!');
                var jobResult = getURL('https://www.track.kabzy.com/api/jobs/'+job_id+'/data.json');
                jobResult.success(function (data) {
                    //console.log(data);
                    $.each(data,function(key, value) {
                        //console.log('valued id= '+value.vid);
                        vehicleInfo[value.vid] = {dev_dist:value.dev_dist,dev_ospeed:value.dev_ospeed,dev_idle:value.dev_idle,dev_ign:value.dev_ign};
                        //console.log(vehicleInfo);
                    });

                    var v2 = getURL(url2);

                    v2.success(function (data) { 
                        jobRequest2(data.job_id); 
                    });
                });
            }
            else{
                jobRequest(job_id);
            }
        });
    }//end jobRequest

    function jobRequest2(job_id){
        var job = getURL('https://www.track.kabzy.com/api/jobs/'+job_id);
        job.success(function (data) {
            //console.log(data.progress.step + '/' + data.progress.steps );
            var jobData = data;
            if(jobData.state == "done"){
                //console.log('job done!');
                var jobResult = getURL('https://www.track.kabzy.com/api/jobs/'+job_id+'/data.json');
                jobResult.success(function (data) {
                    //console.log(data);
                    $.each(data,function(key, value) {
                        //console.log(value);                                    
                        if(value.code == 40){                                    
                                vehicleInfo[value.vid]["harshA"] = value.count;                                 
                        }    
                        else if(value.code == 39){                                                                       
                                vehicleInfo[value.vid]["harshB"] = value.count;                                    
                        }
                        else if(value.code == 47){
                                vehicleInfo[value.vid]["aggLane"] = value.count;
                        }
                        else if(value.code == 48){
                                vehicleInfo[value.vid]["harshC"] = value.count;
                        }
                    });
                    
                    scores(vehicleInfo);
                });
                
            }    
            else{
                jobRequest2(job_id);

            }
        });
    }//end jobRequest2
}

function scores(vehicleInfo){

    var labels = [];
    var values_safety = [];
    var values_eco = [];
    var dataset = [];
    //for each vehicle
    $.each(vehicleInfo,function(key, value) {
        var distRaw = value.dev_dist;
        var dist = Math.ceil(Math.floor(value.dev_dist)/1000);
        var dev_ign = value.dev_ign/60;
        var dev_idle = value.dev_idle/60;
        var speed = value.dev_ospeed/60;
        var speedingPer = Math.floor(speed / dev_ign * 100);
        var idlePer = Math.floor(dev_idle / dev_ign * 100);
        //console.log(value);
        var harshA;
        if(value.harshA != null)
            harshA = value.harshA;
        else
            harshA = 0;

       var harshB;
        if(value.harshB != null)
            harshB = value.harshB;
        else
            harshB = 0;

        var firstItem = ((harshA * 1 + harshB * 1) && distRaw * 1 !== 0) ? (harshA * 1 + harshB * 1) * 2000000 / distRaw : 0;
        var secondItem = (isNaN(speedingPer * 3)) ? 0 : speedingPer * 3;
        var resultItem = (isNaN((firstItem + secondItem) / 2)) ? 0 : ((firstItem + secondItem) / 2);
        
        var safety = (100 - resultItem < 40) ? 40 : 100 - resultItem;
        safety = Math.round(safety);
            
        var eco_item = (isNaN((firstItem + speedingPer * 1 + idlePer) / 2)) ? 0 : (firstItem + speedingPer * 1 + idlePer) / 2;
        var eco = (100 - eco_item < 40) ? 40 : 100 - eco_item;
        eco = Math.round(eco);

        /*
        console.log(key);
        console.log('speedingPer= ' + speedingPer);
        console.log('idlePer= ' + idlePer);
        console.log('harshA= ' + harshA);
        console.log('harshB= ' + harshB);
        console.log('distRaw= ' + distRaw);
        console.log('speedingPer= ' + speedingPer);
        */
        labels.push(allVehicles[key]);
        values_safety.push(safety);
        values_eco.push(eco);
        dataset.push({id: key, label: allVehicles[key], Safety:safety, Eco:eco});
       
    });




    d3_bar(dataset);
    
    $("#loadSpinner").hide();
}


    
        

        
       

$('.dropdown-menu li a').on('click', function () {
 d3_change($(this).attr('id'));
});

//d3.select(".chart-panel").append("svg").attr("class","chart");
var barColors = ["#ff8800","#02d914"];
var dataset = null;
        

      


    var margin;

    var y0;

    var y1;

    var x;

    var colorRange = d3.scale.category20();
    var color = d3.scale.ordinal()
            .range(colorRange.range());

    var xAxis;

    var yAxis;
    //.tickFormat(d3.format(".2s"));

    var divTooltip = d3.select(".chart-panel").append("div").attr("class", "toolTip");


    var svg;

    function d3_bar(data){
        d3.select(".chart").remove();

        margin = {top: 10, right: 50, bottom: 20, left: 200},
        width = parseInt(d3.select('.chart-panel').style('width'), 10) - margin.left - margin.right,
        h = 800;

        y0 = d3.scale.ordinal()
            .rangeRoundBands([h, 0], .2, .5);

        y1 = d3.scale.ordinal();

        x = d3.scale.linear()
            .range([0, width- margin.right - 40]);

        colorRange = d3.scale.category20();
        color = d3.scale.ordinal()
            .range(colorRange.range());

        xAxis = d3.svg.axis()
            .scale(x)
            .tickSize(-h)
            .orient("bottom");

        yAxis = d3.svg.axis()
            .scale(y0)
            .orient("left");
        
        svg = d3.select(".chart-panel").append("svg").attr("class","chart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        dataset = data;
        var options = d3.keys(dataset[0]).filter(function(key) { return key !== "label" && key !="id"; });

        dataset.forEach(function(d) {
            d.valores = options.map(function(name) { return {name: name, value: +d[name]}; });
        });

        y0.domain(dataset.map(function(d) { return d.label; }));
        y1.domain(options).rangeRoundBands([0, y0.rangeBand()]);
        x.domain([0, d3.max(dataset, function(d) { return d3.max(d.valores, function(d) { return d.value; }); })]);


        svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + (h) + ")")
                .call(xAxis);

        svg.append("g")
                .attr("class", "y axis")
                .call(yAxis);

        //svg.selectAll(".y.axis .tick text")
                //.call(verticalWrap, y0.rangeBand());

        var bar = svg.selectAll(".bar")
                .data(dataset)
                .enter().append("g")
                .attr("class", "rect")
                .attr("transform", function(d) { return "translate( 0,"+ y0(d.label) +")"; });

        var bar_enter = bar.selectAll("rect")
                .data(function(d) { return d.valores; })
                .enter()


        bar_enter.append("rect")
                .attr("height", y1.rangeBand())
                .attr("y", function(d) { return y1(d.name); })
                .attr("x", function(d) { return 0; })
                .attr("value", function(d){return d.name;})
                .attr("width", function(d) { return x(d.value); })
                .style("fill", function(d) { return d.name==="Safety"?barColors[0]:barColors[1]; });

        bar_enter.append("text")
                .attr("x", function(d) { return x(d.value) +5;  })
                .attr("y", function(d) { return y1(d.name) +(y1.rangeBand()/2); })
                .attr("dy", ".35em")
                .text(function(d) { return d.value; });

        bar
                .on("mousemove", function(d){
                    divTooltip.style("left", d3.event.layerX+20+"px");
                    divTooltip.style("top", d3.event.layerY+20+"px");
                    divTooltip.style("display", "inline-block");
                    var x = d3.event.pageX, y = d3.event.pageY
                    var elements = document.querySelectorAll(':hover');
                    l = elements.length
                    l = l-1
                    elementData = elements[l].__data__
                    divTooltip.html((d.label)+"<br>"+elementData.name+"<br>"+elementData.value+"%");                        
                });

        bar
                .on("mouseout", function(d){
                    divTooltip.style("display", "none");
                });

        bar
                .on("click", function(d){
                    var drp = $('#datePicker').data('daterangepicker');
                    var from = drp.startDate.format('YYYY-MM-DD');
                    var to = drp.endDate.format('YYYY-MM-DD');
                    //console.log(d.id + " - " + d.label);
                    //console.log(from + " " + to);
                    window.open("drivers.html?id="+d.id+'&from='+from+"&to="+to);
                });

        var legend = svg.selectAll(".legend")
                .data(options.slice())
                .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

        legend.append("rect")
                .attr("x", parseInt(d3.select('.chart-panel').style('width'), 10) - margin.left - margin.right)
                .attr("width", 30)
                .attr("height", 30)
                .style("fill", function(d,i) { return barColors[i%2]; });

        legend.append("text")
                .attr("x", parseInt(d3.select('.chart-panel').style('width'), 10) - margin.left - margin.right - 10)
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "end")
                .text(function(d) { return d; });

        /*        
        //Wrap y-axis labels
        function verticalWrap(text, width) {
            text.each(function() {
                var text = d3.select(this),
                        words = text.text().split(/\s+/).reverse(),
                        word,
                        line = [],
                        lineNumber = 0,
                        lineHeight = 1.1, // ems
                        y = text.attr("y"),
                        x = text.attr("x"),
                        dy = parseFloat(text.attr("dy")),
                        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
            });
        }*/
    } //end d3_bar()

    function d3_change(id) {
            if(dataset){
                
               var y_new;
                switch (id) {                   
                    case "name":
                        y_new = y0.domain(dataset.sort( function(a, b) { return d3.ascending(b.label, a.label); })
                            .map(function(d) { return d.label; }))
                            .copy();
                        break;
                    case "safety":
                        y_new = y0.domain(dataset.sort(function(a, b) { return a.Safety - b.Safety; })
                            .map(function(d) { return d.label; }))
                            .copy();
                        break;
                    case "eco":
                        y_new = y0.domain(dataset.sort(function(a, b) { return a.Eco - b.Eco; })
                            .map(function(d) { return d.label; }))
                            .copy();
                        break;
                }
                
                //Sort y labels    
                svg.selectAll(".bar")
                    .sort(function(a, b) { return y_new(a.label) - y_new(b.label); });

                //console.log(svg.selectAll(".bar"));
                   
                var transition = svg.transition().duration(750),
                    delay = function(d, i) { return i * 50; };

                 transition.selectAll(".rect")
                    .delay(delay)
                    .attr("transform", function(d) { return "translate( 0,"+ y_new(d.label) +")"; });

                transition.select(".y.axis")
                    .call(yAxis)
                  .selectAll("g")
                    .delay(delay);
            }

                
    } //end change
    