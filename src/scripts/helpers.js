import * as quest_marker from '../assets/icons/quest_marker.png'

export function getRandomFrom(where) {
  return where[Math.floor(Math.random() * where.length)]
}

export function highlightSector(voronoi, sector, locations, color1, color2) {
  voronoi.renderCell(locations[sector].cell.site.voronoiId, color1, color2)
}

export function highlightCell(voronoi, voronoiId, color1, color2) {
  voronoi.renderCell(voronoiId, color1, color2 ? color2 : color1)
}

export function addQuestMarker (locations, sector) {
  var x = []
  var y = []
  locations[sector].cell.halfedges.forEach(halfedge => {
      x.push(halfedge.edge.va.x)
      x.push(halfedge.edge.vb.x)
      y.push(halfedge.edge.va.y)    
      y.push(halfedge.edge.vb.y)    
  })

  let xAvg = x => x.reduce((a,b) => a + b, 0) / x.length
  let yAvg = y => y.reduce((a,b) => a + b, 0) / y.length

  var questMarkerAvg = new Image();
  questMarkerAvg.src = quest_marker

  questMarkerAvg.onload = () => {
    document.getElementById('voronoiCanvas').getContext('2d').drawImage(questMarkerAvg, xAvg(x)-15, yAvg(y)-15, 30, 30);
  }
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

export function generateGrid (rows, cols, width, height, offset, applyRand) {
  let coordinates = []
  let rand = 0

  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      if (!coordinates[x]) {
        coordinates[x] = []
      }

      if (applyRand) {
        rand = Math.floor(Math.random() * 6) - 3
      }

      coordinates[x][y] = {}      
      coordinates[x][y].x = (width / rows) * x + offset + rand
      coordinates[x][y].y = (height / rows) * y + offset + rand
      coordinates[x][y].voronoiId = (x*rows) + y
    }
  }

  return coordinates
}

/* eslint-disable */
export function generateHexGrid (rows, cols, width, height, applyRand) {
  let coordinates = []

  let size = width / cols

  let w = Math.sqrt(3) * size
  let h = 2 * size
  let rand = 0

  for (let x = 0; x < rows; x++) {
    for (let y = 0; y < cols; y++) {
      if (!coordinates[x]) {
        coordinates[x] = []
      }

      if ((width / rows) + (w * x) > width || (height / rows) + (h * y) > height) {
        break
      }

      if (applyRand) {
        rand = Math.floor(Math.random() * 10) - 5
      }

      coordinates[x][y] = {}      
      coordinates[x][y].x = (width / rows) + (w * x) + rand
      coordinates[x][y].y = (height / rows) + (h * y) + rand
      coordinates[x][y].voronoiId = (x*rows) + y

      if (y % 2 == 0) {
        coordinates[x][y].x += w/2
      }
    }
  }

  return coordinates
}


// Usage:
// var ary = ['three', 'seven', 'eleven'];

// ary.remove('seven');


// implementar como mixin y reemplazar el getrandomfrom
// export default {
//     install: function (Vue) {
//         Vue.mixin({
//             mounted() {
//                 Array.prototype.getRandom = function() {
//                     return this[Math.floor(Math.random() * (this.length))]
//                 };
//             }
//         })
//     }
// }
