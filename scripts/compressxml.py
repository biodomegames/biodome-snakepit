#!/usr/bin/env python3
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

# ========================
# CONFIG: adjust as needed
# ========================

# Attributes to completely remove (by name)
ATTRIBUTES_TO_REMOVE = {
    "spritename",
    # "someOtherAttribute",
}

# Attribute name/value replacements (exact match)
# Example: {"in": {"someName": "otherName"}}
ATTRIBUTE_VALUE_REPLACEMENTS = {
    # "in": {"specificInstance": "keepAsIs"},
}

# Attribute value pattern replacements (regex). Use attribute name *after* renaming (e.g. "in").
# Each entry: attr_name -> [(pattern, replacement), ...]. Replacement can use \\1, \\2 for groups.
# Example: "instance2184" -> "i2184", "instance99" -> "i99"
ATTRIBUTE_VALUE_PATTERNS = {
    "in": [(r"^instance(.+)$", r"i\1")],
}

# Attribute name replacements: attr_name -> new_attr_name
# Example: {"num": "n"}
ATTRIBUTE_NAME_REPLACEMENTS = {
    "num": "n",
	"instancename": "in", 
	"name": "n",
	"posx": "x",
	"posy": "y",
	"angle": "r",
	"skewx": "zx",
	"skewy": "zy",
	"alpha": "a",
	"framespan": "fs",
	"scalex": "sx",
	"scaley": "sy",
	"type": "tp",
	"label": "l",
	"file": "f",
	"spritename": "sn",
}

# Attribute collation: target_attr -> [source_attr1, source_attr2, ...]
# Example: {"t": ["x", "y", "r", "sx", "sy"]}
ATTRIBUTES_TO_COLLATION = {
    "t": ["x", "y", "r", "zx", "zy", "sx", "sy"],
}

# Tag name replacements: <oldtag> -> <newtag>
TAG_REPLACEMENTS = {
	
	"stuff": "compressed",
    "frame": "f",
	"sprite": "s",
	"subsequence": "ss",
	"refpoint": "rp",
	"sequence": "sq",
	"frameReference": "fr",


	
}

# Max decimal places for numeric attribute values. None = no rounding.
# Set to a set of attribute names to round only those (e.g. {"t", "a", "z", "fs"}),
# or set to True to round all attributes that look like numbers.
MAX_DECIMAL_PLACES = 4
ATTRIBUTES_ROUND_NUMBERS = True  # True = all numeric attrs, or {"t", "a", "z", "fs"} for specific


def _round_value(val: str, ndigits: int) -> str:
    """Round numeric value(s) to ndigits decimal places. Handles comma-separated (e.g. collated t)."""
    if ndigits is None:
        return val
    parts = [p.strip() for p in val.split(",")]
    result = []
    for p in parts:
        try:
            n = float(p)
            result.append(f"{n:.{ndigits}f}".rstrip("0").rstrip("."))
        except ValueError:
            result.append(p)
    return ",".join(result)


def process_element(elem: ET.Element):
    """Apply all configured transformations to this element and its children."""

    # 1) Remove unwanted attributes
    for attr in list(elem.attrib.keys()):
        if attr in ATTRIBUTES_TO_REMOVE:
            del elem.attrib[attr]

    # 2) Rename attributes using ATTRIBUTE_NAME_REPLACEMENTS
    for old_name, new_name in ATTRIBUTE_NAME_REPLACEMENTS.items():
        if old_name in elem.attrib:
            # If new_name already exists, the old one is discarded
            if new_name not in elem.attrib:
                elem.attrib[new_name] = elem.attrib[old_name]
            del elem.attrib[old_name]

    # 3) Replace attribute values (exact)
    for attr, value_map in ATTRIBUTE_VALUE_REPLACEMENTS.items():
        if attr in elem.attrib:
            old_val = elem.attrib[attr]
            if old_val in value_map:
                elem.attrib[attr] = value_map[old_val]

    # 4) Replace attribute values (pattern). Runs after exact replacements.
    for attr, patterns in ATTRIBUTE_VALUE_PATTERNS.items():
        if attr in elem.attrib:
            val = elem.attrib[attr]
            for pattern, replacement in patterns:
                val = re.sub(pattern, replacement, val)
            elem.attrib[attr] = val

    # 5) Round numeric attribute values to MAX_DECIMAL_PLACES (before collation)
    if MAX_DECIMAL_PLACES is not None:
        for attr in list(elem.attrib.keys()):
            if ATTRIBUTES_ROUND_NUMBERS is True or (isinstance(ATTRIBUTES_ROUND_NUMBERS, set) and attr in ATTRIBUTES_ROUND_NUMBERS):
                elem.attrib[attr] = _round_value(elem.attrib[attr], MAX_DECIMAL_PLACES)

    # 6) Collate multiple attributes into one (e.g. x,y,r,sx,sy -> t="x,y,r,sx,sy")
    for target_attr, source_attrs in ATTRIBUTES_TO_COLLATION.items():
        # Only collate if all source attributes are present
        if all(name in elem.attrib for name in source_attrs):
            elem.attrib[target_attr] = ",".join(elem.attrib[name] for name in source_attrs)
            # Remove the original source attributes (except if target is one of them)
            for name in source_attrs:
                if name != target_attr and name in elem.attrib:
                    del elem.attrib[name]

    # 7) Rename tags
    if elem.tag in TAG_REPLACEMENTS:
        elem.tag = TAG_REPLACEMENTS[elem.tag]

    # 8) Recurse
    for child in list(elem):
        process_element(child)


def compress_xml(input_path: Path, output_path: Path):
    tree = ET.parse(input_path)
    root = tree.getroot()

    process_element(root)

    # Write out without extra whitespace/indentation for a “tighter” file
    # (ElementTree won't pretty-print unless asked, so default is reasonably compact)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)


def main():
    if len(sys.argv) != 3:
        print("Usage: python compress_xml.py <input.xml> <output.xml>")
        sys.exit(1)

    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2])

    compress_xml(input_file, output_file)
    print(f"Written compressed XML to: {output_file}")


if __name__ == "__main__":
    main()