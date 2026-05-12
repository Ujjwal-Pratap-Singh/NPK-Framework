# Fertilizer Estimation Formulas

This document outlines the mathematical models used by Agri-NPK Pro to estimate nutrient deficits and basic fertilizer requirements.

## 1. Nutrient Deficit Calculation
The deficit is the difference between the target crop requirements and the current soil concentration.

$$Deficit_{X} = \max(0, Required_{X} - Current_{X})$$
Where $X$ is Nitrogen (N), Phosphorus (P), or Potassium (K).

## 2. Fertilizer Quantity Estimation
The estimation uses the nutrient composition of common fertilizers used in India.

### Nitrogen (N) via Urea
Urea contains approximately 46% Nitrogen.
$$Urea_{kg} = \left( \frac{Deficit_{N}}{0.46} \right) \times Area_{ha}$$

### Phosphorus (P) via DAP
Diammonium Phosphate (DAP) contains 46% Phosphorus and 18% Nitrogen.
$$DAP_{kg} = \left( \frac{Deficit_{P}}{0.46} \right) \times Area_{ha}$$
*Note: The N content in DAP is accounted for in complex calculations, but for basic estimation, DAP is the primary P source.*

### Potassium (K) via MOP
Muriate of Potash (MOP) contains 60% Potassium.
$$MOP_{kg} = \left( \frac{Deficit_{K}}{0.60} \right) \times Area_{ha}$$

## 3. Environmental Normalization
The AI model utilizes the following factors to adjust these base calculations:
- **Soil pH**: Affects nutrient availability (e.g., Phosphorus is locked in highly acidic/alkaline soils).
- **Average Temperature**: Affects microbial activity and evaporation rates.
- **Average Humidity**: Affects Nitrogen leaching and leaf absorption potential.
- **Weather Forecast**: Adjusts the 'Timing' recommendation to avoid application before heavy rainfall.
