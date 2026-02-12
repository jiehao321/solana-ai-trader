#!/usr/bin/env python3
"""
Batch convert videos to different formats using FFmpeg.
Requires: pip install ffmpeg-python
"""

import os
import sys
import argparse
import ffmpeg

def convert_video(input_path, output_path, codec='libx264', quality=23):
    """Convert video to specified format."""
    try:
        stream = ffmpeg.input(input_path)
        stream = ffmpeg.output(
            stream, 
            output_path,
            vcodec=codec,
            crf=quality,
            preset='medium',
            acodec='aac',
            audio_bitrate='192k'
        )
        ffmpeg.run(stream, overwrite_output=True)
        print(f"✓ Converted: {input_path} -> {output_path}")
        return True
    except Exception as e:
        print(f"✗ Error converting {input_path}: {e}")
        return False

def batch_convert(input_dir, output_ext='mp4', codec='libx264'):
    """Batch convert all videos in directory."""
    video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv']
    
    for filename in os.listdir(input_dir):
        name, ext = os.path.splitext(filename)
        if ext.lower() in video_extensions:
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(input_dir, f"{name}_converted.{output_ext}")
            convert_video(input_path, output_path, codec)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Batch video converter')
    parser.add_argument('input', help='Input file or directory')
    parser.add_argument('-o', '--output', help='Output path')
    parser.add_argument('-e', '--ext', default='mp4', help='Output extension')
    parser.add_argument('-c', '--codec', default='libx264', help='Video codec')
    
    args = parser.parse_args()
    
    if os.path.isdir(args.input):
        batch_convert(args.input, args.ext, args.codec)
    else:
        output = args.output or f"{os.path.splitext(args.input)[0]}_converted.{args.ext}"
        convert_video(args.input, output, args.codec)
