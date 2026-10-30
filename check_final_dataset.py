from pathlib import Path
import random
import cv2

DATASET = Path("final_dataset")
OUTPUT = Path("dataset_check")
OUTPUT.mkdir(exist_ok=True)

random.seed(42)

for split in ["train", "valid", "test"]:

    image_dir = DATASET / split / "images"
    label_dir = DATASET / split / "labels"

    images = list(image_dir.glob("*.jpg"))

    candidates = []

    for image_path in images:
        label_path = label_dir / f"{image_path.stem}.txt"

        if not label_path.exists():
            continue

        lines = [
            x.strip()
            for x in label_path.read_text(encoding="utf-8").splitlines()
            if x.strip()
        ]

        # Specifically select images with multiple weapons
        if len(lines) >= 2:
            candidates.append((image_path, lines))

    selected = random.sample(
        candidates,
        min(5, len(candidates))
    )

    split_output = OUTPUT / split
    split_output.mkdir(exist_ok=True)

    for image_path, lines in selected:

        image = cv2.imread(str(image_path))

        if image is None:
            continue

        h, w = image.shape[:2]

        for line in lines:

            parts = line.split()

            if len(parts) != 5:
                continue

            cls, x, y, bw, bh = map(float, parts)

            x1 = int((x - bw / 2) * w)
            y1 = int((y - bh / 2) * h)
            x2 = int((x + bw / 2) * w)
            y2 = int((y + bh / 2) * h)

            # Keep coordinates inside image
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

        print(output_path)

print()
print("Dataset visual check completed.")