const entry = (node, type, category, w, d, materialId, seats = 0) => {
  const name = node
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/(\d+)$/, " $1")
    .replaceAll("-", " ")
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
  return { id: node, node, name, type, category, w, d, materialId, seats };
};

export const FURNITURE_CATALOG = [
  entry("Three-seaterSofa01", "sofa", "Living", 1, 2, "linen", 5),
  entry("Three-seaterSofa02", "sofa", "Living", 1, 2, "linen", 3),
  entry("Three-seaterSofa03", "sofa", "Living", 1, 2, "linen", 3),
  entry("two-seaterSofa01", "sofa", "Living", 1, 2, "linen", 2),
  entry("four-seaterSofa01", "sofa", "Living", 1, 2, "linen", 4),
  entry("four-seaterSofa02", "sofa", "Living", 1, 2, "linen", 4),
  entry("four-seaterSofa03", "sofa", "Living", 1, 2, "linen", 4),
  entry("single-seaterSofa01", "sofa", "Living", 1, 1, "linen", 1),
  entry("single-seaterSofa02", "sofa", "Living", 1, 1, "linen", 1),
  entry("single-seaterSofa03", "sofa", "Living", 1, 1, "linen", 1),
  entry("single-seaterSofa04", "sofa", "Living", 1, 1, "linen", 1),
  entry("SofaChair01", "sofa", "Living", 1, 1, "oak", 1),
  entry("doubleBed01", "bed", "Bedroom", 3, 2, "oak"),
  entry("doubleBed02", "bed", "Bedroom", 2, 2, "oak"),
  entry("doubleBed03", "bed", "Bedroom", 3, 2, "oak"),
  entry("singleBed01", "bed", "Bedroom", 2, 3, "oak"),
  entry("singleBed02", "bed", "Bedroom", 2, 3, "oak"),
  entry("SmallCabinet01", "cabinet", "Storage", 1, 1, "walnut"),
  entry("SmallCabinet02", "cabinet", "Storage", 1, 1, "oak"),
  entry("singleCloset01", "wardrobe", "Storage", 1, 1, "oak"),
  entry("doubleCloset01", "wardrobe", "Storage", 1, 2, "walnut"),
  entry("TVStand01", "tvstand", "Living", 1, 1, "walnut"),
  entry("TVStand02", "tvstand", "Living", 1, 1, "oak"),
  entry("TVStand03", "tvstand", "Living", 1, 1, "walnut"),
  entry("wallMountedFireplace01", "fireplace", "Living", 1, 1, "concrete"),
  entry("wallMountedFireplace02", "fireplace", "Living", 1, 1, "concrete"),
  entry("lamp01", "lamp", "Lighting", 1, 1, "steel"),
  entry("lamp02", "lamp", "Lighting", 1, 1, "steel"),
  entry("sink01", "sink", "Bathroom", 1, 2, "tile"),
  entry("sink02", "sink", "Bathroom", 1, 2, "tile"),
  entry("sink03", "sink", "Bathroom", 1, 2, "tile"),
  entry("ToiletChair01", "toilet", "Bathroom", 1, 1, "tile"),
];

export const FURNITURE_MATERIALS = [
  { id: "oak", hex: "#c9a36b" },
  { id: "concrete", hex: "#b8b8b4" },
  { id: "tile", hex: "#f1f1ee" },
  { id: "walnut", hex: "#6b4a34" },
  { id: "linen", hex: "#d9cfbd" },
  { id: "steel", hex: "#2b2f36" },
];
