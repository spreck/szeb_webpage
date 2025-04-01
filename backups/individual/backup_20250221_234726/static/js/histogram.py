import os
import geopandas as gpd
import matplotlib.pyplot as plt

# Set the path to your GDB file
gdb_path = 'NRI_GDB_CensusTracts.gdb'

# List of attributes for which you want to generate histograms
attributes_to_plot = [
    'RISK_SCORE',
    'AVLN_RISKS',
    'CFLD_RISKS',
    'CWAV_RISKS',
    'DRGT_RISKS',
    'ERQK_RISKS',
    'HAIL_RISKS',
    'HWAV_RISKS',
    'HRCN_RISKS',
    'ISTM_RISKS',
    'LNDS_RISKS',
    'LTNG_RISKS',
    'RFLD_RISKS',
    'SWND_RISKS',
    'TRND_RISKS',
    'TSUN_RISKS',
    'VLCN_RISKS',
    'WFIR_RISKS',
    'WNTW_RISKS'
]

# Create an output directory to save the histograms
output_dir = 'histograms'
os.makedirs(output_dir, exist_ok=True)

# Open the GDB file using geopandas
gdb = gpd.read_file(gdb_path)

# Generate histograms for each attribute and save them
for attribute in attributes_to_plot:
    plt.figure(figsize=(8, 6))
    plt.hist(gdb[attribute].dropna(), bins=20, color='skyblue', edgecolor='black')
    plt.title(f'Histogram of {attribute}')
    plt.xlabel(attribute)
    plt.ylabel('Frequency')
    plt.grid(True)
    
    # Save the histogram as an image with the attribute name
    output_file = os.path.join(output_dir, f'{attribute}_histogram.png')
    plt.savefig(output_file)
    plt.close()

print('Histograms generated and saved in the "histograms" directory.')
