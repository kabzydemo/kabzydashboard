$(document).ready(function() {
    var t = $('#dataTables-example').DataTable({
            responsive: true
    });
    
    var vehicleSet = getURL('https://www.track.kabzy.com/api/vehicles');
    var vehicleIDs;
    vehicleSet.success(function (data) {
        var vehicles = data;
        vehicles = vehicles.data;
        //console.log(vehicles);
        vehicleIDs = vehicles.map(function(vehicles) {
            return vehicles['id'];

        });

        //This call request has changed in the current branch - Juan to inform if this becomes unavailable
        var url = 'https://www.track.kabzy.com/api/vehicles?select=name,info,device:loc&ids='+vehicleIDs;
        var fleetInfo = getURL(url);
        fleetInfo.success(function (data) {
            //console.log(data);

            $.each(data.data,function(key, value) 
            {
                t.row.add( [
                    value.name,
                    value.info.make,
                    value.info.model,
                    value.info.year,
                    value.device.loc_lat + ', ' + value.device.loc_lon,
                    value.device.loc_mph
                ] ).draw( false );
            });
        });

        
    });
});