from pathlib import Path
from zipfile import ZipFile
import shutil
import re

# ============================================================
# CONFIGURATION
# ============================================================

PROJECT_DIR = Path(__file__).resolve().parent
ZIP_PATH = next(
    PROJECT_DIR.glob("weaponsdata*.zip"),
    None
)

# Also check Downloads if ZIP is not in project directory
if ZIP_PATH is None:
    downloads = Path.home() / "Downloads"
    ZIP_PATH = next(
        downloads.glob("weaponsdata*.zip"),
        None
    )

if ZIP_PATH is None:
    raise FileNotFoundError(
        "Could not find weaponsdata*.zip in the project folder or Downloads."
    )

OUTPUT_DIR = PROJECT_DIR / "final_dataset"

# Original Roboflow classes:
# 0 = gun
# 1 = knife
# 2 = person
# 3 = pistol
# 4 = rifle

WEAPON_CLASSES = {0, 1, 3, 4}
PERSON_CLASS = 2

# ============================================================
# PREPARE OUTPUT
# ============================================================

if OUTPUT_DIR.exists():
    shutil.rmtree(OUTPUT_DIR)

for split in ["train", "valid", "test"]:
    (OUTPUT_DIR / split / "images").mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / split / "labels").mkdir(parents=True, exist_ok=True)

print("=" * 70)
print("WEAPON DETECTION DATASET PREPARATION")
print("=" * 70)
print(f"ZIP: {ZIP_PATH}")
print(f"OUTPUT: {OUTPUT_DIR}")
print()

# ============================================================
# STATISTICS
# ============================================================

stats = {
    split: {
        "images": 0,
        "labels": 0,
        "weapon_boxes": 0,
        "person_boxes_removed": 0,
        "empty_final_labels": 0,
        "multi_weapon_images": 0,
        "max_weapons": 0,
    }
    for split in ["train", "valid", "test"]
}

bad_labels = []
missing_labels = []

# ============================================================
# PROCESS ZIP
# ============================================================

with ZipFile(ZIP_PATH, "r") as z:

    entries = z.infolist()

    # Map image and label paths by split + basename
    image_entries = {}
    label_entries = {}

    for entry in entries:

        if entry.is_dir():
            continue

        path = entry.filename.replace("\\", "/")

        # Ignore metadata files
        if path.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp")):

            parts = path.split("/")

            if len(parts) >= 3 and parts[0] in {"train", "valid", "test"}:
                split = parts[0]
                filename = parts[-1]
                stem = Path(filename).stem

                image_entries[(split, stem)] = entry

        elif path.lower().endswith(".txt"):

            parts = path.split("/")

            if len(parts) >= 3 and parts[0] in {"train", "valid", "test"}:
                split = parts[0]
                filename = parts[-1]

                # Ignore README/metadata text files
                if filename.lower().startswith("readme"):
                    continue

                stem = Path(filename).stem
                label_entries[(split, stem)] = entry

    print(f"Images found in ZIP : {len(image_entries)}")
    print(f"Labels found in ZIP : {len(label_entries)}")
    print()

    # ========================================================
    # PROCESS EACH IMAGE
    # ========================================================

    for (split, stem), image_entry in sorted(image_entries.items()):

        stats[split]["images"] += 1

        image_filename = image_entry.filename.replace("\\", "/").split("/")[-1]

        output_image = OUTPUT_DIR / split / "images" / image_filename
        output_label = OUTPUT_DIR / split / "labels" / f"{stem}.txt"

        # Copy image
        with z.open(image_entry) as src, open(output_image, "wb") as dst:
            shutil.copyfileobj(src, dst)

        label_key = (split, stem)

        if label_key not in label_entries:

            missing_labels.append(
                f"{split}/{image_filename}"
            )

            # Treat missing annotation as empty
            output_label.write_text("", encoding="utf-8")
            stats[split]["empty_final_labels"] += 1
            continue

        label_entry = label_entries[label_key]

        with z.open(label_entry) as f:
            raw_text = f.read().decode("utf-8", errors="replace")

        final_lines = []
        person_removed = 0

        for line_number, line in enumerate(raw_text.splitlines(), start=1):

            line = line.strip()

            if not line:
                continue

            parts = re.split(r"\s+", line)

            if len(parts) != 5:
                bad_labels.append(
                    f"{split}/{stem}.txt line {line_number}: {line}"
                )
                continue

            try:
                class_id = int(parts[0])
                x = float(parts[1])
                y = float(parts[2])
                w = float(parts[3])
                h = float(parts[4])
            except ValueError:
                bad_labels.append(
                    f"{split}/{stem}.txt line {line_number}: {line}"
                )
                continue

            # Validate YOLO coordinates
            if not all(0.0 <= value <= 1.0 for value in [x, y, w, h]):
                bad_labels.append(
                    f"{split}/{stem}.txt line {line_number}: invalid coordinates"
                )
                continue

            # Weapon classes become class 0
            if class_id in WEAPON_CLASSES:

                final_lines.append(
                    f"0 {x:.6f} {y:.6f} {w:.6f} {h:.6f}"
                )

                stats[split]["weapon_boxes"] += 1

            # Person annotations are intentionally removed
            elif class_id == PERSON_CLASS:

                person_removed += 1
                stats[split]["person_boxes_removed"] += 1

            else:

                bad_labels.append(
                    f"{split}/{stem}.txt line {line_number}: "
                    f"unknown class {class_id}"
                )

        # Write converted annotation
        output_label.write_text(
            "\n".join(final_lines) +
            ("\n" if final_lines else ""),
            encoding="utf-8"
        )

        stats[split]["labels"] += 1

        weapon_count = len(final_lines)

        if weapon_count == 0:
            stats[split]["empty_final_labels"] += 1

        if weapon_count >= 2:
            stats[split]["multi_weapon_images"] += 1

        stats[split]["max_weapons"] = max(
            stats[split]["max_weapons"],
            weapon_count
        )

# ============================================================
# WRITE data.yaml
# ============================================================

yaml_content = """path: C:/Users/sanid/Documents/Weapon-Detection/final_dataset

train: train/images
val: valid/images
test: test/images

nc: 1
names:
  0: weapon
"""

(OUTPUT_DIR / "data.yaml").write_text(
    yaml_content,
    encoding="utf-8"
)

# ============================================================
# WRITE README
# ============================================================

readme = """# Final Weapon Detection Dataset

This dataset was derived from:

Roboflow project:
https://universe.roboflow.com/sanidhya-sisodia/weaponsdata-fio3g/dataset/1

Original classes:
0 = gun
1 = knife
2 = person
3 = pistol
4 = rifle

Final class:
0 = weapon

Conversion:
- gun -> weapon
- knife -> weapon
- pistol -> weapon
- rifle -> weapon
- person annotations removed

Multiple weapon bounding boxes are preserved.

Images containing people without weapons are retained as negative examples.

License:
CC BY 4.0

Original dataset attribution should be retained when distributing this derived dataset.
"""

(OUTPUT_DIR / "README.txt").write_text(
    readme,
    encoding="utf-8"
)

# ============================================================
# FINAL REPORT
# ============================================================

print()
print("=" * 70)
print("FINAL DATASET REPORT")
print("=" * 70)

for split in ["train", "valid", "test"]:

    s = stats[split]

    print()
    print(f"===== {split.upper()} =====")
    print(f"Images                    : {s['images']}")
    print(f"Labels                    : {s['labels']}")
    print(f"Weapon boxes              : {s['weapon_boxes']}")
    print(f"Person boxes removed      : {s['person_boxes_removed']}")
    print(f"Images with 2+ weapons    : {s['multi_weapon_images']}")
    print(f"Maximum weapons in image : {s['max_weapons']}")
    print(f"Empty final labels        : {s['empty_final_labels']}")

print()
print("=" * 70)
print("VALIDATION")
print("=" * 70)

print(f"Missing labels : {len(missing_labels)}")
print(f"Bad label data : {len(bad_labels)}")

if missing_labels:
    print()
    print("First missing labels:")
    for item in missing_labels[:20]:
        print("  ", item)

if bad_labels:
    print()
    print("First bad labels:")
    for item in bad_labels[:20]:
        print("  ", item)

print()
print(f"Final dataset: {OUTPUT_DIR}")
print("=" * 70)