#!/usr/bin/env python3
"""
Decimate OBJ File for 3D Scan Upload

Reduces vertex count of .obj files to fit within 10MB upload limit.
Requires: numpy

Usage:
    python decimate-obj.py input.obj output.obj --target-size 5000000

Options:
    --target-size    Target file size in bytes (default: 5MB = 5000000)
    --ratio          Decimation ratio 0-1 (alternative to target-size)
"""

import sys
import os
import argparse


def decimate_obj(input_path: str, output_path: str, ratio: float = None, target_size: int = None):
    """
    Decimate OBJ file by removing vertices.
    
    Args:
        input_path: Input .obj file path
        output_path: Output .obj file path
        ratio: Keep this fraction of vertices (0-1)
        target_size: Target file size in bytes (alternative to ratio)
    """
    print(f"Reading {input_path}...")
    
    # Read original file
    with open(input_path, 'r') as f:
        lines = f.readlines()
    
    # Parse vertices and faces
    vertices = []
    faces = []
    other_lines = []
    
    for line in lines:
        if line.startswith('v '):
            vertices.append(line)
        elif line.startswith('f '):
            faces.append(line)
        else:
            other_lines.append(line)
    
    original_count = len(vertices)
    original_size = os.path.getsize(input_path)
    
    print(f"Original: {original_count} vertices, {original_size / 1024:.1f} KB")
    
    # Calculate decimation ratio
    if target_size:
        # Estimate ratio based on target size
        ratio = min(1.0, target_size / original_size * 1.2)  # 20% margin
    elif ratio is None:
        ratio = 0.5  # Default: keep 50%
    
    # Sample vertices uniformly
    step = int(1 / ratio)
    if step < 1:
        step = 1
    
    sampled_vertices = vertices[::step]
    new_count = len(sampled_vertices)
    
    # Build vertex index mapping
    old_to_new = {}
    for i, old_idx in enumerate(range(0, original_count, step)):
        old_to_new[old_idx + 1] = i + 1  # OBJ indices are 1-based
    
    # Remap faces
    new_faces = []
    for face_line in faces:
        parts = face_line.strip().split()[1:]  # Skip 'f' prefix
        new_indices = []
        valid = True
        
        for part in parts:
            # Handle v/vt/vn format
            idx_parts = part.split('/')
            v_idx = int(idx_parts[0])
            
            if v_idx in old_to_new:
                new_v_idx = old_to_new[v_idx]
                # Reconstruct with new index
                idx_parts[0] = str(new_v_idx)
                new_indices.append('/'.join(idx_parts))
            else:
                valid = False
                break
        
        if valid and len(new_indices) >= 3:
            new_faces.append(f"f {' '.join(new_indices)}\n")
    
    # Write output
    print(f"Writing {output_path}...")
    with open(output_path, 'w') as f:
        # Write header/materials
        for line in other_lines:
            f.write(line)
        
        # Write sampled vertices
        for v in sampled_vertices:
            f.write(v)
        
        # Write remapped faces
        for face in new_faces:
            f.write(face)
    
    new_size = os.path.getsize(output_path)
    reduction = (1 - new_size / original_size) * 100
    
    print(f"\nDecimated: {new_count} vertices ({new_count/original_count*100:.1f}% retained)")
    print(f"New size: {new_size / 1024:.1f} KB ({reduction:.1f}% reduction)")
    print(f"Faces: {len(faces)} → {len(new_faces)}")
    
    if new_size > 10 * 1024 * 1024:
        print("\n⚠️  WARNING: Output still > 10MB. Increase decimation (lower ratio).")
    else:
        print("\n✅ File is ready for upload!")


def main():
    parser = argparse.ArgumentParser(description='Decimate OBJ file for upload')
    parser.add_argument('input', help='Input .obj file')
    parser.add_argument('output', help='Output .obj file')
    parser.add_argument('--ratio', type=float, help='Keep ratio of vertices (0-1)')
    parser.add_argument('--target-size', type=int, default=5000000,
                        help='Target size in bytes (default: 5MB)')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)
    
    if not args.input.lower().endswith('.obj'):
        print("Error: Input must be .obj file")
        sys.exit(1)
    
    decimate_obj(args.input, args.output, ratio=args.ratio, target_size=args.target_size)


if __name__ == '__main__':
    main()
