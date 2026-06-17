/**
 *  Fetch the API data! 
*/


/* AIR DATA */ 
const s = "06"; // station number

fetch(
  "https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=f4eca3bf-5ded-4d3c-a8dc-ed42486498f3&limit=100"
)
.then(r => r.json())
.then(data => {
  const pollutants = {};

  data.result.records
    .filter(record => record.stationId === s)
    .forEach(record => {
      pollutants[record.pollutant] = Number(record.valeur);
    });

  //console.log(pollutants); 
});


/* GROUND CONTAM DATA */
fetch(
  "https://www.servicesgeo.enviroweb.gouv.qc.ca/donnees/rest/services/Public/Themes_publics/MapServer/14/query" +
  "?where=1%3D1&outFields=*&f=json&resultRecordCount=10"
)
.then(r => r.json())
.then(data => {
  console.log(data.features);
});