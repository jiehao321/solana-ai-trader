#!/usr/bin/env python3
"""
Concatenate multiple videos into one.
Requires: FFmpeg installed
"""

import os
import sys
import tempfile
import subprocess

def create_concat_list(video_files, list_file):
    """Create FFmpeg concat demuxer list file."""
    with open(list_file, 'w') as f:
        for video in video_files:
            # Escape single quotes in path
            escaped = video.replace("'", "'\\''")
            f.write(f"file '{escaped}'\n")

def concat_videos(video_files, output_path, reencode=False):
    """
    Concatenate videos.
    
    Args:
        video_files: List of video file paths
        output_path: Output file path
        reencode: If True, re-encode for compatibility. If False, try direct concat.
    """
    if not video_files:
        print("No video files provided")
        return False
    
    # Create temp list file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        list_file = f.name
        for video in video_files:
            f.write(f"file '{video}'\n")
    
    try:
        if reencode:
            # Re-encode for maximum compatibility
            cmd = [
                'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                '-i', list_file, '-c:v', 'libx264', '-crf', '23',
                '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k',
                output_path
            ]
        else:
            # Direct stream copy (fast, but requires same codec)
            cmd = [
                'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                '-i', list_file, '-c', 'copy', output_path
            ]
        
        subprocess.run(cmd, check=True)
        print(f"✓ Concatenated {len(video_files)} videos into: {output_path}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"✗ Error: {e}")
        if not reencode:
            print("Try with --reencode flag for codec compatibility")
        return False
    finally:
        os.unlink(list_file)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Concatenate videos')
    parser.add_argument('videos', nargs='+', help='Video files to concatenate')
    parser.add_argument('-o', '--output', required=True, help='Output file')
    parser.add_argument('--reencode', action='store_true', help='Re-encode videos')
    
    args = parser.parse_args()
    concat_videos(args.videos, args.output, args.reencode)
