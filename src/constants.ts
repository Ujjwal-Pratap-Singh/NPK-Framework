export interface CropNPK {
  name: string;
  n: number;
  p: number;
  k: number;
  description: string;
}

export const INDIAN_CROPS: CropNPK[] = [
  {
    name: "Rice (Paddy)",
    n: 120,
    p: 60,
    k: 40,
    description: "Requires high nitrogen for vegetative growth and moderate phosphorus for root development."
  },
  {
    name: "Wheat",
    n: 120,
    p: 60,
    k: 40,
    description: "Balanced NPK requirement; critical for grain filling and tillering."
  },
  {
    name: "Maize (Corn)",
    n: 150,
    p: 75,
    k: 50,
    description: "High nutrient feeder; requires significant nitrogen for stalk and ear development."
  },
  {
    name: "Cotton",
    n: 100,
    p: 50,
    k: 50,
    description: "Requires balanced NPK for fiber quality and boll development."
  },
  {
    name: "Sugarcane",
    n: 250,
    p: 100,
    k: 125,
    description: "Heavy feeder; requires massive nitrogen and potassium for sugar accumulation."
  }
];
