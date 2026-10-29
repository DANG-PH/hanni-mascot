"""Extract clean RGBA cels from the retained generated source sheets."""
import cv2
import numpy as np
from PIL import Image


def remove_blue_chroma(image):
    array = np.asarray(image.convert("RGBA")).copy()
    colors = array[..., :3].astype(np.int16)
    dominance = colors[..., 2] - np.maximum(colors[..., 0], colors[..., 1])
    removal = np.clip((dominance - 18) / 62, 0, 1)
    array[..., 3] = np.uint8(array[..., 3] * (1 - removal))
    # De-spill only the fringe of the blue-screen source, never orange fur.
    edge = (array[..., 3] > 0) & (array[..., 3] < 245) & (dominance > 0)
    array[..., 2][edge] = np.minimum(array[..., 2][edge], np.maximum(array[..., 0][edge], array[..., 1][edge]))
    array[array[..., 3] < 3] = 0
    return Image.fromarray(array)


def clean_cell(image):
    array = np.asarray(image.convert("RGBA")).copy()
    count, labels, stats, _ = cv2.connectedComponentsWithStats(np.uint8(array[..., 3] > 40))
    if count <= 1:
        return image
    main = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    left, top, width, height, _ = stats[main]
    keep = labels == main
    mask = cv2.dilate(np.uint8(keep), np.ones((5, 5), np.uint8))
    array[..., 3] *= mask
    array[array[..., 3] == 0] = 0
    return Image.fromarray(array)
