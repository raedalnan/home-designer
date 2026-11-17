export const OPENING_CATALOG = [
  ...[
    ['door-flush','Flush door',.9], ['door-shaker','Shaker door',1], ['door-french','Glazed French doors',1.8], ['door-glazed','Glazed studio door',1], ['door-sliding-grid','Gridded sliding door',1.8], ['door-panelled','Classic panel door',1],
  ].map(([id,name,width]) => ({id,name,width,type:'door',height:2.1,sillHeight:0,color:'#b58b62'})),
  ...[
    ['window-picture','Picture window',1.6,1.3,.7], ['window-grid','Gridded window',1.5,1.3,.7], ['window-transom','Transom window',1.8,.5,1.7], ['window-square','Square window',1,1,.9], ['window-triptych','Three-panel window',2.4,1.3,.7], ['window-cottage','Cottage window',1.2,1.4,.6],
  ].map(([id,name,width,height,sillHeight]) => ({id,name,width,height,sillHeight,type:'window',color:'#eee8df'})),
  { id: "door-single", type: "door", name: "Single door", width: 1, height: 2.1, sillHeight: 0, color: "#b58b62" },
  { id: "door-double", type: "door", name: "Double door", width: 1.8, height: 2.1, sillHeight: 0, color: "#9a7657" },
  { id: "door-sliding", type: "door", name: "Sliding door", width: 1.8, height: 2.1, sillHeight: 0, color: "#c9b299" },
  { id: "door-dark", type: "door", name: "Studio door", width: 1, height: 2.1, sillHeight: 0, color: "#475569" },
  { id: "window-standard", type: "window", name: "Standard window", width: 1.2, height: 1.2, sillHeight: 0.8, color: "#d8e7ed" },
  { id: "window-wide", type: "window", name: "Wide window", width: 2, height: 1.2, sillHeight: 0.8, color: "#d8e7ed" },
  { id: "window-tall", type: "window", name: "Tall window", width: 1, height: 1.8, sillHeight: 0.25, color: "#c9e1e8" },
  { id: "window-double", type: "window", name: "Double window", width: 1.8, height: 1.3, sillHeight: 0.7, color: "#c9e1e8" },
];
