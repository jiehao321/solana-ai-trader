#!/usr/bin/env python3
"""
Generate random video titles and metadata for batch uploads.
Useful for avoiding duplicate content detection.
"""

import random
import string

def generate_random_title(topic="Video", style="casual"):
    """Generate a random video title."""
    
    prefixes = {
        "casual": ["My", "Quick", "Simple", "Easy", "Fast", "Just", "Random"],
        "professional": ["Ultimate", "Complete", "Professional", "Advanced", "Essential"],
        "trendy": ["Insane", "Crazy", "Mind-blowing", "Secret", "Hidden", "Epic"]
    }
    
    connectors = ["Guide to", "Tips for", "Tutorial on", "Look at", "Thoughts on", "Journey with"]
    
    suffixes = ["2024", "2025", "Pro", "Guide", "Tutorial", "Tips", "Hacks", "Secrets"]
    
    # Random number component
    num = random.randint(1, 999)
    
    prefix = random.choice(prefixes.get(style, prefixes["casual"]))
    connector = random.choice(connectors)
    suffix = random.choice(suffixes)
    
    templates = [
        f"{prefix} {connector} {topic} {suffix} #{num}",
        f"{topic} {suffix} - {prefix} Edition #{num}",
        f"{prefix} {topic} {connector} {suffix} #{num}",
        f"#{num} {prefix} {topic} {suffix}",
        f"{topic} #{num} - {prefix} {suffix}"
    ]
    
    return random.choice(templates)

def generate_random_description(topic="video", length="medium"):
    """Generate a random video description."""
    
    intros = [
        "Hey everyone! In this video,",
        "Welcome back! Today",
        "What's up! I wanted to share",
        "Hello friends! Let's talk about",
        "Quick update:"
    ]
    
    middles = [
        f"we're exploring {topic} in detail.",
        f"I show you my approach to {topic}.",
        f"we dive deep into {topic}.",
        f"I share some tips about {topic}.",
        f"we discuss everything about {topic}."
    ]
    
    outros = [
        "Let me know what you think in the comments!",
        "Don't forget to like and subscribe!",
        "Thanks for watching!",
        "See you in the next one!",
        "Drop a comment if you have questions!"
    ]
    
    intro = random.choice(intros)
    middle = random.choice(middles)
    outro = random.choice(outros)
    
    # Add random hashtags
    hashtags = ["#viral", "#trending", "#shorts", "#tutorial", f"#{topic.lower().replace(' ', '')}"]
    random.shuffle(hashtags)
    tag_string = " ".join(hashtags[:random.randint(2, 4)])
    
    return f"{intro} {middle}\n\n{outro}\n\n{tag_string}"

def generate_batch_titles(topic, count=10, style="casual"):
    """Generate multiple unique titles."""
    titles = set()
    while len(titles) < count:
        titles.add(generate_random_title(topic, style))
    return list(titles)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate random video metadata')
    parser.add_argument('-t', '--topic', default='Video', help='Video topic')
    parser.add_argument('-n', '--count', type=int, default=5, help='Number of titles')
    parser.add_argument('-s', '--style', default='casual', choices=['casual', 'professional', 'trendy'])
    parser.add_argument('--desc', action='store_true', help='Also generate descriptions')
    
    args = parser.parse_args()
    
    print(f"\n🎬 Random Titles for '{args.topic}':\n")
    
    titles = generate_batch_titles(args.topic, args.count, args.style)
    for i, title in enumerate(titles, 1):
        print(f"{i}. {title}")
        if args.desc:
            desc = generate_random_description(args.topic)
            print(f"   Description: {desc[:80]}...\n")
