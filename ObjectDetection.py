from ultralytics import YOLO
from collections import Counter

model = YOLO("yolo12n.pt")  # load an official model

def detect_objects(image):
    try:
        results = model(image)
        for result in results:
            names = [result.names[cls.item()] for cls in result.boxes.cls.int()]
        return names
    except Exception as e:
        print(f"Error detecting objects: {e}")
        return []

def get_detection_sentence(image):
    names = detect_objects(image)
    
    # Filter out "person" detections
    names = [name for name in names if name.lower() != "person"]
    
    if not names:
        return "There are no objects detected in front of the camera."
    
    # Count occurrences of each object type
    counts = Counter(names)
    
    # Sort by count (descending) for consistent ordering
    sorted_items = sorted(counts.items(), key=lambda x: (-x[1], x[0]))
    
    # Build the sentence
    parts = []
    for obj_name, count in sorted_items:
        if count == 1:
            parts.append(f"1 {obj_name}")
        else:
            # Simple pluralization: add 's' or 'es' based on common rules
            plural = obj_name
            if obj_name.endswith(('s', 'x', 'z', 'ch', 'sh')):
                plural = obj_name + "es"
            elif obj_name.endswith('y') and len(obj_name) > 1 and obj_name[-2] not in 'aeiou':
                plural = obj_name[:-1] + "ies"
            else:
                plural = obj_name + "s"
            parts.append(f"{count} {plural}")
    
    # Format the sentence
    if len(parts) == 1:
        if sorted_items[0][1] == 1:
            return f"There is {parts[0]} in front of the camera."
        else:
            return f"There are {parts[0]} in front of the camera."
    else:
        # Multiple object types
        if len(parts) == 2:
            sentence = f"There are {parts[0]} and {parts[1]} in front of the camera."
        else:
            # More than 2 types: "There are 2 Xs, 3 Ys, and 5 Zs in front of the camera."
            sentence = f"There are {', '.join(parts[:-1])}, and {parts[-1]} in front of the camera."
        return sentence

if __name__ == "__main__":
    image = "https://ultralytics.com/images/bus.jpg"
    print(get_detection_sentence(image))