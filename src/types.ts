export type CropCategory = 'Crops' | 'Vegetables' | 'Fruits' | 'Trees';

export interface CropNPK {
  name: string;
  n: number;
  p: number;
  k: number;
  description: string;
  category: CropCategory;
}

export interface ThingSpeakFeed {
  created_at: string;
  entry_id: number;
  field1: string | null; // Nitrogen
  field2: string | null; // Phosphorus
  field3: string | null; // Potassium
  field4: string | null; // Temperature
  field5: string | null; // Humidity
}

export interface ThingSpeakChannel {
  id: number;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  field1: string;
  field2: string;
  field3: string;
  created_at: string;
  updated_at: string;
  last_entry_id: number;
}

export interface ThingSpeakResponse {
  channel: ThingSpeakChannel;
  feeds: ThingSpeakFeed[];
}

export interface DashboardData {
  timestamp: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph?: number;
  temperature?: number;
  humidity?: number;
  location?: {
    lat: number;
    lon: number;
    city?: string;
  };
}

export interface RecommendationRequest {
  cropType: string;
  n: number;
  p: number;
  k: number;
  temperature: number;
  humidity: number;
  weatherForecast?: string;
  area: number;
  areaUnit: 'hectare' | 'acre';
  growthStage?: string;
  soilType?: string;
}

export interface FertilizerRecommendation {
  summary: string;
  deficits: {
    n: string;
    p: string;
    k: string;
  };
  fertilizerPlan: Array<{
    name: string;
    dosage: string;
  }>;
  alerts?: string[];
}
