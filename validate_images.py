import sys
from skimage.metrics import structural_similarity as compare_ssim
import cv2
import os

def validate_images(image1_path, image2_path):
    try:
        # Load the two images
        image1 = cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE)
        image2 = cv2.imread(image2_path, cv2.IMREAD_GRAYSCALE)

        if image1 is None or image2 is None:
            print("One or both image files could not be loaded.")
            return False

        # Resize images to the same dimensions for comparison
        image1 = cv2.resize(image1, (500, 500))
        image2 = cv2.resize(image2, (500, 500))

        # Compute Structural Similarity Index (SSIM)
        score, _ = compare_ssim(image1, image2, full=True)

        # Define a threshold: Allow some similarity but not too much
        if score > 0.9:  # Higher SSIM means images are too similar
            print(f"Images are too similar. SSIM score: {score}")
            return False

        print(f"Images validated successfully. SSIM score: {score}")
        return True

    except Exception as e:
        print(f"Error during validation: {e}")
        return False


if __name__ == "__main__":
    # Receive file paths as arguments
    if len(sys.argv) != 3:
        print("Usage: python validate_images.py <image1_path> <image2_path>")
        sys.exit(1)

    image1_path = sys.argv[1]
    image2_path = sys.argv[2]

    # Validate file existence
    if not os.path.exists(image1_path) or not os.path.exists(image2_path):
        print("One or both image files do not exist.")
        sys.exit(1)

    # Perform validation
    if validate_images(image1_path, image2_path):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Validation failed
