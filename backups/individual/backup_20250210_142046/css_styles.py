import glob

# Folder path where the classification result text files are stored
folder_path = r'P:\Evac Data\city_level'
output_css_file_path = folder_path + '\\generated_styles.css'

# Define a function to map class index to color
def get_color(index):
    # Placeholder function - replace with your actual logic
    colors = ['#4DFF4D', '#FF4D4D', '#4D4DFF', '#FFD700', '#FFA500']
    return colors[index % len(colors)]

# Open the output CSS file for writing
with open(output_css_file_path, 'w') as output_css:
    # Pattern to match all text files with classification results
    text_files_pattern = folder_path + '\\*_classification_output.txt'

    # Write a generic CSS header
    output_css.write("/* Generated GeoServer CSS Styles */\n")

    # Iterate through each classification result text file
    for file_path in glob.glob(text_files_pattern):
        with open(file_path, 'r') as file:
            lines = file.readlines()
        
        # Extracting column name and classification type from the file name
        parts = file_path.split('\\')[-1].replace('_classification_output.txt', '').split('_')
        column_name, classification_type = parts[-3], parts[-2]

        # Write CSS comment header for each classification
        output_css.write(f"\n/* CSS for {column_name} using {classification_type} classification */\n")

        for i, line in enumerate(lines):
            if line.startswith("Bounds:"):
                bounds = line.strip().split('Bounds: ')[1].strip('[]').split(',')
                bounds = [float(b) for b in bounds]

                for j in range(len(bounds) - 1):
                    lower_bound, upper_bound = bounds[j], bounds[j + 1]
                    color = get_color(j)
                    
                    # Generate CSS rule for each class
                    css_rule = f"[{column_name} > {lower_bound}][{column_name} <= {upper_bound}] " + "{\n"
                    css_rule += f"  fill: {color};\n"
                    css_rule += "  fill-opacity: 0.7;\n}\n"

                    output_css.write(css_rule)

# Note to manually add stroke and label rules as needed, similar to the GeoServer CSS example
