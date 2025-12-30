#!/usr/bin/env python3
"""
Build script to automatically generate folder.json from GPX files in the workspace.
Scans all directories and creates a JSON file with paths and types.
"""

import os
import json
from pathlib import Path

def scan_gpx_files():
    """Scan directories for GPX files and build the folder.json structure."""
    
    # Base directory
    base_dir = Path(__file__).parent
    
    # Define the directories to scan and their type mapping
    type_mapping = {
        '0-route': '0-route',
        '1-road': '1-road',
        '2-connector': '2-connector',
        '3-gravel': '3-gravel',
        '4-recon': '4-recon',
        '5-caution': '5-caution',
        'routes': 'routes',
    }
    
    gpx_files = []
    
    # Scan each type directory
    for dir_name, type_value in type_mapping.items():
        dir_path = base_dir / dir_name
        
        if not dir_path.exists():
            print(f"Warning: Directory {dir_name} does not exist, skipping...")
            continue
        
        # Find all GPX files recursively in this directory
        for gpx_file in dir_path.rglob('*.gpx'):
            # Get relative path from base directory
            rel_path = gpx_file.relative_to(base_dir)
            
            # Use forward slashes for web compatibility
            path_str = str(rel_path).replace('\\', '/')
            
            gpx_files.append({
                'path': path_str,
                'type': type_value
            })
            print(f"Found: {path_str}")
    
    # Also check for any GPX files in the root directory
    for gpx_file in base_dir.glob('*.gpx'):
        path_str = gpx_file.name
        gpx_files.append({
            'path': path_str,
            'type': path_str  # Use filename as type for root files
        })
        print(f"Found: {path_str}")
    
    # Sort by path for consistency
    gpx_files.sort(key=lambda x: x['path'])
    
    return gpx_files

def main():
    """Main function to generate folder.json."""
    print("Scanning for GPX files...")
    
    gpx_files = scan_gpx_files()
    
    print(f"\nFound {len(gpx_files)} GPX files total")
    
    # Write to folder.json
    output_file = Path(__file__).parent / 'folder.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(gpx_files, f, ensure_ascii=False)
    
    print(f"\n✓ Generated {output_file}")
    print(f"  Total files: {len(gpx_files)}")
    
    # Count by type
    type_counts = {}
    for item in gpx_files:
        type_val = item['type']
        type_counts[type_val] = type_counts.get(type_val, 0) + 1
    
    print("\nBreakdown by type:")
    for type_name, count in sorted(type_counts.items()):
        print(f"  {type_name}: {count} files")

if __name__ == '__main__':
    main()
