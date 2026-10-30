from pathlib import Path
import cv2

DATASET = Path("final_dataset")
OUTPUT = Path("crowded_ground_truth")

for split in ["train", "valid", "test"]:

    image_dir = DATASET / split / "images"
    label_dir = DATASET / split / "labels"

    candidates = []

    for label_path in label_dir.glob("*.txt"):

        lines = [
            x.strip()
            for x in label_path.read_text(encoding="utf-8").splitlines()
            if x.strip()
        ]

        valid_lines = [
            line for line in lines
            if len(line.split()) == 5
        ]

        if len(valid_lines) >= 5:

            image_path = image_dir / f"{label_path.stem}.jpg"

            if image_path.exists():
                candidates.append((len(valid_lines), image_path, valid_lines))

    candidates.sort(key=lambda x: x[0], reverse=True)

    selected = candidates[:20]

    split_output = OUTPUT / split
    split_output.mkdir(parents=True, exist_ok=True)

    print()
    print("=" * 70)
    print(split.upper())
    print("=" * 70)

    for count, image_path, lines in selected:

        image = cv2.imread(str(image_path))

        if image is None:
            continue

        h, w = image.shape[:2]

        for line in lines:

            parts = line.split()

            cls, x, y, bw, bh = map(float, parts)

            x1 = int((x - bw / 2) * w)
            y1 = int((y - bh / 2) * h)
            x2 = int((x + bw / 2) * w)
            y2 = int((y + bh / 2) * h)

            x1 = max(0, min(w - 1, x1))
            y1 = max(0, min(h - 1, y1))
            x2 = max(0, min(w - 1, x2))
            y2 = max(0, min(h - 1, y2))

            cv2.rectangle(
                image,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

            cv2.putText(
                image,
                "weapon",
                (x1, max(20, y1 - 5)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

        output_path = split_output / image_path.name
        cv2.imwrite(str(output_path), image)

        print(f"{count:2d} weapons -> {output_path}")

print()
print("Crowded ground-truth visual check completed.")
