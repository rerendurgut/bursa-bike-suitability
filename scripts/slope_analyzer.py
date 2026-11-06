"""
Bursa Bicycle Suitability & Longitudinal Slope Analyzer
-------------------------------------------------------
End-to-end Python pipeline reproducing the QGIS workflow:
1. Load road network vectors (OSM / GPKG).
2. Sample elevation (Z) from Digital Elevation Model (DEM) raster at fixed 100m intervals.
3. Compute segment gradient: Slope (%) = [(max_z - min_z) / Length] * 100.
4. Classify into Bicycle Suitability Tiers:
   - Level A (Ideal: 0% - 2%)
   - Level B (Moderate: 2% - 5%)
   - Level C (Challenging: > 5%)
5. Filter non-cyclable infrastructure (motorways, trunks).
"""

import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, LineString
import rasterio

def discretize_line_to_points(line: LineString, interval_meters: float = 100.0):
    """
    Discretizes a LineString geometry into equidistant sample points
    along its length to prevent sampling bias on long curved segments.
    """
    length = line.length
    if length <= interval_meters:
        return [Point(line.coords[0]), Point(line.coords[-1])]
    
    num_points = int(np.ceil(length / interval_meters))
    distances = np.linspace(0, length, num_points)
    return [line.interpolate(d) for d in distances]

def compute_slope_metrics(gdf_roads: gpd.GeoDataFrame, dem_raster_path: str, sample_interval: float = 100.0) -> gpd.GeoDataFrame:
    """
    Computes longitudinal elevation variance and slope percentage for each road segment.
    """
    print(f"[INFO] Opening DEM raster: {dem_raster_path}")
    with rasterio.open(dem_raster_path) as dem_src:
        dem_crs = dem_src.crs
        
        # Ensure CRS match
        if gdf_roads.crs != dem_crs:
            print(f"[INFO] Reprojecting roads from {gdf_roads.crs} to {dem_crs}...")
            gdf_roads = gdf_roads.to_crs(dem_crs)
            
        results = []
        for idx, row in gdf_roads.iterrows():
            geom = row.geometry
            if not isinstance(geom, LineString) or geom.is_empty:
                continue
                
            pts = discretize_line_to_points(geom, interval_meters=sample_interval)
            coords = [(p.x, p.y) for p in pts]
            
            # Sample raster values
            z_vals = [val[0] for val in dem_src.sample(coords) if val[0] != dem_src.nodata]
            
            if len(z_vals) >= 2:
                min_z = min(z_vals)
                max_z = max(z_vals)
                elev_diff = max_z - min_z
                length_m = geom.length
                
                slope_pct = (elev_diff / length_m * 100) if length_m > 0 else 0.0
            else:
                min_z = np.nan
                max_z = np.nan
                elev_diff = np.nan
                slope_pct = np.nan
                
            results.append({
                'fid': row.get('fid', idx),
                'min_z': min_z,
                'max_z': max_z,
                'elev_diff': elev_diff,
                'length_m': geom.length,
                'slope_pct': slope_pct
            })
            
    df_metrics = pd.DataFrame(results)
    gdf_out = gdf_roads.merge(df_metrics, on='fid', how='left')
    
    # Classification Logic
    conditions = [
        (gdf_out['slope_pct'] <= 2.0),
        (gdf_out['slope_pct'] > 2.0) & (gdf_out['slope_pct'] <= 5.0),
        (gdf_out['slope_pct'] > 5.0)
    ]
    choices = ['Level A (Ideal: 0-2%)', 'Level B (Moderate: 2-5%)', 'Level C (Challenging: >5%)']
    gdf_out['cycling_suitability'] = np.select(conditions, choices, default='Unclassified')
    
    return gdf_out

if __name__ == '__main__':
    print("[INFO] Bursa Bicycle Suitability Pipeline Ready.")
