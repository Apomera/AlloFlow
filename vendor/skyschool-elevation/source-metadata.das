Attributes {
    crs {
        String grid_mapping_name "latitude_longitude";
        String long_name "CRS definition";
        Float64 longitude_of_prime_meridian 0.0;
        Float64 semi_major_axis 6378137.0;
        Float64 inverse_flattening 298.257223563;
        String spatial_ref "GEOGCS[\"WGS 84\",DATUM[\"WGS_1984\",SPHEROID[\"WGS 84\",6378137,298.257223563,AUTHORITY[\"EPSG\",\"7030\"]],AUTHORITY[\"EPSG\",\"6326\"]],PRIMEM[\"Greenwich\",0,AUTHORITY[\"EPSG\",\"8901\"]],UNIT[\"degree\",0.0174532925199433,AUTHORITY[\"EPSG\",\"9122\"]],AXIS[\"Latitude\",NORTH],AXIS[\"Longitude\",EAST],AUTHORITY[\"EPSG\",\"4326\"]]";
        String GeoTransform "-180 0.01666666666666667 0 90 0 -0.01666666666666667 ";
        DODS {
            Int32 strlen 0;
        }
    }
    lat {
        String standard_name "latitude";
        String long_name "latitude";
        String units "degrees_north";
        UInt32 _ChunkSizes 10800;
    }
    lon {
        String standard_name "longitude";
        String long_name "longitude";
        String units "degrees_east";
        UInt32 _ChunkSizes 21600;
    }
    z {
        String long_name "z";
        Float32 _FillValue -99999.0;
        String grid_mapping "crs";
        String units "meters";
        String positive "up";
        String standard_name "height";
        String vert_crs_name "EGM2008";
        String vert_crs_epsg "EPSG:3855";
        UInt32 _ChunkSizes 1350, 2700;
    }
    NC_GLOBAL {
        String GDAL_AREA_OR_POINT "Area";
        Int32 node_offset 1;
        String GDAL_TIFFTAG_COPYRIGHT "DOC/NOAA/NESDIS/NCEI > National Centers for Environmental Information, NESDIS, NOAA, U.S. Department of Commerce";
        Float64 GDAL_TIFFTAG_DATETIME 2.0220929123913E13;
        String GDAL_TIFFTAG_IMAGEDESCRIPTION "Topography-Bathymetry; EGM2008 height";
        String Conventions "CF-1.5";
        String GDAL "GDAL 3.3.2, released 2021/09/01";
        String NCO "netCDF Operators version 4.9.1 (Homepage = http://nco.sf.net, Code = http://github.com/nco/nco)";
    }
}
