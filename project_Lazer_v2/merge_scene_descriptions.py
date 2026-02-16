#!/usr/bin/env python3
"""
Merge scene description chunks into lazer_v2_scenes_description.json.
Reads raw JSON chunks from stdin or a file and extracts scenes by scene_id.
"""
import json
import re
import sys

def extract_scenes_from_content(content):
    """Extract all scene objects from mixed JSON content."""
    scenes = {}
    decoder = json.JSONDecoder()
    i = 0
    while i < len(content):
        # Find next "scene_id"
        match = re.search(r'"scene_id"\s*:\s*"S(\d+)"', content[i:])
        if not match:
            break
        # Find the start of this object (nearest preceding '{')
        pos = i + match.start()
        obj_start = content.rfind('{', i, pos)
        if obj_start == -1:
            i = pos + 1
            continue
        # Find matching closing brace
        depth = 0
        obj_end = -1
        for j in range(obj_start, len(content)):
            if content[j] == '{':
                depth += 1
            elif content[j] == '}':
                depth -= 1
                if depth == 0:
                    obj_end = j + 1
                    break
        if obj_end == -1:
            i = pos + 1
            continue
        try:
            obj_str = content[obj_start:obj_end]
            obj = json.loads(obj_str)
            if 'scene_id' in obj:
                sid = obj['scene_id']
                scenes[sid] = obj
        except json.JSONDecodeError:
            pass
        i = obj_end
    return scenes

def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    else:
        content = sys.stdin.read()
    
    scenes_dict = extract_scenes_from_content(content)
    # Sort by scene number and build ordered list
    scene_list = []
    for i in range(1, 247):
        sid = f"S{i:03d}"
        if sid in scenes_dict:
            scene_list.append(scenes_dict[sid])
    
    output = {"scenes": scene_list}
    out_path = "/Users/astikanand/Desktop/LAZERMAN/lazer_v2/lazer_v2_scenes_description.json"
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Wrote {len(scene_list)} scenes to {out_path}")

if __name__ == "__main__":
    main()
