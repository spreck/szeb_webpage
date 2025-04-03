"""
SLD Templates module for the SZEB WebGIS Platform.

This module contains functions for generating SLD template content
for different types of layers and styling purposes.
"""

def get_style_template_by_id(template_id, attribute=None):
    """Get a style template by its ID"""
    # SZEB-specific templates
    if template_id.startswith('szeb_'):
        category_map = {
            'szeb_climate_risk': 'ClimateExposureRiskCategory',
            'szeb_fire_risk': 'FireIntensityRiskCategory',
            'szeb_supply': 'CurrentSupplyCategory',
            'szeb_demand': 'LandownerDemandCategory',
            'szeb_priority': 'OperationalPriorityCategory'
        }
        category = category_map.get(template_id)
        if category:
            return get_szeb_category_template(category, attribute)
    
    # Basic templates
    template_map = {
        'simple_point': get_simple_point_template(),
        'simple_line': get_simple_line_template(),
        'simple_polygon': get_simple_polygon_template(),
        'simple_raster': get_simple_raster_template(),
        'categorized_point': get_categorized_point_template(attribute),
        'categorized_line': get_categorized_line_template(attribute),
        'categorized_polygon': get_categorized_polygon_template(attribute),
        'classified_raster': get_classified_raster_template(),
        'rat_categorical': get_rat_categorical_template(attribute)
    }
    
    return template_map.get(template_id)

def get_szeb_template_list():
    """Get a list of SZEB-specific style templates"""
    return [
        {'id': 'szeb_climate_risk', 'name': 'SZEB Climate Risk', 'description': 'Climate Exposure Risk Category style'},
        {'id': 'szeb_fire_risk', 'name': 'SZEB Fire Risk', 'description': 'Fire Intensity Risk Category style'},
        {'id': 'szeb_supply', 'name': 'SZEB Supply', 'description': 'Current Supply Category style'},
        {'id': 'szeb_demand', 'name': 'SZEB Demand', 'description': 'Landowner Demand Category style'},
        {'id': 'szeb_priority', 'name': 'SZEB Priority', 'description': 'Operational Priority Category style'}
    ]

def get_basic_template_list(layer_type, geometry_type=None):
    """Get a list of basic style templates based on layer and geometry type"""
    if layer_type.upper() == 'RASTER':
        return [
            {'id': 'simple_raster', 'name': 'Simple Raster', 'description': 'Basic raster symbolizer'},
            {'id': 'classified_raster', 'name': 'Classified Raster', 'description': 'Raster classified by values'},
            {'id': 'rat_categorical', 'name': 'RAT Categorical', 'description': 'Raster categorized by RAT attribute'}
        ]
    else:
        # Vector templates based on geometry type
        templates = {
            'POINT': [
                {'id': 'simple_point', 'name': 'Simple Point', 'description': 'Basic point symbolizer'},
                {'id': 'categorized_point', 'name': 'Categorized Point', 'description': 'Point categorized by attribute'}
            ],
            'LINE': [
                {'id': 'simple_line', 'name': 'Simple Line', 'description': 'Basic line symbolizer'},
                {'id': 'categorized_line', 'name': 'Categorized Line', 'description': 'Line categorized by attribute'}
            ],
            'POLYGON': [
                {'id': 'simple_polygon', 'name': 'Simple Polygon', 'description': 'Basic polygon symbolizer'},
                {'id': 'categorized_polygon', 'name': 'Categorized Polygon', 'description': 'Polygon categorized by attribute'}
            ]
        }
        
        if geometry_type and geometry_type.upper() in templates:
            return templates[geometry_type.upper()]
        
        # If geometry type not specified or not found, return all vector templates
        all_templates = []
        for geom_templates in templates.values():
            all_templates.extend(geom_templates)
        return all_templates

def get_szeb_category_template(category, attribute=None):
    """Get a template for SZEB category styling"""
    if not attribute:
        attribute = category
    
    # Color mapping based on SZEB categories
    from api.szeb_raster_routes import ATTRIBUTE_COLOR_SCHEMES
    
    color_map = ATTRIBUTE_COLOR_SCHEMES.get(category, {
        "Very Low": "#1A9641",
        "Low": "#A6D96A",
        "Moderate": "#FFFFBF",
        "High": "#FDAE61",
        "Very High": "#D7191C"
    })
    
    # Generate SLD
    sld = f'''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>SZEB {category}</n>
    <UserStyle>
      <Title>SZEB {category}</Title>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <ChannelSelection>
              <GrayChannel>
                <SourceChannelName>1</SourceChannelName>
              </GrayChannel>
            </ChannelSelection>
            <ColorMap type="values">
              <ColorMapEntry color="{color_map.get('Very Low')}" quantity="1" label="Very Low"/>
              <ColorMapEntry color="{color_map.get('Low')}" quantity="2" label="Low"/>
              <ColorMapEntry color="{color_map.get('Moderate')}" quantity="3" label="Moderate"/>
              <ColorMapEntry color="{color_map.get('High')}" quantity="4" label="High"/>
              <ColorMapEntry color="{color_map.get('Very High')}" quantity="5" label="Very High"/>
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
'''
    return sld

def get_simple_point_template():
    """Get a simple point style template"""
    return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>Simple Point</n>
    <UserStyle>
      <n>Simple Point</n>
      <FeatureTypeStyle>
        <Rule>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#3388ff</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''

def get_simple_line_template():
    """Get a simple line style template"""
    return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>Simple Line</n>
    <UserStyle>
      <n>Simple Line</n>
      <FeatureTypeStyle>
        <Rule>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#3388ff</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''

def get_simple_polygon_template():
    """Get a simple polygon style template"""
    return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>Simple Polygon</n>
    <UserStyle>
      <n>Simple Polygon</n>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#3388ff</CssParameter>
              <CssParameter name="fill-opacity">0.6</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">0.5</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''

def get_simple_raster_template():
    """Get a simple raster style template"""
    return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>Simple Raster</n>
    <UserStyle>
      <n>Simple Raster</n>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>1.0</Opacity>
            <ColorMap type="ramp">
              <ColorMapEntry color="#000000" quantity="0" opacity="0"/>
              <ColorMapEntry color="#0000FF" quantity="50" />
              <ColorMapEntry color="#00FF00" quantity="100" />
              <ColorMapEntry color="#FFFF00" quantity="150" />
              <ColorMapEntry color="#FF0000" quantity="200" />
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''

def get_categorized_point_template(attribute=None):
    """Get a categorized point style template"""
    if not attribute:
        attribute = "category"
    
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>Categorized Point</n>
    <UserStyle>
      <n>Categorized Point</n>
      <FeatureTypeStyle>
        <Rule>
          <Name>Category 1</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>1</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#1A9641</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 2</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>2</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#A6D96A</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 3</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>3</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#FDAE61</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 4</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>4</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic>
              <Mark>
                <WellKnownName>circle</WellKnownName>
                <Fill>
                  <CssParameter name="fill">#D7191C</CssParameter>
                </Fill>
                <Stroke>
                  <CssParameter name="stroke">#000000</CssParameter>
                  <CssParameter name="stroke-width">0.5</CssParameter>
                </Stroke>
              </Mark>
              <Size>8</Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''

def get_categorized_line_template(attribute=None):
    """Get a categorized line style template"""
    if not attribute:
        attribute = "category"
    
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>Categorized Line</n>
    <UserStyle>
      <n>Categorized Line</n>
      <FeatureTypeStyle>
        <Rule>
          <Name>Category 1</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>1</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#1A9641</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 2</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>2</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#A6D96A</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 3</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>3</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#FDAE61</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 4</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>4</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#D7191C</CssParameter>
              <CssParameter name="stroke-width">2</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''

def get_categorized_polygon_template(attribute=None):
    """Get a categorized polygon style template"""
    if not attribute:
        attribute = "category"
    
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>Categorized Polygon</n>
    <UserStyle>
      <n>Categorized Polygon</n>
      <FeatureTypeStyle>
        <Rule>
          <Name>Category 1</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>1</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#1A9641</CssParameter>
              <CssParameter name="fill-opacity">0.7</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">0.5</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 2</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>2</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#A6D96A</CssParameter>
              <CssParameter name="fill-opacity">0.7</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">0.5</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 3</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>3</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#FDAE61</CssParameter>
              <CssParameter name="fill-opacity">0.7</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">0.5</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
        <Rule>
          <Name>Category 4</Name>
          <ogc:Filter>
            <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>{attribute}</ogc:PropertyName>
              <ogc:Literal>4</ogc:Literal>
            </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#D7191C</CssParameter>
              <CssParameter name="fill-opacity">0.7</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">0.5</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''

def get_classified_raster_template():
    """Get a classified raster style template"""
    return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>Classified Raster</n>
    <UserStyle>
      <n>Classified Raster</n>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>1.0</Opacity>
            <ColorMap type="intervals">
              <ColorMapEntry color="#FFFFCC" quantity="50" label="0-50"/>
              <ColorMapEntry color="#A1DAB4" quantity="100" label="50-100"/>
              <ColorMapEntry color="#41B6C4" quantity="150" label="100-150"/>
              <ColorMapEntry color="#2C7FB8" quantity="200" label="150-200"/>
              <ColorMapEntry color="#253494" quantity="250" label="200-250"/>
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''

def get_rat_categorical_template(attribute=None):
    """Get a RAT categorical style template"""
    if not attribute:
        attribute = "value"
    
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" version="1.1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <n>RAT Categorical</n>
    <UserStyle>
      <n>RAT Categorical</n>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>1.0</Opacity>
            <ColorMap type="values">
              <ColorMapEntry color="#1A9641" quantity="1" label="Category 1"/>
              <ColorMapEntry color="#A6D96A" quantity="2" label="Category 2"/>
              <ColorMapEntry color="#FFFFBF" quantity="3" label="Category 3"/>
              <ColorMapEntry color="#FDAE61" quantity="4" label="Category 4"/>
              <ColorMapEntry color="#D7191C" quantity="5" label="Category 5"/>
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>'''
